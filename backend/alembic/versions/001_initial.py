"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-08-28
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_superuser', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    op.create_table('workspaces',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
    )

    op.create_table('experiments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('hypothesis', sa.Text(), nullable=True),
        sa.Column('owner', sa.String(255), nullable=True),
        sa.Column('workspace_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), server_default='draft'),
        sa.Column('experiment_type', sa.String(50), server_default='conversion'),
        sa.Column('primary_metric', sa.String(255), nullable=True),
        sa.Column('secondary_metrics', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('target_audience', sa.String(255), nullable=True),
        sa.Column('expected_uplift', sa.Float(), nullable=True),
        sa.Column('control_allocation', sa.Float(), server_default='50.0'),
        sa.Column('treatment_allocation', sa.Float(), server_default='50.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )

    op.create_table('experiment_variants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('allocation', sa.Float(), server_default='50.0'),
        sa.Column('is_control', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id']),
    )

    op.create_table('datasets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(500), nullable=False),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), server_default='0'),
        sa.Column('row_count', sa.Integer(), server_default='0'),
        sa.Column('column_count', sa.Integer(), server_default='0'),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('column_mapping', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), server_default='uploaded'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )

    op.create_table('dataset_columns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('data_type', sa.String(50), nullable=False),
        sa.Column('null_count', sa.Integer(), server_default='0'),
        sa.Column('null_percentage', sa.Float(), server_default='0.0'),
        sa.Column('unique_count', sa.Integer(), server_default='0'),
        sa.Column('is_mapped', sa.Boolean(), server_default='false'),
        sa.Column('mapped_to', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id']),
    )

    op.create_table('experiment_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(255), nullable=False),
        sa.Column('control_mean', sa.Float(), server_default='0.0'),
        sa.Column('treatment_mean', sa.Float(), server_default='0.0'),
        sa.Column('absolute_difference', sa.Float(), server_default='0.0'),
        sa.Column('relative_uplift', sa.Float(), server_default='0.0'),
        sa.Column('control_sample_size', sa.Integer(), server_default='0'),
        sa.Column('treatment_sample_size', sa.Integer(), server_default='0'),
        sa.Column('p_value', sa.Float(), nullable=True),
        sa.Column('confidence_level', sa.Float(), nullable=True),
        sa.Column('confidence_interval_lower', sa.Float(), nullable=True),
        sa.Column('confidence_interval_upper', sa.Float(), nullable=True),
        sa.Column('statistical_power', sa.Float(), nullable=True),
        sa.Column('mde', sa.Float(), nullable=True),
        sa.Column('test_used', sa.String(100), nullable=True),
        sa.Column('test_explanation', sa.Text(), nullable=True),
        sa.Column('is_significant', sa.Integer(), server_default='0'),
        sa.Column('control_median', sa.Float(), nullable=True),
        sa.Column('treatment_median', sa.Float(), nullable=True),
        sa.Column('control_variance', sa.Float(), nullable=True),
        sa.Column('treatment_variance', sa.Float(), nullable=True),
        sa.Column('control_std', sa.Float(), nullable=True),
        sa.Column('treatment_std', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id']),
    )

    op.create_table('segment_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=False),
        sa.Column('segment_name', sa.String(255), nullable=False),
        sa.Column('segment_value', sa.String(255), nullable=False),
        sa.Column('control_sample_size', sa.Integer(), server_default='0'),
        sa.Column('treatment_sample_size', sa.Integer(), server_default='0'),
        sa.Column('control_mean', sa.Float(), server_default='0.0'),
        sa.Column('treatment_mean', sa.Float(), server_default='0.0'),
        sa.Column('relative_uplift', sa.Float(), server_default='0.0'),
        sa.Column('p_value', sa.Float(), nullable=True),
        sa.Column('is_significant', sa.Integer(), server_default='0'),
        sa.Column('confidence_level', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id']),
    )

    op.create_table('experiment_alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=False),
        sa.Column('alert_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('is_resolved', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id']),
    )

    op.create_table('reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('experiment_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('report_type', sa.String(50), server_default='full'),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('file_path', sa.String(1000), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )

    op.create_table('activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('workspace_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('entity_name', sa.String(255), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
    )

    op.create_index('ix_experiments_status', 'experiments', ['status'])
    op.create_index('ix_experiments_created_at', 'experiments', ['created_at'])
    op.create_index('ix_activities_created_at', 'activities', ['created_at'])


def downgrade() -> None:
    op.drop_table('activities')
    op.drop_table('reports')
    op.drop_table('experiment_alerts')
    op.drop_table('segment_results')
    op.drop_table('experiment_results')
    op.drop_table('dataset_columns')
    op.drop_table('datasets')
    op.drop_table('experiment_variants')
    op.drop_table('experiments')
    op.drop_table('workspaces')
    op.drop_table('users')
