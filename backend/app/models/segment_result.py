from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class SegmentResult(Base):
    __tablename__ = "segment_results"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    segment_name = Column(String(255), nullable=False)
    segment_value = Column(String(255), nullable=False)
    control_sample_size = Column(Integer, default=0)
    treatment_sample_size = Column(Integer, default=0)
    control_mean = Column(Float, default=0.0)
    treatment_mean = Column(Float, default=0.0)
    relative_uplift = Column(Float, default=0.0)
    p_value = Column(Float, nullable=True)
    is_significant = Column(Integer, default=0)
    confidence_level = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    experiment = relationship("Experiment", back_populates="segment_results")
