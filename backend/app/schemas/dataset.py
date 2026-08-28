from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class DatasetColumnResponse(BaseModel):
    id: int
    name: str
    data_type: str
    null_count: int
    null_percentage: float
    unique_count: int
    is_mapped: bool
    mapped_to: Optional[str] = None

    class Config:
        from_attributes = True


class DatasetResponse(BaseModel):
    id: int
    experiment_id: Optional[int] = None
    filename: str
    original_filename: str
    file_size_bytes: int
    row_count: int
    column_count: int
    quality_score: Optional[float] = None
    column_mapping: Optional[str] = None
    status: str
    created_at: datetime
    columns: List[DatasetColumnResponse] = []

    class Config:
        from_attributes = True


class ColumnMappingUpdate(BaseModel):
    column_mappings: dict  # {"column_name": "mapped_to_role"}


class DataQualityWarning(BaseModel):
    category: str
    severity: str
    message: str
    column: Optional[str] = None


class DataQualityResponse(BaseModel):
    score: float
    total_rows: int
    warnings: List[DataQualityWarning]
    recommendations: List[str]
    duplicate_count: int
    missing_values_total: int
    outliers_detected: int


class DatasetPreview(BaseModel):
    columns: List[str]
    rows: List[dict]
    total_rows: int
    page: int
    page_size: int
