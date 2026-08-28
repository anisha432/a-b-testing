"""
Tests for the statistical analysis engine.
These tests validate the core analytics without requiring a database.
"""
import sys
import os
import pytest
import numpy as np

# Add the backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.analytics.statistics import (
    analyze_conversion,
    analyze_continuous,
    detect_srm,
    segment_analysis,
    health_check,
    calculate_business_impact,
    generate_insights,
    generate_copilot_answer,
)


class TestAnalyzeConversion:
    def test_conversion_basic(self):
        result = analyze_conversion(120, 1000, 150, 1000)
        assert result["control_sample_size"] == 1000
        assert result["treatment_sample_size"] == 1000
        assert result["control_mean"] == pytest.approx(0.12, abs=0.001)
        assert result["treatment_mean"] == pytest.approx(0.15, abs=0.001)
        assert result["relative_uplift"] > 0
        assert result["test_used"] == "z-test (two-proportion)"

    def test_conversion_significant(self):
        result = analyze_conversion(50, 1000, 100, 1000)
        assert result["p_value"] < 0.05
        assert result["is_significant"] == True

    def test_conversion_not_significant(self):
        result = analyze_conversion(100, 1000, 102, 1000)
        assert result["p_value"] > 0.05
        assert result["is_significant"] == False

    def test_conversion_has_confidence_interval(self):
        result = analyze_conversion(100, 500, 120, 500)
        assert result["confidence_interval_lower"] is not None
        assert result["confidence_interval_upper"] is not None
        assert result["confidence_interval_lower"] < result["confidence_interval_upper"]

    def test_conversion_zero_sample(self):
        result = analyze_conversion(0, 0, 0, 0)
        assert result["control_sample_size"] == 0

    def test_conversion_power(self):
        result = analyze_conversion(100, 5000, 150, 5000)
        assert result["statistical_power"] is not None
        assert 0 <= result["statistical_power"] <= 1


class TestAnalyzeContinuous:
    def test_continuous_basic(self):
        control = np.random.normal(10, 2, 500)
        treatment = np.random.normal(11, 2, 500)
        result = analyze_continuous(control, treatment)
        assert result["control_sample_size"] == 500
        assert result["treatment_sample_size"] == 500
        assert result["control_mean"] is not None
        assert result["treatment_mean"] is not None

    def test_continuous_p_value(self):
        control = np.random.normal(10, 1, 1000)
        treatment = np.random.normal(10, 1, 1000)
        result = analyze_continuous(control, treatment)
        assert result["p_value"] is not None
        assert 0 <= result["p_value"] <= 1

    def test_continuous_test_selection(self):
        # Normal data should use t-test
        control = np.random.normal(10, 1, 200)
        treatment = np.random.normal(12, 1, 200)
        result = analyze_continuous(control, treatment)
        assert "t-test" in result["test_used"] or "Mann-Whitney" in result["test_used"]
        assert result["test_explanation"] is not None

    def test_continuous_insufficient_data(self):
        result = analyze_continuous(np.array([1.0]), np.array([2.0]))
        assert result["control_sample_size"] < 2

    def test_continuous_has_median(self):
        control = np.random.normal(10, 2, 300)
        treatment = np.random.normal(11, 2, 300)
        result = analyze_continuous(control, treatment)
        assert result["control_median"] is not None
        assert result["treatment_median"] is not None


class TestSRMDetection:
    def test_no_srm(self):
        result = detect_srm(0.5, 0.5, 5000, 5000)
        assert result["has_srm"] == False
        assert result["severity"] == "none"

    def test_srm_detected(self):
        result = detect_srm(0.5, 0.5, 4000, 6000)
        assert result["has_srm"] == True
        assert result["severity"] in ("critical", "high", "medium")

    def test_srm_p_value(self):
        result = detect_srm(0.5, 0.5, 4500, 5500)
        assert result["p_value"] is not None
        assert 0 <= result["p_value"] <= 1

    def test_srm_zero_total(self):
        result = detect_srm(0.5, 0.5, 0, 0)
        assert result["has_srm"] == False

    def test_srm_recommendation(self):
        result = detect_srm(0.5, 0.5, 4000, 6000)
        assert result["recommendation"] is not None
        assert len(result["recommendation"]) > 0


class TestHealthCheck:
    def test_health_large_sample(self):
        import pandas as pd
        df = pd.DataFrame({
            "variant": np.random.choice(["Control", "Treatment"], 5000),
            "metric": np.random.normal(10, 2, 5000),
        })
        result = health_check(df, "variant", "metric")
        assert result["score"] > 0
        assert len(result["checks"]) > 0

    def test_health_small_sample(self):
        import pandas as pd
        df = pd.DataFrame({
            "variant": ["Control"] * 5 + ["Treatment"] * 5,
            "metric": np.random.normal(10, 2, 10),
        })
        result = health_check(df, "variant", "metric")
        # Should have a warning about small sample
        sample_check = [c for c in result["checks"] if c["name"] == "Sample Size"]
        assert len(sample_check) > 0
        assert sample_check[0]["status"] in ("warning", "critical")

    def test_health_score_range(self):
        import pandas as pd
        df = pd.DataFrame({
            "variant": np.random.choice(["Control", "Treatment"], 2000),
            "metric": np.random.normal(10, 2, 2000),
        })
        result = health_check(df, "variant", "metric")
        assert 0 <= result["score"] <= 100


class TestBusinessImpact:
    def test_basic_impact(self):
        result = calculate_business_impact(0.1, 0.12, 1000, 1000)
        assert result["uplift_percentage"] == pytest.approx(20.0, abs=0.1)
        assert result["incremental_per_user"] == pytest.approx(0.02, abs=0.001)

    def test_impact_with_revenue(self):
        result = calculate_business_impact(0.1, 0.12, 1000, 1000, monthly_revenue_per_user=50, daily_users=10000)
        assert result["estimated_monthly_impact"] is not None
        assert result["estimated_annual_impact"] is not None
        assert result["estimated_annual_impact"] == pytest.approx(result["estimated_monthly_impact"] * 12, rel=0.01)

    def test_impact_zero_control(self):
        result = calculate_business_impact(0, 0.1, 1000, 1000)
        assert result["uplift_percentage"] == 0


class TestInsights:
    def test_significant_positive(self):
        result = {"relative_uplift": 10, "p_value": 0.03, "is_significant": True, "control_sample_size": 500, "treatment_sample_size": 500, "statistical_power": 0.8}
        srm = {"has_srm": False}
        health = {"score": 95, "checks": []}
        insights = generate_insights(result, srm, health, {"name": "Test"})
        assert len(insights) > 0
        assert any(i["type"] == "winner" for i in insights)

    def test_not_significant(self):
        result = {"relative_uplift": 2, "p_value": 0.3, "is_significant": False, "control_sample_size": 100, "treatment_sample_size": 100, "statistical_power": 0.3}
        srm = {"has_srm": False}
        health = {"score": 60, "checks": [{"status": "warning"}]}
        insights = generate_insights(result, srm, health, {"name": "Test"})
        assert any(i["type"] == "no_significance" for i in insights)


class TestCopilot:
    def test_winner_query(self):
        result = {"relative_uplift": 10, "p_value": 0.03, "is_significant": True, "control_sample_size": 500, "treatment_sample_size": 500}
        srm = {"has_srm": False}
        answer = generate_copilot_answer("which variant won", result, srm, {"name": "Test"})
        assert "answer" in answer
        assert len(answer["answer"]) > 0

    def test_significance_query(self):
        result = {"relative_uplift": 10, "p_value": 0.03, "is_significant": True, "control_sample_size": 500, "treatment_sample_size": 500}
        srm = {"has_srm": False}
        answer = generate_copilot_answer("is the result significant", result, srm, {"name": "Test"})
        assert "significant" in answer["answer"].lower()

    def test_srm_query(self):
        result = {"relative_uplift": 5, "p_value": 0.1, "is_significant": False, "control_sample_size": 500, "treatment_sample_size": 500}
        srm = {"has_srm": True, "p_value": 0.001, "expected": {}, "observed": {}}
        answer = generate_copilot_answer("is there SRM", result, srm, {"name": "Test"})
        assert "srm" in answer["answer"].lower() or "yes" in answer["answer"].lower()

    def test_sample_size_query(self):
        result = {"relative_uplift": 5, "p_value": 0.1, "is_significant": False, "control_sample_size": 1000, "treatment_sample_size": 1000}
        srm = {"has_srm": False}
        answer = generate_copilot_answer("what is the sample size", result, srm, {"name": "Test"})
        assert "1,000" in answer["answer"] or "1000" in answer["answer"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
