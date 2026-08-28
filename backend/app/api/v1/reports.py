import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.report import Report
from app.models.experiment import Experiment
from app.models.experiment_result import ExperimentResult
from app.models.segment_result import SegmentResult
from app.models.experiment_alert import ExperimentAlert
from app.models.activity import Activity
from app.schemas.report import ReportCreate, ReportResponse
from app.services.report_service import generate_experiment_report, REPORTS_DIR
from app.api.deps import get_optional_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=list[ReportResponse])
async def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).limit(50).all()
    return [ReportResponse.model_validate(r) for r in reports]


@router.post("", response_model=ReportResponse, status_code=201)
async def create_report(
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    experiment = db.query(Experiment).filter(Experiment.id == data.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    report = Report(
        experiment_id=data.experiment_id,
        title=data.title,
        report_type=data.report_type,
        status="generating",
        user_id=current_user.id if current_user else None,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Gather data for report
    results = db.query(ExperimentResult).filter(ExperimentResult.experiment_id == data.experiment_id).all()
    segments = db.query(SegmentResult).filter(SegmentResult.experiment_id == data.experiment_id).all()
    alerts = db.query(ExperimentAlert).filter(ExperimentAlert.experiment_id == data.experiment_id).all()

    experiment_dict = {
        "name": experiment.name,
        "description": experiment.description,
        "hypothesis": experiment.hypothesis,
        "owner": experiment.owner,
        "experiment_type": experiment.experiment_type,
        "primary_metric": experiment.primary_metric,
        "status": experiment.status,
        "start_date": str(experiment.start_date) if experiment.start_date else None,
        "end_date": str(experiment.end_date) if experiment.end_date else None,
    }

    results_data = [
        {
            "metric_name": r.metric_name,
            "control_mean": r.control_mean,
            "treatment_mean": r.treatment_mean,
            "relative_uplift": r.relative_uplift,
            "control_sample_size": r.control_sample_size,
            "treatment_sample_size": r.treatment_sample_size,
            "is_significant": r.is_significant,
            "p_value": r.p_value,
            "confidence_level": r.confidence_level,
            "confidence_interval_lower": r.confidence_interval_lower,
            "confidence_interval_upper": r.confidence_interval_upper,
            "statistical_power": r.statistical_power,
            "mde": r.mde,
            "test_used": r.test_used,
            "test_explanation": r.test_explanation,
        }
        for r in results
    ]

    segments_data = [
        {
            "segment_name": s.segment_name,
            "segment_value": s.segment_value,
            "control_mean": s.control_mean,
            "treatment_mean": s.treatment_mean,
            "relative_uplift": s.relative_uplift,
            "control_sample_size": s.control_sample_size,
            "treatment_sample_size": s.treatment_sample_size,
            "is_significant": s.is_significant,
        }
        for s in segments
    ]

    srm_alerts = [a for a in alerts if a.category == "srm"]
    srm = {
        "has_srm": len(srm_alerts) > 0,
        "expected": {"control": 50, "treatment": 50},
        "observed": {"control": 50, "treatment": 50},
        "chi_square": 0,
        "p_value": 1.0,
    }

    health = {"score": 100, "status": "Healthy", "checks": []}

    insights = []
    for r in results:
        if r.is_significant:
            insights.append({
                "title": f"Significant result for {r.metric_name}",
                "description": f"Uplift: {r.relative_uplift:.2f}%, p-value: {r.p_value:.4f}",
                "recommendation": "Consider rolling out the treatment" if r.relative_uplift > 0 else "Investigate treatment issues",
            })

    # Generate PDF
    filename = f"report_{experiment.id}_{report.id}.pdf"
    output_path = os.path.join(REPORTS_DIR, filename)

    try:
        generate_experiment_report(
            experiment_dict,
            results_data,
            segments_data,
            srm,
            health,
            insights,
            output_path,
        )
        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
        report.status = "completed"
        report.file_path = output_path
        report.file_size_bytes = file_size
    except Exception as e:
        report.status = "failed"
        report.file_path = None

    db.add(Activity(
        action="report_generated",
        entity_type="report",
        entity_id=report.id,
        entity_name=report.title,
        user_id=current_user.id if current_user else None,
    ))
    db.commit()
    db.refresh(report)
    return ReportResponse.model_validate(report)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse.model_validate(report)


@router.get("/{report_id}/download")
async def download_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found. Try regenerating.")
    return FileResponse(
        report.file_path,
        filename=f"{report.title.replace(' ', '_')}.pdf",
        media_type="application/pdf",
    )


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.file_path and os.path.exists(report.file_path):
        os.remove(report.file_path)
    db.delete(report)
    db.commit()
