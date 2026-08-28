from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ExperimentResultResponse(BaseModel):
    id: int
    experiment_id: int
    metric_name: str
    control_mean: float
    treatment_mean: float
    absolute_difference: float
    relative_uplift: float
    control_sample_size: int
    treatment_sample_size: int
    p_value: Optional[float] = None
    confidence_level: Optional[float] = None
    confidence_interval_lower: Optional[float] = None
    confidence_interval_upper: Optional[float] = None
    statistical_power: Optional[float] = None
    mde: Optional[float] = None
    test_used: Optional[str] = None
    test_explanation: Optional[str] = None
    is_significant: bool
    control_median: Optional[float] = None
    treatment_median: Optional[float] = None
    control_variance: Optional[float] = None
    treatment_variance: Optional[float] = None
    control_std: Optional[float] = None
    treatment_std: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SegmentResultResponse(BaseModel):
    id: int
    experiment_id: int
    segment_name: str
    segment_value: str
    control_sample_size: int
    treatment_sample_size: int
    control_mean: float
    treatment_mean: float
    relative_uplift: float
    p_value: Optional[float] = None
    is_significant: bool
    confidence_level: Optional[float] = None

    class Config:
        from_attributes = True


class RunAnalysisRequest(BaseModel):
    experiment_id: int
    metric_column: Optional[str] = None
    segment_columns: Optional[List[str]] = None


class ExperimentAnalysisResponse(BaseModel):
    experiment_id: int
    metric: str
    control: dict
    treatment: dict
    uplift: dict
    statistical: dict
    segments: list
    srm: dict
    health: dict
    insights: list
    recommendation: str


class CopilotQuery(BaseModel):
    query: str
    experiment_id: int


class CopilotResponse(BaseModel):
    answer: str
    data: Optional[dict] = None


class SRMResult(BaseModel):
    expected: dict
    observed: dict
    chi_square: float
    p_value: float
    has_srm: bool
    severity: str
    recommendation: str


class HealthScore(BaseModel):
    score: int
    status: str
    checks: list
