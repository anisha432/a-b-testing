"""
Seed database with realistic demo data for ExperimentIQ.
Generates sufficient observations to demonstrate:
- Control vs Treatment with meaningful differences
- Conversion rates
- Revenue data
- Segments (device, country, channel)
- SRM detection (one experiment)
- Significant and non-significant results
"""
import os
import sys
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, engine, Base
from app.models.user import User
from app.models.workspace import Workspace
from app.models.experiment import Experiment, ExperimentVariant
from app.models.dataset import Dataset, DatasetColumn
from app.models.experiment_result import ExperimentResult
from app.models.activity import Activity
from app.core.security import hash_password


def seed():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding users...")
        user = User(
            email="admin@experimentiq.com",
            username="admin",
            hashed_password=hash_password("admin123"),
            full_name="Admin User",
            is_superuser=True,
        )
        db.add(user)
        db.flush()

        print("Seeding workspace...")
        workspace = Workspace(
            name="ExperimentIQ Demo",
            description="Demo workspace with sample experiments",
            owner_id=user.id,
        )
        db.add(workspace)
        db.flush()

        # --- Experiment 1: Significant Conversion Experiment ---
        print("Creating Experiment 1: Checkout Flow Optimization (significant)...")
        exp1 = Experiment(
            name="Checkout Flow Optimization",
            description="Testing a streamlined checkout flow to improve conversion rate.",
            hypothesis="A simplified checkout with fewer steps will increase conversion by 8-12%.",
            owner="Sarah Chen",
            workspace_id=workspace.id,
            user_id=user.id,
            status="completed",
            experiment_type="conversion",
            primary_metric="conversion",
            start_date=datetime(2026, 6, 1),
            end_date=datetime(2026, 7, 15),
            control_allocation=50.0,
            treatment_allocation=50.0,
            target_audience="All users who reach checkout",
            expected_uplift=10.0,
        )
        db.add(exp1)
        db.flush()

        db.add(ExperimentVariant(experiment_id=exp1.id, name="Control", allocation=50.0, is_control=1))
        db.add(ExperimentVariant(experiment_id=exp1.id, name="Treatment", allocation=50.0, is_control=0))

        # Generate dataset for exp1
        np.random.seed(42)
        n1 = 5000
        variants1 = np.random.choice(["Control", "Treatment"], size=n1, p=[0.5, 0.5])
        ctrl_conv_rate = 0.12
        treat_conv_rate = 0.135
        conversions = []
        revenues = []
        devices = np.random.choice(["desktop", "mobile", "tablet"], size=n1, p=[0.45, 0.40, 0.15])
        countries = np.random.choice(["US", "UK", "DE", "IN", "BR"], size=n1, p=[0.35, 0.20, 0.15, 0.20, 0.10])
        channels = np.random.choice(["organic", "paid", "referral", "direct"], size=n1, p=[0.35, 0.30, 0.20, 0.15])

        for i in range(n1):
            rate = treat_conv_rate if variants1[i] == "Treatment" else ctrl_conv_rate
            conv = np.random.random() < rate
            conversions.append(1 if conv else 0)
            revenues.append(round(np.random.exponential(45) if conv else 0, 2))

        timestamps = [datetime(2026, 6, 1) + timedelta(seconds=random.randint(0, 44 * 86400)) for _ in range(n1)]
        df1 = pd.DataFrame({
            "user_id": range(1, n1 + 1),
            "variant": variants1,
            "timestamp": timestamps,
            "conversion": conversions,
            "revenue": revenues,
            "device": devices,
            "country": countries,
            "channel": channels,
        })
        csv_path1 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "demo_checkout.csv")
        os.makedirs(os.path.dirname(csv_path1), exist_ok=True)
        df1.to_csv(csv_path1, index=False)

        ds1 = Dataset(
            experiment_id=exp1.id,
            filename="demo_checkout.csv",
            original_filename="demo_checkout.csv",
            file_path=csv_path1,
            file_size_bytes=os.path.getsize(csv_path1),
            row_count=len(df1),
            column_count=len(df1.columns),
            quality_score=94.0,
            status="uploaded",
            user_id=user.id,
        )
        db.add(ds1)
        db.flush()

        # Add column metadata
        col_mapping = {"user_id": "user_id", "variant": "variant", "timestamp": "timestamp", "conversion": "conversion", "revenue": "revenue", "device": "segment", "country": "segment", "channel": "segment"}
        for col in df1.columns:
            db.add(DatasetColumn(
                dataset_id=ds1.id,
                name=col,
                data_type="numeric" if df1[col].dtype in ("int64", "float64") else "categorical" if df1[col].dtype == "object" else "datetime",
                null_count=0,
                null_percentage=0.0,
                unique_count=int(df1[col].nunique()),
                is_mapped=col in col_mapping,
                mapped_to=col_mapping.get(col),
            ))

        # --- Experiment 2: Non-significant Engagement Experiment ---
        print("Creating Experiment 2: Notification Frequency (non-significant)...")
        exp2 = Experiment(
            name="Notification Frequency Test",
            description="Testing whether increasing notification frequency improves engagement.",
            hypothesis="Sending 3 notifications per day instead of 1 will increase session count.",
            owner="Mike Johnson",
            workspace_id=workspace.id,
            user_id=user.id,
            status="running",
            experiment_type="engagement",
            primary_metric="session_count",
            start_date=datetime(2026, 7, 1),
            control_allocation=50.0,
            treatment_allocation=50.0,
            target_audience="Active users in last 30 days",
            expected_uplift=5.0,
        )
        db.add(exp2)
        db.flush()

        db.add(ExperimentVariant(experiment_id=exp2.id, name="Control", allocation=50.0, is_control=1))
        db.add(ExperimentVariant(experiment_id=exp2.id, name="Treatment", allocation=50.0, is_control=0))

        # Generate dataset for exp2
        np.random.seed(123)
        n2 = 3000
        variants2 = np.random.choice(["Control", "Treatment"], size=n2, p=[0.5, 0.5])
        ctrl_sessions = np.random.poisson(4.2, n2)
        treat_sessions = np.random.poisson(4.35, n2)
        devices2 = np.random.choice(["desktop", "mobile", "tablet"], size=n2, p=[0.4, 0.45, 0.15])
        countries2 = np.random.choice(["US", "UK", "DE", "IN", "BR"], size=n2, p=[0.30, 0.25, 0.10, 0.25, 0.10])

        df2 = pd.DataFrame({
            "user_id": range(1, n2 + 1),
            "variant": variants2,
            "session_count": np.where(variants2 == "Control", ctrl_sessions, treat_sessions),
            "device": devices2,
            "country": countries2,
        })
        csv_path2 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "demo_notifications.csv")
        df2.to_csv(csv_path2, index=False)

        ds2 = Dataset(
            experiment_id=exp2.id,
            filename="demo_notifications.csv",
            original_filename="demo_notifications.csv",
            file_path=csv_path2,
            file_size_bytes=os.path.getsize(csv_path2),
            row_count=len(df2),
            column_count=len(df2.columns),
            quality_score=97.0,
            status="uploaded",
            user_id=user.id,
        )
        db.add(ds2)
        db.flush()

        for col in df2.columns:
            db.add(DatasetColumn(
                dataset_id=ds2.id,
                name=col,
                data_type="numeric" if df2[col].dtype in ("int64", "float64") else "categorical",
                null_count=0,
                null_percentage=0.0,
                unique_count=int(df2[col].nunique()),
                is_mapped=col in {"user_id", "variant", "session_count"},
                mapped_to={"user_id": "user_id", "variant": "variant", "session_count": "metric"}.get(col),
            ))

        # --- Experiment 3: Revenue Experiment with SRM ---
        print("Creating Experiment 3: Pricing Page (with SRM)...")
        exp3 = Experiment(
            name="Pricing Page Redesign",
            description="Testing new pricing page layout with social proof elements.",
            hypothesis="Adding testimonials and usage stats to pricing page will increase revenue.",
            owner="Sarah Chen",
            workspace_id=workspace.id,
            user_id=user.id,
            status="completed",
            experiment_type="revenue",
            primary_metric="revenue",
            start_date=datetime(2026, 5, 1),
            end_date=datetime(2026, 6, 1),
            control_allocation=50.0,
            treatment_allocation=50.0,
            target_audience="Users visiting pricing page",
            expected_uplift=15.0,
        )
        db.add(exp3)
        db.flush()

        db.add(ExperimentVariant(experiment_id=exp3.id, name="Control", allocation=50.0, is_control=1))
        db.add(ExperimentVariant(experiment_id=exp3.id, name="Treatment", allocation=50.0, is_control=0))

        # Generate dataset with SRM (55/45 instead of 50/50)
        np.random.seed(99)
        n3 = 4000
        variants3 = np.random.choice(["Control", "Treatment"], size=n3, p=[0.45, 0.55])  # SRM!
        ctrl_rev = np.random.lognormal(3.5, 0.8, n3)
        treat_rev = np.random.lognormal(3.7, 0.85, n3)
        devices3 = np.random.choice(["desktop", "mobile"], size=n3, p=[0.55, 0.45])
        countries3 = np.random.choice(["US", "UK", "IN"], size=n3, p=[0.5, 0.25, 0.25])

        df3 = pd.DataFrame({
            "user_id": range(1, n3 + 1),
            "variant": variants3,
            "revenue": np.round(np.where(variants3 == "Control", ctrl_rev, treat_rev), 2),
            "device": devices3,
            "country": countries3,
        })
        csv_path3 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "demo_pricing.csv")
        df3.to_csv(csv_path3, index=False)

        ds3 = Dataset(
            experiment_id=exp3.id,
            filename="demo_pricing.csv",
            original_filename="demo_pricing.csv",
            file_path=csv_path3,
            file_size_bytes=os.path.getsize(csv_path3),
            row_count=len(df3),
            column_count=len(df3.columns),
            quality_score=91.0,
            status="uploaded",
            user_id=user.id,
        )
        db.add(ds3)
        db.flush()

        for col in df3.columns:
            db.add(DatasetColumn(
                dataset_id=ds3.id,
                name=col,
                data_type="numeric" if df3[col].dtype in ("int64", "float64") else "categorical",
                null_count=0,
                null_percentage=0.0,
                unique_count=int(df3[col].nunique()),
                is_mapped=col in {"user_id", "variant", "revenue"},
                mapped_to={"user_id": "user_id", "variant": "variant", "revenue": "revenue"}.get(col),
            ))

        # --- Experiment 4: Draft Experiment ---
        print("Creating Experiment 4: Onboarding (draft)...")
        exp4 = Experiment(
            name="Onboarding Flow V2",
            description="Testing a new onboarding experience with progressive disclosure.",
            hypothesis="A step-by-step onboarding will improve activation rate by 15%.",
            owner="Mike Johnson",
            workspace_id=workspace.id,
            user_id=user.id,
            status="draft",
            experiment_type="retention",
            primary_metric="activation_rate",
            start_date=datetime(2026, 8, 1),
            target_audience="New signups",
            expected_uplift=15.0,
        )
        db.add(exp4)
        db.flush()

        db.add(ExperimentVariant(experiment_id=exp4.id, name="Control", allocation=50.0, is_control=1))
        db.add(ExperimentVariant(experiment_id=exp4.id, name="Treatment", allocation=50.0, is_control=0))

        # --- Experiment 5: Paused ---
        print("Creating Experiment 5: Email Campaign (paused)...")
        exp5 = Experiment(
            name="Email Campaign Timing",
            description="Testing optimal email send times for re-engagement.",
            hypothesis="Sending emails at 7am instead of 2pm will increase open rates.",
            owner="Admin User",
            workspace_id=workspace.id,
            user_id=user.id,
            status="paused",
            experiment_type="engagement",
            primary_metric="open_rate",
            start_date=datetime(2026, 7, 10),
            control_allocation=50.0,
            treatment_allocation=50.0,
            target_audience="Dormant users (30+ days inactive)",
            expected_uplift=8.0,
        )
        db.add(exp5)
        db.flush()

        db.add(ExperimentVariant(experiment_id=exp5.id, name="Control", allocation=50.0, is_control=1))
        db.add(ExperimentVariant(experiment_id=exp5.id, name="Treatment", allocation=50.0, is_control=0))

        # Seed some results for exp1
        db.add(ExperimentResult(
            experiment_id=exp1.id,
            metric_name="conversion",
            control_mean=0.12,
            treatment_mean=0.135,
            absolute_difference=0.015,
            relative_uplift=12.5,
            control_sample_size=2500,
            treatment_sample_size=2500,
            p_value=0.032,
            confidence_level=0.95,
            confidence_interval_lower=0.003,
            confidence_interval_upper=0.027,
            statistical_power=0.72,
            mde=2.8,
            test_used="z-test (two-proportion)",
            test_explanation="Two-proportion z-test for binary conversion metric.",
            is_significant=1,
        ))

        # Seed activities
        activities = [
            Activity(action="experiment_created", entity_type="experiment", entity_name="Checkout Flow Optimization", user_id=user.id),
            Activity(action="dataset_uploaded", entity_type="dataset", entity_name="demo_checkout.csv", user_id=user.id),
            Activity(action="analysis_completed", entity_type="experiment", entity_name="Checkout Flow Optimization", user_id=user.id),
            Activity(action="experiment_created", entity_type="experiment", entity_name="Notification Frequency Test", user_id=user.id),
            Activity(action="dataset_uploaded", entity_type="dataset", entity_name="demo_notifications.csv", user_id=user.id),
            Activity(action="experiment_created", entity_type="experiment", entity_name="Pricing Page Redesign", user_id=user.id),
            Activity(action="significant_result_detected", entity_type="experiment", entity_name="Checkout Flow Optimization", details="+12.5% uplift detected with 95% confidence", user_id=user.id),
        ]
        for a in activities:
            db.add(a)

        db.commit()
        print("✅ Seed data created successfully!")
        print(f"  - 1 admin user (admin@experimentiq.com / admin123)")
        print(f"  - 1 workspace")
        print(f"  - 5 experiments (2 completed, 1 running, 1 paused, 1 draft)")
        print(f"  - 3 datasets with {n1 + n2 + n3} total rows")
        print(f"  - 1 experiment result with significance")
        print(f"  - 7 activity records")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
