from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class VariantCreate(BaseModel):
    name: str
    description: Optional[str] = None
    allocation: float = 50.0
    is_control: bool = False


class VariantResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    allocation: float
    is_control: bool

    class Config:
        from_attributes = True


class ExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    hypothesis: Optional[str] = None
    owner: Optional[str] = None
    experiment_type: str = "conversion"
    primary_metric: Optional[str] = None
    secondary_metrics: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    control_allocation: float = 50.0
    treatment_allocation: float = 50.0
    target_audience: Optional[str] = None
    expected_uplift: Optional[float] = None
    variants: Optional[List[VariantCreate]] = None


class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hypothesis: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    experiment_type: Optional[str] = None
    primary_metric: Optional[str] = None
    secondary_metrics: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    control_allocation: Optional[float] = None
    treatment_allocation: Optional[float] = None
    target_audience: Optional[str] = None
    expected_uplift: Optional[float] = None


class ExperimentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    hypothesis: Optional[str] = None
    owner: Optional[str] = None
    workspace_id: Optional[int] = None
    status: str
    experiment_type: str
    primary_metric: Optional[str] = None
    secondary_metrics: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    control_allocation: float
    treatment_allocation: float
    target_audience: Optional[str] = None
    expected_uplift: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    variants: List[VariantResponse] = []

    class Config:
        from_attributes = True


class ExperimentListResponse(BaseModel):
    experiments: List[ExperimentResponse]
    total: int
    page: int
    page_size: int
