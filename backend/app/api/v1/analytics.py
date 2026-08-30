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
from app.models.user import User
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
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _to_python(val):
    """Convert numpy types to native Python types for DB/JSON serialization."""
    if val is None:
        return None
    if isinstance(val, np.generic):
        return val.item()
    return val


def _deep_native(obj):
    """Recursively convert all numpy types in nested dicts/lists."""
    if isinstance(obj, dict):
        return {k: _deep_native(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_deep_native(v) for v in obj]
    return _to_python(obj)


@router.post("/run/{experiment_id}")
async def run_analysis(
    experiment_id: int,
    metric_column: Optional[str] = Query(None),
    is_conversion: bool = Query(False),
    segment_columns: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run full statistical analysis on an experiment's dataset."""
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Get the most recent dataset for this experiment
    dataset = (
        db.query(Dataset)
        .filter(Dataset.experiment_id == experiment_id, Dataset.user_id == current_user.id)
        .order_by(Dataset.created_at.desc())
        .first()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="No dataset found for this experiment. Upload data first.")

    try:
        df = pd.read_csv(dataset.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read dataset: {str(e)}")

    columns = db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).all()
    mapping = {c.name: c.mapped_to for c in columns if c.mapped_to}

    variant_col = None
    metric_col = metric_column
    segment_cols = []

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

    if not variant_col:
        # --- Phase 1: exact keyword match on column name (case/space/underscore insensitive) ---
        variant_keywords = {
            "variant", "group", "arm", "treatment", "assignment",
            "tvc", "tv_c", "test_control", "test_v_control",
            "a_b", "ab_test", "experiment_group", "condition",
            "treatment_group", "test_variant", "variant_name",
            "group_name", "bucket", "split", "cohort",
            "experiment_group_id", "traffic_allocation",
        }
        for col in df.columns:
            col_l = col.lower().replace(" ", "_").replace("-", "_")
            if col_l in variant_keywords:
                variant_col = col
                break

        # --- Phase 2: fuzzy heuristic on column values ---
        if not variant_col:
            variant_signals = {
                "control", "treatment", "a", "b", "c", "t",
                "true", "false", "yes", "no", "0", "1",
                "control group", "treatment group", "variant a", "variant b",
            }
            for col in df.columns:
                nuniq = df[col].nunique()
                if 2 <= nuniq <= 5:
                    vals = {str(v).lower().strip() for v in df[col].dropna().unique()}
                    if vals & variant_signals:
                        variant_col = col
                        break

    if not metric_col and metric_column:
        if metric_column in df.columns:
            metric_col = metric_column
    if not metric_col:
        # --- Phase 1: exact keyword match on column name ---
        conversion_keywords = {
            "conversion", "converted", "did_convert", "converted_flag",
            "is_converted", "purchase", "bought", "subscribe",
            "subscribed", "signed_up", "signup", "sign_up",
            "clicked", "click", "converted_flag",
        }
        metric_keywords = {
            "revenue", "amount", "metric", "value", "score",
            "order_value", "sales", "ltv", "lifetime_value",
            "arpu", "avg_revenue", "average_revenue",
        }
        for col in df.columns:
            col_l = col.lower().replace(" ", "_").replace("-", "_")
            if col_l in conversion_keywords:
                metric_col = col
                is_conversion = True
                break
            elif col_l in metric_keywords:
                metric_col = col
                break

        # --- Phase 2: detect binary columns (0/1 or True/False) as conversion ---
        if not metric_col:
            for col in df.columns:
                if col in (variant_col,):
                    continue
                nuniq = df[col].nunique()
                if nuniq <= 2:
                    vals = {str(v).lower().strip() for v in df[col].dropna().unique()}
                    if vals <= {"0", "1", "true", "false", "yes", "no", "1.0", "0.0"}:
                        metric_col = col
                        is_conversion = True
                        break

        # --- Phase 3: pick a numeric column that looks like a metric ---
        if not metric_col:
            numeric_cols = [c for c in df.columns if c != variant_col and pd.api.types.is_numeric_dtype(df[c])]
            if numeric_cols:
                metric_col = numeric_cols[0]

    if segment_columns:
        for sc in segment_columns.split(","):
            sc = sc.strip()
            if sc in df.columns:
                segment_cols.append(sc)

    if not variant_col:
        col_list = ", ".join(df.columns[:20])
        raise HTTPException(
            status_code=400,
            detail=f"Could not identify the variant/group column. Your dataset columns are: [{col_list}]. "
                   f"Open Data Lab and map a column (e.g. one containing 'control'/'treatment' values) to 'variant'.",
        )
    if not metric_col:
        col_list = ", ".join(df.columns[:20])
        raise HTTPException(
            status_code=400,
            detail=f"Could not identify the metric column. Your dataset columns are: [{col_list}]. "
                   f"Open Data Lab and map a column to 'metric' or 'conversion'.",
        )

    unique_variants = df[variant_col].dropna().unique()
    control_label = "Control"
    treatment_label = "Treatment"

    if len(unique_variants) >= 2:
        control_label = unique_variants[0]
        treatment_label = unique_variants[1]
        for v in unique_variants:
            v_str = str(v).lower().strip()
            if v_str in ("control", "a", "baseline", "c", "false", "0", "no"):
                control_label = v
            elif v_str in ("treatment", "b", "variant", "t", "true", "1", "yes"):
                treatment_label = v

    control_data = df[df[variant_col] == control_label]
    treatment_data = df[df[variant_col] == treatment_label]

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

    expected_ctrl_ratio = experiment.control_allocation / 100 if experiment.control_allocation else 0.5
    srm = detect_srm(expected_ctrl_ratio, 1 - expected_ctrl_ratio, len(control_data), len(treatment_data))

    all_segments = []
    for seg_col in segment_cols:
        seg_results = segment_analysis(df, seg_col, variant_col, metric_col, control_label, treatment_label, is_conversion)
        all_segments.extend(seg_results)

    health = health_check(df, variant_col, metric_col, control_label, treatment_label, expected_ctrl_ratio)

    business = calculate_business_impact(
        result["control_mean"],
        result["treatment_mean"],
        result["control_sample_size"],
        result["treatment_sample_size"],
    )

    experiment_data = {
        "name": experiment.name,
        "type": experiment.experiment_type,
        "status": experiment.status,
    }
    insights = generate_insights(result, srm, health, experiment_data)

    # Remove old results
    db.query(ExperimentResult).filter(ExperimentResult.experiment_id == experiment_id).delete()
    db.query(SegmentResult).filter(SegmentResult.experiment_id == experiment_id).delete()
    db.query(ExperimentAlert).filter(ExperimentAlert.experiment_id == experiment_id).delete()

    db_result = ExperimentResult(
        experiment_id=experiment_id,
        metric_name=metric_col,
        control_mean=_to_python(result["control_mean"]),
        treatment_mean=_to_python(result["treatment_mean"]),
        absolute_difference=_to_python(result["absolute_difference"]),
        relative_uplift=_to_python(result["relative_uplift"]),
        control_sample_size=result["control_sample_size"],
        treatment_sample_size=result["treatment_sample_size"],
        p_value=_to_python(result.get("p_value")),
        confidence_level=_to_python(result.get("confidence_level")),
        confidence_interval_lower=_to_python(result.get("confidence_interval_lower")),
        confidence_interval_upper=_to_python(result.get("confidence_interval_upper")),
        statistical_power=_to_python(result.get("statistical_power")),
        mde=_to_python(result.get("mde")),
        test_used=result.get("test_used"),
        test_explanation=result.get("test_explanation"),
        is_significant=1 if result.get("is_significant") else 0,
        control_median=_to_python(result.get("control_median")),
        treatment_median=_to_python(result.get("treatment_median")),
        control_variance=_to_python(result.get("control_variance")),
        treatment_variance=_to_python(result.get("treatment_variance")),
        control_std=_to_python(result.get("control_std")),
        treatment_std=_to_python(result.get("treatment_std")),
    )
    db.add(db_result)

    for seg in all_segments:
        db.add(SegmentResult(
            experiment_id=experiment_id,
            segment_name=seg["segment_name"],
            segment_value=seg["segment_value"],
            control_sample_size=seg["control_sample_size"],
            treatment_sample_size=seg["treatment_sample_size"],
            control_mean=_to_python(seg["control_mean"]),
            treatment_mean=_to_python(seg["treatment_mean"]),
            relative_uplift=_to_python(seg["relative_uplift"]),
            p_value=_to_python(seg.get("p_value")),
            is_significant=1 if seg.get("is_significant") else 0,
            confidence_level=_to_python(seg.get("confidence_level")),
        ))

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
        user_id=current_user.id,
    ))

    db.commit()

    return {
        "experiment_id": experiment_id,
        "metric": metric_col,
        "control": {
            "mean": _to_python(result["control_mean"]),
            "sample_size": result["control_sample_size"],
            "std": _to_python(result.get("control_std")),
            "median": _to_python(result.get("control_median")),
            "variance": _to_python(result.get("control_variance")),
        },
        "treatment": {
            "mean": _to_python(result["treatment_mean"]),
            "sample_size": result["treatment_sample_size"],
            "std": _to_python(result.get("treatment_std")),
            "median": _to_python(result.get("treatment_median")),
            "variance": _to_python(result.get("treatment_variance")),
        },
        "uplift": {
            "absolute": _to_python(result["absolute_difference"]),
            "relative": _to_python(result["relative_uplift"]),
            "confidence_interval": {
                "lower": _to_python(result.get("confidence_interval_lower")),
                "upper": _to_python(result.get("confidence_interval_upper")),
            },
        },
        "statistical": {
            "p_value": _to_python(result.get("p_value")),
            "confidence_level": _to_python(result.get("confidence_level")),
            "is_significant": _to_python(result.get("is_significant")),
            "statistical_power": _to_python(result.get("statistical_power")),
            "mde": _to_python(result.get("mde")),
            "test_used": result.get("test_used"),
            "test_explanation": result.get("test_explanation"),
        },
        "segments": _deep_native(all_segments),
        "srm": _deep_native(srm),
        "health": _deep_native(health),
        "business_impact": _deep_native(business),
        "insights": _deep_native(insights),
    }


@router.get("/results/{experiment_id}", response_model=List[ExperimentResultResponse])
async def get_results(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    results = db.query(ExperimentResult).filter(ExperimentResult.experiment_id == experiment_id).all()
    return [ExperimentResultResponse.model_validate(r) for r in results]


@router.get("/segments/{experiment_id}", response_model=List[SegmentResultResponse])
async def get_segments(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    segments = db.query(SegmentResult).filter(SegmentResult.experiment_id == experiment_id).all()
    return [SegmentResultResponse.model_validate(s) for s in segments]


@router.get("/health/{experiment_id}")
async def get_health(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

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
async def get_business_impact(
    experiment_id: int,
    monthly_revenue_per_user: Optional[float] = Query(None),
    daily_users: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    results = db.query(ExperimentResult).filter(ExperimentResult.experiment_id == experiment_id).first()
    if not results:
        raise HTTPException(status_code=404, detail="No analysis results found. Run analysis first.")

    business = calculate_business_impact(
        results.control_mean,
        results.treatment_mean,
        results.control_sample_size,
        results.treatment_sample_size,
        monthly_revenue_per_user=monthly_revenue_per_user,
        daily_users=daily_users,
    )
    return business


@router.post("/copilot", response_model=CopilotResponse)
async def copilot_query(
    data: CopilotQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Answer questions about an experiment using its data."""
    experiment = db.query(Experiment).filter(
        Experiment.id == data.experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
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
                    srm = detect_srm(expected_ctrl, 1 - expected_ctrl, ctrl_n, treat_n)
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
async def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get overview dashboard statistics from real data — scoped to current user."""
    experiments = db.query(Experiment).filter(Experiment.user_id == current_user.id).all()

    active = [e for e in experiments if e.status in ("running", "paused")]
    completed = [e for e in experiments if e.status == "completed"]

    all_results = db.query(ExperimentResult).filter(
        ExperimentResult.experiment_id.in_([e.id for e in experiments])
    ).all() if experiments else []
    significant = [r for r in all_results if r.is_significant]

    completed_results = [r for r in all_results if r.experiment_id in [e.id for e in completed]]
    avg_uplift = None
    if completed_results:
        uplights = [r.relative_uplift for r in completed_results if r.relative_uplift != 0]
        if uplights:
            avg_uplift = round(sum(uplights) / len(uplights), 2)

    status_counts = {}
    for e in experiments:
        status_counts[e.status] = status_counts.get(e.status, 0) + 1

    exp_map = {e.id: e for e in experiments}
    top_experiments = []
    for result in sorted(all_results, key=lambda r: abs(r.relative_uplift), reverse=True)[:5]:
        exp = exp_map.get(result.experiment_id)
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

    exp_ids = [e.id for e in experiments]
    activities = (
        db.query(Activity)
        .filter(Activity.user_id == current_user.id)
        .order_by(Activity.created_at.desc())
        .limit(20)
        .all()
    )
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


@router.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get insights based on persisted analysis results — scoped to current user."""
    experiments = db.query(Experiment).filter(Experiment.user_id == current_user.id).all()
    if not experiments:
        return {"insights": [], "summary": {"total": 0, "completed": 0, "running": 0, "significant": 0}}

    exp_ids = [e.id for e in experiments]
    all_results = db.query(ExperimentResult).filter(
        ExperimentResult.experiment_id.in_(exp_ids)
    ).all() if exp_ids else []

    all_alerts = db.query(ExperimentAlert).filter(
        ExperimentAlert.experiment_id.in_(exp_ids),
        ExperimentAlert.is_resolved == 0,
    ).all() if exp_ids else []

    exp_map = {e.id: e for e in experiments}
    results_map = {}
    for r in all_results:
        results_map.setdefault(r.experiment_id, []).append(r)

    insights = []

    # Summary stats
    completed = [e for e in experiments if e.status == "completed"]
    running = [e for e in experiments if e.status == "running"]
    significant_results = [r for r in all_results if r.is_significant]

    # Per-experiment insights from persisted results
    for exp in experiments:
        exp_results = results_map.get(exp.id, [])
        exp_alerts = [a for a in all_alerts if a.experiment_id == exp.id]

        if exp.status == "draft" and not exp_results:
            has_dataset = db.query(Dataset).filter(Dataset.experiment_id == exp.id).first() is not None
            if not has_dataset:
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "info",
                    "title": f"\"{exp.name}\" needs data",
                    "description": "This experiment has no dataset attached. Upload a CSV to begin analysis.",
                    "recommendation": "Open the experiment and click 'Upload Dataset'.",
                })
            else:
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "info",
                    "title": f"\"{exp.name}\" is ready to run",
                    "description": "Dataset is attached. Run analysis to generate results.",
                    "recommendation": "Open the experiment and click 'Run Analysis'.",
                })

        if exp.status == "running" and not exp_results:
            insights.append({
                "experiment_id": exp.id,
                "experiment_name": exp.name,
                "severity": "warning",
                "title": f"\"{exp.name}\" has no analysis results",
                "description": "This experiment is running but has not been analyzed yet.",
                "recommendation": "Run analysis to check for early results.",
            })

        if exp.status == "paused":
            insights.append({
                "experiment_id": exp.id,
                "experiment_name": exp.name,
                "severity": "warning",
                "title": f"\"{exp.name}\" is paused",
                "description": "This experiment is not collecting data.",
                "recommendation": "Resume the experiment or archive it if no longer relevant.",
            })

        for r in exp_results:
            if r.is_significant and r.relative_uplift > 0:
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "positive",
                    "title": f"Significant positive result: {r.metric_name}",
                    "description": f"Treatment outperforms control by {r.relative_uplift:.1f}% (p={r.p_value:.4f}) for metric '{r.metric_name}'. Sample sizes: control={r.control_sample_size:,}, treatment={r.treatment_sample_size:,}.",
                    "recommendation": "Consider rolling out the treatment to all users.",
                })
            elif r.is_significant and r.relative_uplift < 0:
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "critical",
                    "title": f"Significant negative result: {r.metric_name}",
                    "description": f"Treatment underperforms control by {abs(r.relative_uplift):.1f}% (p={r.p_value:.4f}) for metric '{r.metric_name}'.",
                    "recommendation": "Investigate treatment issues or roll back the change.",
                })
            elif r.is_significant and r.relative_uplift == 0:
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "info",
                    "title": f"No difference detected: {r.metric_name}",
                    "description": f"No statistically significant difference for '{r.metric_name}' (p={r.p_value:.4f}).",
                    "recommendation": "The treatment has no measurable impact. Consider a different approach.",
                })
            elif not r.is_significant:
                direction = "outperforms" if r.relative_uplift > 0 else "underperforms"
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "warning" if r.relative_uplift > 0 else "info",
                    "title": f"Not significant yet: {r.metric_name}",
                    "description": f"Observed uplift of {abs(r.relative_uplift):.1f}% is not statistically significant (p={r.p_value:.4f}). Treatment {direction} control but the result could be due to chance.",
                    "recommendation": "Continue running the experiment or increase sample size for more statistical power.",
                })

            if r.statistical_power and r.statistical_power < 0.5:
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "warning",
                    "title": f"Low statistical power: {r.metric_name}",
                    "description": f"Statistical power is {r.statistical_power * 100:.1f}% for '{r.metric_name}'. Results may not be reliable.",
                    "recommendation": "Increase sample size or wait for more data before drawing conclusions.",
                })

            if r.relative_uplift != 0 and abs(r.absolute_difference) < 0.001:
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "info",
                    "title": f"Tiny absolute effect: {r.metric_name}",
                    "description": f"Relative uplift is {r.relative_uplift:.1f}% but absolute difference is only {r.absolute_difference:.6f}.",
                    "recommendation": "Evaluate whether this effect size has practical business significance.",
                })

        # Alert-based insights
        for a in exp_alerts:
            if a.category == "srm":
                insights.append({
                    "experiment_id": exp.id,
                    "experiment_name": exp.name,
                    "severity": "critical",
                    "title": f"SRM detected in {exp.name}",
                    "description": a.message or "Sample ratio mismatch detected. The observed traffic split differs significantly from the expected split.",
                    "recommendation": "Investigate the SRM cause before trusting experiment results.",
                })

    return {
        "insights": insights,
        "summary": {
            "total": len(experiments),
            "completed": len(completed),
            "running": len(running),
            "significant": len(significant_results),
        },
    }


@router.get("/monitor")
async def get_monitor(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monitoring center data — scoped to current user."""
    experiments = db.query(Experiment).filter(
        Experiment.status == "running",
        Experiment.user_id == current_user.id,
    ).all()
    alerts = db.query(ExperimentAlert).filter(
        ExperimentAlert.is_resolved == 0,
        ExperimentAlert.experiment_id.in_([e.id for e in experiments]),
    ).order_by(ExperimentAlert.created_at.desc()).limit(50).all() if experiments else []

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
            if dataset.created_at:
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                created = dataset.created_at.replace(tzinfo=timezone.utc) if dataset.created_at.tzinfo is None else dataset.created_at
                age_days = (now - created).days
                if age_days <= 1:
                    freshness = "fresh"
                elif age_days <= 7:
                    freshness = "aging"
                else:
                    freshness = "stale"
            else:
                freshness = "unknown"

        exp_alerts = [a for a in alerts if a.experiment_id == exp.id]

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
