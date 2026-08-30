import os
import json
import uuid
import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.models.dataset import Dataset, DatasetColumn
from app.models.experiment import Experiment
from app.models.activity import Activity
from app.models.user import User
from app.schemas.dataset import DatasetResponse, DataQualityResponse, DataQualityWarning, DatasetPreview, ColumnMappingUpdate
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/datasets", tags=["Datasets"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=DatasetResponse, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    experiment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        if ext == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

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


@router.get("", response_model=list[DatasetResponse])
async def list_datasets(
    experiment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Dataset).filter(Dataset.user_id == current_user.id)
    if experiment_id:
        query = query.filter(Dataset.experiment_id == experiment_id)
    datasets = query.order_by(Dataset.created_at.desc()).limit(50).all()
    return [DatasetResponse.model_validate(d) for d in datasets]


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetResponse.model_validate(dataset)


@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = pd.read_csv(dataset.file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read dataset")

    total_rows = len(df)
    start = (page - 1) * page_size
    end = min(start + page_size, total_rows)
    subset = df.iloc[start:end]

    rows = subset.replace({np.nan: None}).to_dict(orient="records")
    return DatasetPreview(
        columns=list(df.columns),
        rows=rows,
        total_rows=total_rows,
        page=page,
        page_size=page_size,
    )


@router.get("/{dataset_id}/quality", response_model=DataQualityResponse)
async def get_data_quality(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = pd.read_csv(dataset.file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read dataset")

    total_rows = len(df)
    total_cells = total_rows * len(df.columns)
    missing_total = int(df.isnull().sum().sum())
    duplicate_count = int(df.duplicated().sum())

    outliers = 0
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        outliers += int(((df[col] < lower) | (df[col] > upper)).sum())

    warnings = []
    recommendations = []

    if missing_total > 0:
        missing_pct = round(missing_total / total_cells * 100, 1)
        severity = "critical" if missing_pct > 10 else "warning"
        warnings.append(DataQualityWarning(
            category="missing_values",
            severity=severity,
            message=f"{missing_total} missing values ({missing_pct}% of all cells)",
        ))

    if duplicate_count > 0:
        dup_pct = round(duplicate_count / total_rows * 100, 1)
        warnings.append(DataQualityWarning(
            category="duplicates",
            severity="critical" if dup_pct > 5 else "warning",
            message=f"{duplicate_count} duplicate rows ({dup_pct}%)",
        ))

    if outliers > 0:
        warnings.append(DataQualityWarning(
            category="outliers",
            severity="warning",
            message=f"{outliers} outlier values detected using IQR method",
        ))

    for col in df.columns:
        null_pct = df[col].isnull().sum() / total_rows * 100
        if null_pct > 20:
            warnings.append(DataQualityWarning(
                category="high_nulls",
                severity="critical",
                message=f"Column '{col}' has {null_pct:.1f}% missing values",
                column=col,
            ))

    if missing_total > 0:
        recommendations.append("Consider imputing or removing rows with missing values before analysis.")
    if duplicate_count > 0:
        recommendations.append("Remove duplicate rows to avoid biased experiment results.")
    if outliers > 0:
        recommendations.append("Review outlier values - they may indicate data quality issues or extreme user behavior.")
    if total_rows < 100:
        recommendations.append("Dataset is small. Consider collecting more data for reliable statistical results.")
    if total_rows < 1000:
        recommendations.append("For reliable A/B test results, aim for at least 1000 observations per variant.")

    score = 100.0
    if total_cells > 0:
        score -= (missing_total / total_cells) * 30
    if total_rows > 0:
        score -= (duplicate_count / total_rows) * 25
    if outliers > 0:
        score -= min(15, (outliers / total_cells) * 100)
    score = max(0, min(100, round(score)))

    dataset.quality_score = score
    db.commit()

    return DataQualityResponse(
        score=score,
        total_rows=total_rows,
        warnings=warnings,
        recommendations=recommendations,
        duplicate_count=duplicate_count,
        missing_values_total=missing_total,
        outliers_detected=outliers,
    )


@router.put("/{dataset_id}/mapping", response_model=DatasetResponse)
async def update_column_mapping(
    dataset_id: int,
    data: ColumnMappingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    columns = db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset_id).all()
    for col in columns:
        if col.name in data.column_mappings:
            col.mapped_to = data.column_mappings[col.name]
            col.is_mapped = data.column_mappings[col.name] is not None
        else:
            col.mapped_to = None
            col.is_mapped = False

    dataset.column_mapping = json.dumps(data.column_mappings)
    db.commit()
    db.refresh(dataset)
    return DatasetResponse.model_validate(dataset)


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
    db.delete(dataset)
    db.commit()
