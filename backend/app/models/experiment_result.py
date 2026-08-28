from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ExperimentResult(Base):
    __tablename__ = "experiment_results"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    metric_name = Column(String(255), nullable=False)
    control_mean = Column(Float, default=0.0)
    treatment_mean = Column(Float, default=0.0)
    absolute_difference = Column(Float, default=0.0)
    relative_uplift = Column(Float, default=0.0)
    control_sample_size = Column(Integer, default=0)
    treatment_sample_size = Column(Integer, default=0)
    p_value = Column(Float, nullable=True)
    confidence_level = Column(Float, nullable=True)
    confidence_interval_lower = Column(Float, nullable=True)
    confidence_interval_upper = Column(Float, nullable=True)
    statistical_power = Column(Float, nullable=True)
    mde = Column(Float, nullable=True)
    test_used = Column(String(100), nullable=True)
    test_explanation = Column(Text, nullable=True)
    is_significant = Column(Integer, default=0)
    control_median = Column(Float, nullable=True)
    treatment_median = Column(Float, nullable=True)
    control_variance = Column(Float, nullable=True)
    treatment_variance = Column(Float, nullable=True)
    control_std = Column(Float, nullable=True)
    treatment_std = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    experiment = relationship("Experiment", back_populates="results")
