from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    quality_score = Column(Float, nullable=True)
    column_mapping = Column(Text, nullable=True)  # JSON
    status = Column(String(50), default="uploaded")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    experiment = relationship("Experiment", back_populates="datasets")
    columns = relationship("DatasetColumn", back_populates="dataset", cascade="all, delete-orphan")


class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    name = Column(String(255), nullable=False)
    data_type = Column(String(50), nullable=False)
    null_count = Column(Integer, default=0)
    null_percentage = Column(Float, default=0.0)
    unique_count = Column(Integer, default=0)
    is_mapped = Column(Boolean, default=False)
    mapped_to = Column(String(100), nullable=True)  # user_id, variant, timestamp, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dataset = relationship("Dataset", back_populates="columns")
