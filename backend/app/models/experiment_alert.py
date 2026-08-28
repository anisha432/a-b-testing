from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ExperimentAlert(Base):
    __tablename__ = "experiment_alerts"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # critical, warning, info, healthy
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # srm, data_quality, traffic, conversion, sample_size, freshness
    is_resolved = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    experiment = relationship("Experiment", back_populates="alerts")
