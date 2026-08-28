"""
Analytics API endpoints for ExperimentIQ
"""
import json
import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.session import get_db
from app.models.experiment import Experiment, ExperimentVariant
from app.models.dataset import Dataset, DatasetColumn
from app.models.experiment_result import ExperimentResult
from app.models.segment_result import SegmentResult
from app.models.experiment_alert import ExperimentAlert
from app.models.activity import Activity
from app.schemas.result import (
    ExperimentResultResponse,
    SegmentResultResponse,
    CopilotQuery,
    CopilotResponse,
)
from app.analytics.statistics import (
    analyze_conversion,
    analyze_continuous,
    detect_srm,
    segment_analysis,
    health_check,
    calculate_business_impact,
    generate_insights,
    generate_copilot_answer,
)
from app.api.deps import get_optional_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/run/{experiment_id}")
async def run_analysis(
    experiment_id: int,
    metric_column: Optional[str] = Query(None),
    is_conversion: bool = Query(False),
    segment_columns: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Run full statistical analysis on an experiment's dataset."""
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Get the most recent dataset for this experiment
    dataset = (
        db.query(Dataset)
        .filter(Dataset.experiment_id == experiment_id)
        .order_by(Dataset.created_at.desc())
        .first()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="No dataset found for this experiment. Upload data first.")

    # Read CSV
    try:
        df = pd.read_csv(dataset.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read dataset: {str(e)}")

    # Find mapped columns from dataset columns
    columns = db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).all()
    mapping = {c.name: c.mapped_to for c in columns if c.mapped_to}

    variant_col = None
    metric_col = metric_column
    segment_cols = []

    # Auto-detect columns from mapping
    for col_name, mapped in mapping.items():
        if mapped == "variant" and col_name in df.columns:
            variant_col = col_name
        elif mapped == "metric" and not metric_col:
            metric_col = col_name
        elif mapped == "conversion" and not metric_col:
            metric_col = col_name
            is_conversion = True
        elif mapped == "segment" and col_name in df.columns:
            segment_cols.append(col_name)

    # Fallback column detection
    if not variant_col:
        for col in df.columns:
            if col.lower() in ("variant", "group", "arm", "treatment", "assignment"):
                variant_col = col
                break

    if not metric_col and metric_column:
        if metric_column in df.columns:
            metric_col = metric_column
    if not metric_col:
        for col in df.columns:
            if col.lower() in ("conversion", "converted", "did_convert"):
                metric_col = col
                is_conversion = True
                break
            elif col.lower() in ("revenue", "amount", "metric", "value", "score"):
                metric_col = col
                break

    if segment_columns:
        for sc in segment_columns.split(","):
            sc = sc.strip()
            if sc in df.columns:
                segment_cols.append(sc)

    if not variant_col:
        raise HTTPException(status_code=400, detail="Could not identify variant/group column. Map your columns in Data Lab.")
    if not metric_col:
        raise HTTPException(status_code=400, detail="Could not identify metric column. Map your columns in Data Lab.")

    # Determine control/treatment labels
    unique_variants = df[variant_col].dropna().unique()
    control_label = "Control"
    treatment_label = "Treatment"

    for v in unique_variants:
        v_str = str(v).lower()
        if v_str in ("control", "a", "baseline"):
            control_label = v
        elif v_str in ("treatment", "b", "variant"):
            treatment_label = v

    if len(unique_variants) >= 2:
        control_label = unique_variants[0]
        treatment_label = unique_variants[1]
        for v in unique_variants:
            v_str = str(v).lower()
            if v_str in ("control", "a", "baseline"):
                control_label = v
            elif v_str in ("treatment", "b", "variant"):
                treatment_label = v

    control_data = df[df[variant_col] == control_label]
    treatment_data = df[df[variant_col] == treatment_label]

    # Analyze metric
    if is_conversion:
        ctrl_conv = int(control_data[metric_col].sum()) if metric_col in control_data.columns else 0
        treat_conv = int(treatment_data[metric_col].sum()) if metric_col in treatment_data.columns else 0
        result = analyze_conversion(ctrl_conv, len(control_data), treat_conv, len(treatment_data))
    else:
        try:
            ctrl_vals = pd.to_numeric(control_data[metric_col], errors="coerce").dropna().values
            treat_vals = pd.to_numeric(treatment_data[metric_col], errors="coerce").dropna().values
            result = analyze_continuous(ctrl_vals, treat_vals)
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to analyze metric. Ensure it contains numeric data.")

    # SRM detection
    expected_ctrl_ratio = experiment.control_allocation / 100 if experiment.control_allocation else 0.5
    srm = detect_srm(expected_ctrl_ratio, 1 - expected_ctrl_ratio, len(control_data), len(treatment_data))

    # Segment analysis
    all_segments = []
    for seg_col in segment_cols:
        seg_results = segment_analysis(df, seg_col, variant_col, metric_col, control_label, treatment_label, is_conversion)
        all_segments.extend(seg_results)

    # Health check
    health = health_check(df, variant_col, metric_col, control_label, treatment_label, expected_ctrl_ratio)

    # Business impact
    business = calculate_business_impact(
        result["control_mean"],
        result["treatment_mean"],
        result["control_sample_size"],
        result["treatment_sample_size"],
    )

    # Insights
    experiment_data = {
        "name": experiment.name,
        "type": experiment.experiment_type,
        "status": experiment.status,
    }
    insights = generate_insights(result, srm, health, experiment_data)

    # Save results to DB
    # Remove old results for this experiment
    db.query(ExperimentResult).filter(ExperimentResult.experiment_id == experiment_id).delete()
    db.query(SegmentResult).filter(SegmentResult.experiment_id == experiment_id).delete()
    db.query(ExperimentAlert).filter(ExperimentAlert.experiment_id == experiment_id).delete()

    # Save main result
    db_result = ExperimentResult(
        experiment_id=experiment_id,
        metric_name=metric_col,
        control_mean=result["control_mean"],
        treatment_mean=result["treatment_mean"],
        absolute_difference=result["absolute_difference"],
        relative_uplift=result["relative_uplift"],
        control_sample_size=result["control_sample_size"],
        treatment_sample_size=result["treatment_sample_size"],
        p_value=result.get("p_value"),
        confidence_level=result.get("confidence_level"),
        confidence_interval_lower=result.get("confidence_interval_lower"),
        confidence_interval_upper=result.get("confidence_interval_upper"),
        statistical_power=result.get("statistical_power"),
        mde=result.get("mde"),
        test_used=result.get("test_used"),
        test_explanation=result.get("test_explanation"),
        is_significant=1 if result.get("is_significant") else 0,
        control_median=result.get("control_median"),
        treatment_median=result.get("treatment_median"),
        control_variance=result.get("control_variance"),
        treatment_variance=result.get("treatment_variance"),
        control_std=result.get("control_std"),
        treatment_std=result.get("treatment_std"),
    )
    db.add(db_result)

    # Save segment results
    for seg in all_segments:
        db.add(SegmentResult(
            experiment_id=experiment_id,
            segment_name=seg["segment_name"],
            segment_value=seg["segment_value"],
            control_sample_size=seg["control_sample_size"],
            treatment_sample_size=seg["treatment_sample_size"],
            control_mean=seg["control_mean"],
            treatment_mean=seg["treatment_mean"],
            relative_uplift=seg["relative_uplift"],
            p_value=seg.get("p_value"),
            is_significant=1 if seg.get("is_significant") else 0,
            confidence_level=seg.get("confidence_level"),
        ))

    # Save alerts
    if srm["has_srm"]:
        db.add(ExperimentAlert(
            experiment_id=experiment_id,
            alert_type="critical" if srm["severity"] in ("critical", "high") else "warning",
            title="Sample Ratio Mismatch Detected",
            message=srm["recommendation"],
            category="srm",
        ))

    for check in health.get("checks", []):
        if check.get("status") in ("critical", "warning"):
            db.add(ExperimentAlert(
                experiment_id=experiment_id,
                alert_type=check["status"],
                title=check["name"],
                message=check["message"],
                category="health",
            ))

    db.add(Activity(
        action="analysis_completed",
        entity_type="experiment",
        entity_id=experiment_id,
        entity_name=experiment.name,
        user_id=current_user.id if current_user else None,
    ))

    db.commit()

    return {
        "experiment_id": experiment_id,
        "metric": metric_col,
        "control": {
            "mean": result["control_mean"],
            "sample_size": result["control_sample_size"],
            "std": result.get("control_std"),
            "median": result.get("control_median"),
            "variance": result.get("control_variance"),
        },
        "treatment": {
            "mean": result["treatment_mean"],
            "sample_size": result["treatment_sample_size"],
            "std": result.get("treatment_std"),
            "median": result.get("treatment_median"),
            "variance": result.get("treatment_variance"),
        },
        "uplift": {
            "absolute": result["absolute_difference"],
            "relative": result["relative_uplift"],
            "confidence_interval": {
                "lower": result.get("confidence_interval_lower"),
                "upper": result.get("confidence_interval_upper"),
            },
        },
        "statistical": {
            "p_value": result.get("p_value"),
            "confidence_level": result.get("confidence_level"),
            "is_significant": result.get("is_significant"),
            "statistical_power": result.get("statistical_power"),
            "mde": result.get("mde"),
            "test_used": result.get("test_used"),
            "test_explanation": result.get("test_explanation"),
        },
        "segments": all_segments,
        "srm": srm,
        "health": health,
        "business_impact": business,
        "insights": insights,
    }


@router.get("/results/{experiment_id}", response_model=List[ExperimentResultResponse])
async def get_results(experiment_id: int, db: Session = Depends(get_db)):
    results = db.query(ExperimentResult).filter(ExperimentResult.experiment_id == experiment_id).all()
    return [ExperimentResultResponse.model_validate(r) for r in results]


@router.get("/segments/{experiment_id}", response_model=List[SegmentResultResponse])
async def get_segments(experiment_id: int, db: Session = Depends(get_db)):
    segments = db.query(SegmentResult).filter(SegmentResult.experiment_id == experiment_id).all()
    return [SegmentResultResponse.model_validate(s) for s in segments]


@router.get("/health/{experiment_id}")
async def get_health(experiment_id: int, db: Session = Depends(get_db)):
    alerts = db.query(ExperimentAlert).filter(ExperimentAlert.experiment_id == experiment_id).all()
    dataset = (
        db.query(Dataset)
        .filter(Dataset.experiment_id == experiment_id)
        .order_by(Dataset.created_at.desc())
        .first()
    )
    if not dataset:
        return {"score": 0, "status": "No Data", "checks": [{"name": "Dataset", "status": "critical", "message": "No dataset uploaded for this experiment."}]}

    try:
        df = pd.read_csv(dataset.file_path)
        columns = db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).all()
        mapping = {c.name: c.mapped_to for c in columns if c.mapped_to}
        variant_col = next((k for k, v in mapping.items() if v == "variant"), None)
        metric_col = next((k for k, v in mapping.items() if v in ("metric", "conversion")), None)

        if not variant_col or not metric_col:
            return {"score": 0, "status": "Unconfigured", "checks": [{"name": "Column Mapping", "status": "critical", "message": "Map variant and metric columns in Data Lab."}]}

        health = health_check(df, variant_col, metric_col)
        return health
    except Exception:
        return {"score": 0, "status": "Error", "checks": [{"name": "Analysis", "status": "critical", "message": "Failed to run health checks."}]}


@router.get("/business/{experiment_id}")
async def get_business_impact(experiment_id: int, db: Session = Depends(get_db)):
    results = db.query(ExperimentResult).filter(ExperimentResult.experiment_id == experiment_id).first()
    if not results:
        raise HTTPException(status_code=404, detail="No analysis results found. Run analysis first.")

    business = calculate_business_impact(
        results.control_mean,
        results.treatment_mean,
        results.control_sample_size,
        results.treatment_sample_size,
    )
    return business


@router.post("/copilot", response_model=CopilotResponse)
async def copilot_query(data: CopilotQuery, db: Session = Depends(get_db)):
    """Answer questions about an experiment using its data."""
    experiment = db.query(Experiment).filter(Experiment.id == data.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    result_record = db.query(ExperimentResult).filter(ExperimentResult.experiment_id == data.experiment_id).first()
    result = {
        "relative_uplift": result_record.relative_uplift if result_record else 0,
        "absolute_difference": result_record.absolute_difference if result_record else 0,
        "p_value": result_record.p_value if result_record else 1.0,
        "is_significant": bool(result_record.is_significant) if result_record else False,
        "control_sample_size": result_record.control_sample_size if result_record else 0,
        "treatment_sample_size": result_record.treatment_sample_size if result_record else 0,
        "statistical_power": result_record.statistical_power if result_record else None,
        "test_used": result_record.test_used if result_record else None,
        "control_mean": result_record.control_mean if result_record else 0,
        "treatment_mean": result_record.treatment_mean if result_record else 0,
    }

    srm_record = db.query(ExperimentAlert).filter(
        ExperimentAlert.experiment_id == data.experiment_id,
        ExperimentAlert.category == "srm",
    ).first()
    if srm_record:
        # Reconstruct SRM data from the experiment's dataset
        dataset = (
            db.query(Dataset)
            .filter(Dataset.experiment_id == data.experiment_id)
            .order_by(Dataset.created_at.desc())
            .first()
        )
        if dataset:
            try:
                df_srm = pd.read_csv(dataset.file_path)
                columns = db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).all()
                mapping = {c.name: c.mapped_to for c in columns if c.mapped_to}
                variant_col = next((k for k, v in mapping.items() if v == "variant"), None)
                if variant_col:
                    exp_obj = db.query(Experiment).filter(Experiment.id == data.experiment_id).first()
                    expected_ctrl = (exp_obj.control_allocation / 100) if exp_obj and exp_obj.control_allocation else 0.5
                    ctrl_n = int((df_srm[variant_col].astype(str).str.lower().isin(["control", "a", "baseline"])).sum())
                    treat_n = int(len(df_srm) - ctrl_n)
                    srm_data = detect_srm(expected_ctrl, 1 - expected_ctrl, ctrl_n, treat_n)
                    srm = srm_data
                else:
                    srm = {"has_srm": True, "p_value": srm_record.id, "expected": {}, "observed": {}}
            except Exception:
                srm = {"has_srm": True, "p_value": 0, "expected": {}, "observed": {}}
        else:
            srm = {"has_srm": True, "p_value": 0, "expected": {}, "observed": {}}
    else:
        srm = {"has_srm": False, "p_value": 1.0, "expected": {}, "observed": {}}

    answer = generate_copilot_answer(data.query, result, srm, {"name": experiment.name})
    return CopilotResponse(answer=answer["answer"], data=answer.get("data"))


@router.get("/overview")
async def get_overview(db: Session = Depends(get_db)):
    """Get overview dashboard statistics from real data."""
    experiments = db.query(Experiment).all()

    active = [e for e in experiments if e.status in ("running", "paused")]
    completed = [e for e in experiments if e.status == "completed"]

    # Get significant results
    all_results = db.query(ExperimentResult).all()
    significant = [r for r in all_results if r.is_significant]

    # Average uplift from completed experiments
    completed_results = db.query(ExperimentResult).filter(
        ExperimentResult.experiment_id.in_([e.id for e in completed])
    ).all()
    avg_uplift = None
    if completed_results:
        uplights = [r.relative_uplift for r in completed_results if r.relative_uplift != 0]
        if uplights:
            avg_uplift = round(sum(uplights) / len(uplights), 2)

    # Status distribution
    status_counts = {}
    for e in experiments:
        status_counts[e.status] = status_counts.get(e.status, 0) + 1

    # Top performing experiments
    top_experiments = []
    for result in sorted(all_results, key=lambda r: abs(r.relative_uplift), reverse=True)[:5]:
        exp = db.query(Experiment).filter(Experiment.id == result.experiment_id).first()
        if exp:
            top_experiments.append({
                "id": exp.id,
                "name": exp.name,
                "metric": result.metric_name,
                "control_mean": result.control_mean,
                "treatment_mean": result.treatment_mean,
                "uplift": result.relative_uplift,
                "confidence": round((1 - result.p_value) * 100, 1) if result.p_value is not None else None,
                "status": exp.status,
            })

    # Recent activities
    from app.models.activity import Activity
    activities = db.query(Activity).order_by(Activity.created_at.desc()).limit(20).all()
    recent_activities = [
        {
            "id": a.id,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_name": a.entity_name,
            "details": a.details,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in activities
    ]

    return {
        "stats": {
            "active_experiments": len(active),
            "completed_experiments": len(completed),
            "average_uplift": avg_uplift,
            "significant_experiments": len(significant),
            "revenue_impact": None,
        },
        "status_distribution": status_counts,
        "top_experiments": top_experiments,
        "recent_activities": recent_activities,
        "total_experiments": len(experiments),
    }


@router.get("/monitor")
async def get_monitor(db: Session = Depends(get_db)):
    """Get monitoring center data."""
    experiments = db.query(Experiment).filter(Experiment.status == "running").all()
    alerts = db.query(ExperimentAlert).filter(ExperimentAlert.is_resolved == 0).order_by(ExperimentAlert.created_at.desc()).limit(50).all()

    monitor_items = []
    for exp in experiments:
        dataset = (
            db.query(Dataset)
            .filter(Dataset.experiment_id == exp.id)
            .order_by(Dataset.created_at.desc())
            .first()
        )

        freshness = "unknown"
        data_status = "no_data"
        if dataset:
            data_status = "active"
            freshness = "fresh" if dataset.created_at else "unknown"

        exp_alerts = db.query(ExperimentAlert).filter(
            ExperimentAlert.experiment_id == exp.id,
            ExperimentAlert.is_resolved == 0,
        ).all()

        monitor_items.append({
            "experiment_id": exp.id,
            "experiment_name": exp.name,
            "status": exp.status,
            "data_status": data_status,
            "freshness": freshness,
            "alert_count": len(exp_alerts),
            "alerts": [
                {"type": a.alert_type, "title": a.title, "category": a.category}
                for a in exp_alerts
            ],
        })

    return {
        "active_experiments": len(experiments),
        "alerts": [
            {
                "id": a.id,
                "experiment_id": a.experiment_id,
                "type": a.alert_type,
                "title": a.title,
                "message": a.message,
                "category": a.category,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
        "experiments": monitor_items,
    }
