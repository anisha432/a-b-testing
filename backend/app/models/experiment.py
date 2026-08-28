from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class ExperimentStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ExperimentType(str, enum.Enum):
    CONVERSION = "conversion"
    REVENUE = "revenue"
    ENGAGEMENT = "engagement"
    RETENTION = "retention"
    PERFORMANCE = "performance"
    CUSTOM = "custom"


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    hypothesis = Column(Text, nullable=True)
    owner = Column(String(255), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default=ExperimentStatus.DRAFT.value)
    experiment_type = Column(String(50), default=ExperimentType.CONVERSION.value)
    primary_metric = Column(String(255), nullable=True)
    secondary_metrics = Column(Text, nullable=True)  # JSON array
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    target_audience = Column(String(255), nullable=True)
    expected_uplift = Column(Float, nullable=True)
    control_allocation = Column(Float, default=50.0)
    treatment_allocation = Column(Float, default=50.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="experiments")
    owner_user = relationship("User", back_populates="experiments")
    variants = relationship("ExperimentVariant", back_populates="experiment", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="experiment")
    results = relationship("ExperimentResult", back_populates="experiment", cascade="all, delete-orphan")
    segment_results = relationship("SegmentResult", back_populates="experiment", cascade="all, delete-orphan")
    alerts = relationship("ExperimentAlert", back_populates="experiment", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="experiment")


class ExperimentVariant(Base):
    __tablename__ = "experiment_variants"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    allocation = Column(Float, default=50.0)
    is_control = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    experiment = relationship("Experiment", back_populates="variants")
