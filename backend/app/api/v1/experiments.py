import os
import json
import uuid
import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.models.experiment import Experiment, ExperimentVariant, ExperimentStatus
from app.models.dataset import Dataset, DatasetColumn
from app.models.activity import Activity
from app.models.user import User
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentUpdate,
    ExperimentResponse,
    ExperimentListResponse,
    VariantResponse,
)
from app.schemas.dataset import DatasetResponse
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/experiments", tags=["Experiments"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=ExperimentListResponse)
async def list_experiments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    experiment_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Experiment).filter(Experiment.user_id == current_user.id)

    if status_filter:
        query = query.filter(Experiment.status == status_filter)
    if experiment_type:
        query = query.filter(Experiment.experiment_type == experiment_type)
    if search:
        query = query.filter(Experiment.name.ilike(f"%{search}%"))

    total = query.count()
    experiments = (
        query.order_by(Experiment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return ExperimentListResponse(
        experiments=[ExperimentResponse.model_validate(e) for e in experiments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(
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
    return ExperimentResponse.model_validate(experiment)


@router.post("", response_model=ExperimentResponse, status_code=201)
async def create_experiment(
    data: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = Experiment(
        name=data.name,
        description=data.description,
        hypothesis=data.hypothesis,
        owner=data.owner or current_user.full_name or current_user.username,
        experiment_type=data.experiment_type,
        primary_metric=data.primary_metric,
        secondary_metrics=data.secondary_metrics,
        start_date=data.start_date,
        end_date=data.end_date,
        control_allocation=data.control_allocation,
        treatment_allocation=data.treatment_allocation,
        target_audience=data.target_audience,
        expected_uplift=data.expected_uplift,
        user_id=current_user.id,
    )
    db.add(experiment)
    db.flush()

    # Create default variants
    if data.variants:
        for v in data.variants:
            variant = ExperimentVariant(
                experiment_id=experiment.id,
                name=v.name,
                description=v.description,
                allocation=v.allocation,
                is_control=1 if v.is_control else 0,
            )
            db.add(variant)
    else:
        db.add(ExperimentVariant(
            experiment_id=experiment.id,
            name="Control",
            description="Original experience",
            allocation=data.control_allocation,
            is_control=1,
        ))
        db.add(ExperimentVariant(
            experiment_id=experiment.id,
            name="Treatment",
            description="New experience",
            allocation=data.treatment_allocation,
            is_control=0,
        ))

    db.add(Activity(
        action="experiment_created",
        entity_type="experiment",
        entity_id=experiment.id,
        entity_name=experiment.name,
        user_id=current_user.id,
    ))

    db.commit()
    db.refresh(experiment)
    return ExperimentResponse.model_validate(experiment)


@router.put("/{experiment_id}", response_model=ExperimentResponse)
async def update_experiment(
    experiment_id: int,
    data: ExperimentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(experiment, key, value)

    db.add(Activity(
        action="experiment_updated",
        entity_type="experiment",
        entity_id=experiment.id,
        entity_name=experiment.name,
        user_id=current_user.id,
    ))
    db.commit()
    db.refresh(experiment)
    return ExperimentResponse.model_validate(experiment)


@router.post("/{experiment_id}/complete", response_model=ExperimentResponse)
async def mark_experiment_completed(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an experiment as completed."""
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    experiment.status = ExperimentStatus.COMPLETED.value
    db.add(Activity(
        action="experiment_completed",
        entity_type="experiment",
        entity_id=experiment.id,
        entity_name=experiment.name,
        user_id=current_user.id,
    ))
    db.commit()
    db.refresh(experiment)
    return ExperimentResponse.model_validate(experiment)


@router.delete("/{experiment_id}", status_code=204)
async def delete_experiment(
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
    db.delete(experiment)
    db.commit()


@router.get("/{experiment_id}/variants", response_model=list[VariantResponse])
async def get_variants(
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
    variants = db.query(ExperimentVariant).filter(
        ExperimentVariant.experiment_id == experiment_id
    ).all()
    return [VariantResponse.model_validate(v) for v in variants]


# ─── Dataset attachment endpoints ──────────────────────────────────────────────


@router.get("/{experiment_id}/dataset", response_model=DatasetResponse)
async def get_experiment_dataset(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the dataset currently attached to an experiment."""
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    dataset = (
        db.query(Dataset)
        .filter(Dataset.experiment_id == experiment_id)
        .order_by(Dataset.created_at.desc())
        .first()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="No dataset attached to this experiment")

    return DatasetResponse.model_validate(dataset)


@router.post("/{experiment_id}/upload-dataset", response_model=DatasetResponse, status_code=201)
async def upload_dataset_to_experiment(
    experiment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a CSV and attach it directly to an experiment."""
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx) files are supported")

    content = await file.read()
    file_size = len(content)
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    # Save file
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    # Parse file
    try:
        if ext == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
    except Exception:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Failed to parse file. Please check the file format.")

    # Create dataset record attached to experiment
    dataset = Dataset(
        experiment_id=experiment_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size_bytes=file_size,
        row_count=len(df),
        column_count=len(df.columns),
        user_id=current_user.id,
        status="uploaded",
    )
    db.add(dataset)
    db.flush()

    # Analyze columns
    for col in df.columns:
        dtype = str(df[col].dtype)
        if "int" in dtype or "float" in dtype:
            col_type = "numeric"
        elif "datetime" in dtype:
            col_type = "datetime"
        else:
            col_type = "categorical"

        null_count = int(df[col].isnull().sum())
        null_pct = round(null_count / len(df) * 100, 2) if len(df) > 0 else 0.0
        unique_count = int(df[col].nunique())

        # Auto-detect column mapping
        mapped_to = None
        col_lower = col.lower()
        if col_lower in ("user_id", "user", "userid", "uid", "participant_id"):
            mapped_to = "user_id"
        elif col_lower in ("variant", "group", "arm", "treatment", "assignment"):
            mapped_to = "variant"
        elif col_lower in ("timestamp", "date", "time", "created_at", "event_time"):
            mapped_to = "timestamp"
        elif col_lower in ("conversion", "converted", "did_convert", "is_convert"):
            mapped_to = "conversion"
        elif col_lower in ("revenue", "amount", "order_value", "purchase_amount"):
            mapped_to = "revenue"
        elif col_lower in ("segment", "user_segment", "cohort"):
            mapped_to = "segment"
        elif col_lower in ("metric", "value", "score", "measure"):
            mapped_to = "metric"

        db.add(DatasetColumn(
            dataset_id=dataset.id,
            name=col,
            data_type=col_type,
            null_count=null_count,
            null_percentage=null_pct,
            unique_count=unique_count,
            is_mapped=mapped_to is not None,
            mapped_to=mapped_to,
        ))

    db.add(Activity(
        action="dataset_uploaded",
        entity_type="dataset",
        entity_id=dataset.id,
        entity_name=file.filename,
        details=f"{len(df)} rows, {len(df.columns)} columns",
        user_id=current_user.id,
    ))

    db.commit()
    db.refresh(dataset)
    return DatasetResponse.model_validate(dataset)


@router.post("/{experiment_id}/attach-dataset/{dataset_id}", response_model=DatasetResponse)
async def attach_dataset_to_experiment(
    experiment_id: int,
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach an existing dataset (from Data Lab) to this experiment."""
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Attach dataset to experiment
    dataset.experiment_id = experiment_id
    db.add(Activity(
        action="dataset_attached",
        entity_type="experiment",
        entity_id=experiment_id,
        entity_name=experiment.name,
        details=f"Attached dataset: {dataset.original_filename}",
        user_id=current_user.id,
    ))
    db.commit()
    db.refresh(dataset)
    return DatasetResponse.model_validate(dataset)


@router.delete("/{experiment_id}/detach-dataset", status_code=200)
async def detach_dataset_from_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the dataset association from an experiment (does not delete the dataset)."""
    experiment = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    ).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    dataset = (
        db.query(Dataset)
        .filter(Dataset.experiment_id == experiment_id)
        .order_by(Dataset.created_at.desc())
        .first()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="No dataset attached")

    dataset.experiment_id = None
    db.add(Activity(
        action="dataset_detached",
        entity_type="experiment",
        entity_id=experiment_id,
        entity_name=experiment.name,
        details=f"Detached dataset: {dataset.original_filename}",
        user_id=current_user.id,
    ))
    db.commit()
    return {"message": "Dataset detached successfully"}
