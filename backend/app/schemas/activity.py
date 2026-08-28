from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ActivityResponse(BaseModel):
    id: int
    action: str
    entity_type: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OverviewStats(BaseModel):
    active_experiments: int
    completed_experiments: int
    average_uplift: Optional[float] = None
    significant_experiments: int
    revenue_impact: Optional[float] = None
