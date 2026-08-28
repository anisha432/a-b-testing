from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ReportCreate(BaseModel):
    experiment_id: int
    title: str
    report_type: str = "full"


class ReportResponse(BaseModel):
    id: int
    experiment_id: int
    title: str
    report_type: str
    status: str
    file_size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True
