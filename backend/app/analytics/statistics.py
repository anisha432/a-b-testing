"""
Statistical Analysis Engine for ExperimentIQ

Provides rigorous A/B testing analysis including:
- Conversion rate analysis (z-test, chi-square)
- Continuous metric analysis (t-test, Mann-Whitney U)
- Confidence intervals
- Power analysis
- SRM detection
- Segment analysis
- Health checks
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Optional


def analyze_conversion(
    control_conversions: int,
    control_total: int,
    treatment_conversions: int,
    treatment_total: int,
    confidence_level: float = 0.95,
) -> dict:
    """Analyze binary conversion metrics using z-test for proportions."""
    if control_total == 0 or treatment_total == 0:
        return _empty_result("conversion")

    cr_control = control_conversions / control_total
    cr_treatment = treatment_conversions / treatment_total

    # Pooled proportion
    p_pool = (control_conversions + treatment_conversions) / (control_total + treatment_total)

    # Standard error
    se = np.sqrt(p_pool * (1 - p_pool) * (1 / control_total + 1 / treatment_total))
    if se == 0:
        se = 1e-10

    # Z-test
    z_stat = (cr_treatment - cr_control) / se
    p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))

    # Confidence interval
    z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
    se_diff = np.sqrt(
        cr_control * (1 - cr_control) / control_total
        + cr_treatment * (1 - cr_treatment) / treatment_total
    )
    diff = cr_treatment - cr_control
    ci_lower = diff - z_crit * se_diff
    ci_upper = diff + z_crit * se_diff

    # Relative uplift
    relative_uplift = (diff / cr_control * 100) if cr_control > 0 else 0

    # Power analysis
    power = _calculate_power(cr_control, cr_treatment, control_total, treatment_total, confidence_level)

    # MDE
    mde = _calculate_mde(control_total, treatment_total, cr_control, confidence_level, 0.8)

    is_significant = bool(p_value < (1 - confidence_level))

    test_explanation = (
        f"Two-proportion z-test was used because the metric '{cr_control:.4f}' is a "
        f"binary conversion rate. This test compares proportions between two independent groups "
        f"and is appropriate for large samples (n > 30 per group)."
    )

    return {
        "metric": "conversion_rate",
        "control_mean": round(cr_control, 6),
        "treatment_mean": round(cr_treatment, 6),
        "absolute_difference": round(diff, 6),
        "relative_uplift": round(relative_uplift, 2),
        "control_sample_size": control_total,
        "treatment_sample_size": treatment_total,
        "control_median": None,
        "treatment_median": None,
        "control_variance": round(cr_control * (1 - cr_control), 6),
        "treatment_variance": round(cr_treatment * (1 - cr_treatment), 6),
        "control_std": round(np.sqrt(cr_control * (1 - cr_control)), 6),
        "treatment_std": round(np.sqrt(cr_treatment * (1 - cr_treatment)), 6),
        "p_value": round(p_value, 6),
        "confidence_level": confidence_level,
        "confidence_interval_lower": round(ci_lower, 6),
        "confidence_interval_upper": round(ci_upper, 6),
        "statistical_power": round(power, 4),
        "mde": round(mde * 100, 2) if mde else None,
        "test_used": "z-test (two-proportion)",
        "test_explanation": test_explanation,
        "is_significant": bool(is_significant),
    }


def analyze_continuous(
    control_values: np.ndarray,
    treatment_values: np.ndarray,
    confidence_level: float = 0.95,
) -> dict:
    """Analyze continuous metrics using t-test or Mann-Whitney U test."""
    control_values = control_values[~np.isnan(control_values)]
    treatment_values = treatment_values[~np.isnan(treatment_values)]

    if len(control_values) < 2 or len(treatment_values) < 2:
        return _empty_result("continuous")

    control_mean = np.mean(control_values)
    treatment_mean = np.mean(treatment_values)
    control_std = np.std(control_values, ddof=1)
    treatment_std = np.std(treatment_values, ddof=1)
    control_median = float(np.median(control_values))
    treatment_median = float(np.median(treatment_values))

    diff = treatment_mean - control_mean
    relative_uplift = (diff / control_mean * 100) if control_mean != 0 else 0

    # Check normality using Shapiro-Wilk (use subset for large samples)
    sample_size = min(500, len(control_values))
    _, p_normal_ctrl = stats.shapiro(control_values[:sample_size])
    _, p_normal_treat = stats.shapiro(treatment_values[:sample_size])

    use_parametric = p_normal_ctrl > 0.05 and p_normal_treat > 0.05

    if use_parametric:
        # Welch's t-test
        t_stat, p_value = stats.ttest_ind(control_values, treatment_values, equal_var=False)
        test_used = "Welch's t-test"
        test_explanation = (
            "Welch's t-test was used because both groups appear normally distributed "
            "(Shapiro-Wilk p > 0.05). This test does not assume equal variances."
        )
    else:
        # Mann-Whitney U test
        u_stat, p_value = stats.mannwhitneyu(control_values, treatment_values, alternative='two-sided')
        test_used = "Mann-Whitney U test"
        test_explanation = (
            "Mann-Whitney U test was used because one or both groups do not appear "
            "normally distributed (Shapiro-Wilk p ≤ 0.05). This non-parametric test "
            "compares distributions without assuming normality."
        )

    # Confidence interval for difference in means
    z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
    se_diff = np.sqrt(control_std**2 / len(control_values) + treatment_std**2 / len(treatment_values))
    ci_lower = diff - z_crit * se_diff
    ci_upper = diff + z_crit * se_diff

    # Power (using t-test approximation)
    from statsmodels.stats.power import TTestIndPower
    effect_size = diff / np.sqrt((control_std**2 + treatment_std**2) / 2) if (control_std**2 + treatment_std**2) > 0 else 0
    power_analysis = TTestIndPower()
    try:
        power = power_analysis.power(
            effect_size=abs(effect_size),
            nobs1=len(control_values),
            ratio=len(treatment_values) / len(control_values),
            alpha=1 - confidence_level,
        )
    except Exception:
        power = None

    # MDE
    try:
        mde_abs = power_analysis.solve_power(
            effect_size=None,
            nobs1=len(control_values),
            ratio=len(treatment_values) / len(control_values),
            alpha=1 - confidence_level,
            power=0.8,
        )
        mde = mde_abs * np.sqrt((control_std**2 + treatment_std**2) / 2) if (control_std**2 + treatment_std**2) > 0 else None
    except Exception:
        mde = None

    is_significant = p_value < (1 - confidence_level)

    return {
        "metric": "continuous",
        "control_mean": round(float(control_mean), 4),
        "treatment_mean": round(float(treatment_mean), 4),
        "absolute_difference": round(float(diff), 4),
        "relative_uplift": round(float(relative_uplift), 2),
        "control_sample_size": len(control_values),
        "treatment_sample_size": len(treatment_values),
        "control_median": round(control_median, 4),
        "treatment_median": round(treatment_median, 4),
        "control_variance": round(float(np.var(control_values, ddof=1)), 4),
        "treatment_variance": round(float(np.var(treatment_values, ddof=1)), 4),
        "control_std": round(float(control_std), 4),
        "treatment_std": round(float(treatment_std), 4),
        "p_value": round(float(p_value), 6),
        "confidence_level": confidence_level,
        "confidence_interval_lower": round(float(ci_lower), 4),
        "confidence_interval_upper": round(float(ci_upper), 4),
        "statistical_power": round(float(power), 4) if power is not None else None,
        "mde": round(float(mde) * 100, 2) if mde is not None else None,
        "test_used": test_used,
        "test_explanation": test_explanation,
        "is_significant": bool(is_significant),
    }


def detect_srm(
    expected_control_ratio: float,
    expected_treatment_ratio: float,
    observed_control: int,
    observed_treatment: int,
) -> dict:
    """Detect Sample Ratio Mismatch using chi-square test."""
    total = observed_control + observed_treatment
    if total == 0:
        return {
            "expected": {"control": expected_control_ratio, "treatment": expected_treatment_ratio},
            "observed": {"control": 0, "treatment": 0},
            "chi_square": 0,
            "p_value": 1.0,
            "has_srm": False,
            "severity": "none",
            "recommendation": "No data available for SRM analysis.",
        }

    expected_control = total * expected_control_ratio
    expected_treatment = total * expected_treatment_ratio

    observed_control_pct = observed_control / total
    observed_treatment_pct = observed_treatment / total

    # Chi-square test
    observed = np.array([observed_control, observed_treatment])
    expected = np.array([expected_control, expected_treatment])

    if expected.min() == 0:
        chi2, p_value = 0, 1.0
    else:
        chi2, p_value = stats.chisquare(observed, f_exp=expected)

    has_srm = bool(p_value < 0.05)

    if p_value < 0.001:
        severity = "critical"
        recommendation = (
            "Strong evidence of sample ratio mismatch detected. Investigate traffic allocation "
            "logic and assignment mechanism before trusting any experiment results."
        )
    elif p_value < 0.01:
        severity = "high"
        recommendation = (
            "Significant SRM detected. Review the randomization and assignment code. "
            "Results from this experiment should be interpreted with caution."
        )
    elif p_value < 0.05:
        severity = "medium"
        recommendation = (
            "Possible SRM detected. Monitor closely and consider investigating "
            "the assignment logic if this persists."
        )
    else:
        severity = "none"
        recommendation = "No significant sample ratio mismatch detected. Assignment appears balanced."

    return {
        "expected": {
            "control": round(expected_control_ratio * 100, 1),
            "treatment": round(expected_treatment_ratio * 100, 1),
        },
        "observed": {
            "control": round(observed_control_pct * 100, 1),
            "treatment": round(observed_treatment_pct * 100, 1),
        },
        "control_expected_count": round(expected_control),
        "treatment_expected_count": round(expected_treatment),
        "control_observed_count": observed_control,
        "treatment_observed_count": observed_treatment,
        "chi_square": round(float(chi2), 4),
        "p_value": round(float(p_value), 6),
        "has_srm": has_srm,
        "severity": severity,
        "recommendation": recommendation,
    }


def segment_analysis(
    df: pd.DataFrame,
    segment_column: str,
    variant_column: str,
    metric_column: str,
    control_label: str = "Control",
    treatment_label: str = "Treatment",
    is_conversion: bool = False,
) -> list[dict]:
    """Analyze experiment results segmented by a categorical column."""
    if segment_column not in df.columns:
        return []

    segments = []
    for segment_value in df[segment_column].dropna().unique():
        subset = df[df[segment_column] == segment_value]

        control_data = subset[subset[variant_column] == control_label]
        treatment_data = subset[subset[variant_column] == treatment_label]

        control_n = len(control_data)
        treatment_n = len(treatment_data)

        if control_n < 10 or treatment_n < 10:
            segments.append({
                "segment_name": segment_column,
                "segment_value": str(segment_value),
                "control_sample_size": control_n,
                "treatment_sample_size": treatment_n,
                "control_mean": 0,
                "treatment_mean": 0,
                "relative_uplift": 0,
                "p_value": None,
                "is_significant": False,
                "confidence_level": None,
                "warning": "Insufficient sample size for reliable analysis",
            })
            continue

        if is_conversion:
            ctrl_conv = int(control_data[metric_column].sum())
            treat_conv = int(treatment_data[metric_column].sum())
            result = analyze_conversion(ctrl_conv, control_n, treat_conv, treatment_n)
        else:
            result = analyze_continuous(
                control_data[metric_column].values.astype(float),
                treatment_data[metric_column].values.astype(float),
            )

        segments.append({
            "segment_name": segment_column,
            "segment_value": str(segment_value),
            "control_sample_size": control_n,
            "treatment_sample_size": treatment_n,
            "control_mean": result["control_mean"],
            "treatment_mean": result["treatment_mean"],
            "relative_uplift": result["relative_uplift"],
            "p_value": result["p_value"],
            "is_significant": result["is_significant"],
            "confidence_level": result.get("confidence_level"),
        })

    return segments


def health_check(
    df: pd.DataFrame,
    variant_column: str,
    metric_column: str,
    control_label: str = "Control",
    treatment_label: str = "Treatment",
    expected_ratio: float = 0.5,
) -> dict:
    """Perform experiment health checks."""
    checks = []
    score = 100

    total = len(df)
    control_count = len(df[df[variant_column] == control_label])
    treatment_count = len(df[df[variant_column] == treatment_label])

    # Check 1: Sample size
    if total < 100:
        checks.append({"name": "Sample Size", "status": "critical", "message": f"Only {total} observations. Need at least 100 for basic analysis."})
        score -= 20
    elif total < 1000:
        checks.append({"name": "Sample Size", "status": "warning", "message": f"{total} observations. Consider collecting more data."})
        score -= 10
    else:
        checks.append({"name": "Sample Size", "status": "healthy", "message": f"{total} observations is sufficient."})

    # Check 2: Missing data
    missing = df[metric_column].isnull().sum()
    missing_pct = missing / total * 100 if total > 0 else 0
    if missing_pct > 10:
        checks.append({"name": "Missing Data", "status": "critical", "message": f"{missing_pct:.1f}% missing values in metric column."})
        score -= 15
    elif missing_pct > 5:
        checks.append({"name": "Missing Data", "status": "warning", "message": f"{missing_pct:.1f}% missing values in metric column."})
        score -= 5
    else:
        checks.append({"name": "Missing Data", "status": "healthy", "message": "Missing data is within acceptable range."})

    # Check 3: SRM
    srm = detect_srm(expected_ratio, 1 - expected_ratio, control_count, treatment_count)
    if srm["has_srm"]:
        severity_penalty = {"critical": 20, "high": 15, "medium": 10}.get(srm["severity"], 0)
        checks.append({"name": "Sample Ratio Mismatch", "status": "critical" if srm["severity"] in ("critical", "high") else "warning", "message": f"SRM detected (p={srm['p_value']}). {srm['recommendation']}"})
        score -= severity_penalty
    else:
        checks.append({"name": "Sample Ratio Mismatch", "status": "healthy", "message": "No SRM detected. Traffic allocation is balanced."})

    # Check 4: Variant balance
    control_pct = control_count / total * 100 if total > 0 else 0
    treatment_pct = treatment_count / total * 100 if total > 0 else 0
    if abs(control_pct - 50) > 5:
        checks.append({"name": "Variant Balance", "status": "warning", "message": f"Control: {control_pct:.1f}%, Treatment: {treatment_pct:.1f}%."})
        score -= 5
    else:
        checks.append({"name": "Variant Balance", "status": "healthy", "message": "Variants are well-balanced."})

    # Check 5: Outliers
    numeric_data = pd.to_numeric(df[metric_column], errors="coerce").dropna()
    if len(numeric_data) > 0:
        q1 = numeric_data.quantile(0.25)
        q3 = numeric_data.quantile(0.75)
        iqr = q3 - q1
        outliers = ((numeric_data < q1 - 3 * iqr) | (numeric_data > q3 + 3 * iqr)).sum()
        outlier_pct = outliers / len(numeric_data) * 100
        if outlier_pct > 5:
            checks.append({"name": "Outliers", "status": "warning", "message": f"{outlier_pct:.1f}% extreme outliers detected."})
            score -= 10
        else:
            checks.append({"name": "Outliers", "status": "healthy", "message": "Outlier levels are acceptable."})

    # Check 6: Data freshness (if timestamp column exists)
    timestamp_cols = [c for c in df.columns if 'time' in c.lower() or 'date' in c.lower() or 'timestamp' in c.lower()]
    if timestamp_cols:
        try:
            latest = pd.to_datetime(df[timestamp_cols[0]]).max()
            days_old = (pd.Timestamp.now() - latest).days
            if days_old > 7:
                checks.append({"name": "Data Freshness", "status": "warning", "message": f"Latest data is {days_old} days old."})
                score -= 5
            else:
                checks.append({"name": "Data Freshness", "status": "healthy", "message": f"Data is {days_old} day(s) old. Fresh."})
        except Exception:
            checks.append({"name": "Data Freshness", "status": "info", "message": "Unable to determine data freshness."})

    score = max(0, min(100, score))
    status = "Healthy" if score >= 90 else "Good" if score >= 75 else "Fair" if score >= 60 else "Needs Attention"

    return {
        "score": score,
        "status": status,
        "checks": checks,
    }


def calculate_business_impact(
    control_mean: float,
    treatment_mean: float,
    control_sample_size: int,
    treatment_sample_size: int,
    monthly_revenue_per_user: Optional[float] = None,
    daily_users: Optional[int] = None,
    confidence_level: float = 0.95,
) -> dict:
    """Calculate business impact from experiment results."""
    if control_mean == 0 or control_sample_size == 0:
        return {
            "uplift_percentage": 0,
            "incremental_per_user": 0,
            "estimated_monthly_impact": None,
            "estimated_annual_impact": None,
            "confidence_range": {"lower": 0, "upper": 0},
        }

    uplift_pct = ((treatment_mean - control_mean) / control_mean) * 100
    incremental_per_user = treatment_mean - control_mean

    result = {
        "uplift_percentage": round(uplift_pct, 2),
        "incremental_per_user": round(incremental_per_user, 4),
        "estimated_monthly_impact": None,
        "estimated_annual_impact": None,
        "confidence_range": {"lower": 0, "upper": 0},
    }

    if monthly_revenue_per_user and daily_users:
        monthly_users = daily_users * 30
        estimated_monthly = incremental_per_user * monthly_users * monthly_revenue_per_user
        result["estimated_monthly_impact"] = round(estimated_monthly, 2)
        result["estimated_annual_impact"] = round(estimated_monthly * 12, 2)

        # Confidence range
        se = np.sqrt(
            (control_mean * (1 - control_mean) / control_sample_size if control_mean <= 1 else 0)
            + (treatment_mean * (1 - treatment_mean) / treatment_sample_size if treatment_mean <= 1 else 0)
        )
        z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        lower = (incremental_per_user - z_crit * se) * monthly_users * monthly_revenue_per_user
        upper = (incremental_per_user + z_crit * se) * monthly_users * monthly_revenue_per_user
        result["confidence_range"] = {"lower": round(lower, 2), "upper": round(upper, 2)}

    return result


def generate_insights(
    result: dict,
    srm: dict,
    health: dict,
    experiment: dict,
) -> list[dict]:
    """Generate structured insights from experiment analysis."""
    insights = []

    if result.get("is_significant"):
        direction = "positive" if result["relative_uplift"] > 0 else "negative"
        insights.append({
            "type": "winner",
            "severity": "positive",
            "title": f"Treatment shows statistically significant {direction} impact",
            "description": (
                f"Treatment {'outperforms' if direction == 'positive' else 'underperforms'} control by "
                f"{abs(result['relative_uplift']):.1f}% with {result.get('confidence_level', 0.95) * 100:.0f}% confidence. "
                f"p-value: {result['p_value']:.4f}"
            ),
            "recommendation": "Roll out treatment" if direction == "positive" else "Investigate treatment issues before proceeding",
        })
    else:
        insights.append({
            "type": "no_significance",
            "severity": "info",
            "title": "No statistically significant difference detected",
            "description": (
                f"The observed uplift of {result['relative_uplift']:.1f}% is not statistically significant "
                f"(p={result['p_value']:.4f}). This could mean there is no real difference, or the sample "
                f"size is insufficient."
            ),
            "recommendation": "Continue running the experiment or increase sample size",
        })

    # Power warning
    if result.get("statistical_power") and result["statistical_power"] < 0.5:
        insights.append({
            "type": "low_power",
            "severity": "warning",
            "title": "Low statistical power",
            "description": (
                f"The current statistical power is {result['statistical_power'] * 100:.1f}%, which is below "
                f"the recommended 80%. Results may not reliably detect true differences."
            ),
            "recommendation": "Increase sample size to achieve adequate statistical power",
        })

    # SRM
    if srm.get("has_srm"):
        insights.append({
            "type": "srm",
            "severity": "critical",
            "title": "Sample Ratio Mismatch detected",
            "description": (
                f"Expected {srm['expected']['control']}/{srm['expected']['treatment']}% split but observed "
                f"{srm['observed']['control']}/{srm['observed']['treatment']}%. "
                f"Chi-square p-value: {srm['p_value']:.4f}"
            ),
            "recommendation": srm.get("recommendation", "Investigate assignment logic"),
        })

    # Health warnings
    if health.get("score", 100) < 80:
        failed_checks = [c for c in health.get("checks", []) if c.get("status") in ("critical", "warning")]
        insights.append({
            "type": "health",
            "severity": "warning",
            "title": "Experiment health issues detected",
            "description": f"{len(failed_checks)} health check(s) flagged issues. Score: {health.get('score', 0)}/100",
            "recommendation": "Address health issues before making decisions based on results",
        })

    # Sample size
    total_n = result.get("control_sample_size", 0) + result.get("treatment_sample_size", 0)
    if total_n < 1000:
        insights.append({
            "type": "sample_size",
            "severity": "warning",
            "title": "Small sample size",
            "description": f"Total sample size is {total_n}. Aim for at least 1000 per variant for reliable results.",
            "recommendation": "Extend experiment duration or increase traffic allocation",
        })

    return insights


def generate_copilot_answer(query: str, result: dict, srm: dict, experiment: dict) -> dict:
    """Generate copilot answers from experiment data."""
    query_lower = query.lower()

    if any(w in query_lower for w in ["winner", "won", "winning", "best"]):
        if result.get("is_significant"):
            winner = "Treatment" if result["relative_uplift"] > 0 else "Control"
            return {
                "answer": f"The **{winner}** variant is the winner with a {abs(result['relative_uplift']):.1f}% {'uplift' if result['relative_uplift'] > 0 else 'downlift'} (p={result['p_value']:.4f}).",
                "data": {"winner": winner, "uplift": result["relative_uplift"], "p_value": result["p_value"]},
            }
        return {"answer": "No clear winner yet. The results are not statistically significant. Consider running the experiment longer or increasing sample size.", "data": None}

    if any(w in query_lower for w in ["uplift", "difference", "improvement"]):
        direction = "uplift" if result["relative_uplift"] > 0 else "downlift"
        return {
            "answer": f"The treatment shows a **{abs(result['relative_uplift']):.1f}% {direction}** compared to control. The absolute difference is {abs(result['absolute_difference']):.4f}.",
            "data": {"relative_uplift": result["relative_uplift"], "absolute_difference": result["absolute_difference"]},
        }

    if any(w in query_lower for w in ["significant", "significance", "p-value", "p value"]):
        if result.get("is_significant"):
            return {
                "answer": f"Yes, the result is **statistically significant** with p={result['p_value']:.4f} (confidence: {result.get('confidence_level', 0.95) * 100:.0f}%).",
                "data": {"p_value": result["p_value"], "significant": True},
            }
        return {
            "answer": f"No, the result is **not statistically significant** (p={result['p_value']:.4f}). The observed difference could be due to random chance.",
            "data": {"p_value": result["p_value"], "significant": False},
        }

    if any(w in query_lower for w in ["srm", "sample ratio", "ratio mismatch"]):
        if srm.get("has_srm"):
            obs = srm.get("observed", {})
            exp = srm.get("expected", {})
            obs_str = f"{obs.get('control', '?')}/{obs.get('treatment', '?')}" if obs else "unknown"
            exp_str = f"{exp.get('control', '?')}/{exp.get('treatment', '?')}" if exp else "unknown"
            return {
                "answer": f"⚠️ **Yes, SRM detected.** Observed: {obs_str}% vs expected {exp_str}%. Chi-square p={srm.get('p_value', 'N/A')}.",
                "data": srm,
            }
        return {"answer": "✅ No sample ratio mismatch detected. The traffic allocation is balanced.", "data": srm}

    if any(w in query_lower for w in ["sample size", "how many", "observations"]):
        ctrl_n = result.get("control_sample_size", 0)
        treat_n = result.get("treatment_sample_size", 0)
        return {
            "answer": f"Control group has **{ctrl_n:,}** observations and treatment has **{treat_n:,}**. Total: **{ctrl_n + treat_n:,}**.",
            "data": {"control": ctrl_n, "treatment": treat_n},
        }

    if any(w in query_lower for w in ["what should", "recommend", "next", "do now"]):
        if result.get("is_significant") and result["relative_uplift"] > 0:
            return {"answer": "🎯 **Recommendation: Roll out the treatment.** The results show a statistically significant improvement. Consider a phased rollout.", "data": None}
        if result.get("is_significant") and result["relative_uplift"] < 0:
            return {"answer": "⚠️ **Recommendation: Keep the control.** The treatment shows a significant negative impact. Investigate what went wrong.", "data": None}
        return {"answer": "📊 **Recommendation: Continue the experiment.** Results are not yet significant. Consider extending the test duration or checking if the minimum sample size has been reached.", "data": None}

    if any(w in query_lower for w in ["business", "revenue", "impact", "money"]):
        if result.get("relative_uplift"):
            return {
                "answer": f"The experiment shows a **{result['relative_uplift']:.1f}%** relative change in the metric. To estimate business impact, I'd need your monthly revenue per user and daily active users.",
                "data": {"uplift": result["relative_uplift"]},
            }

    # Default
    return {
        "answer": f"I can help you understand this experiment. You have **{result.get('control_sample_size', 0) + result.get('treatment_sample_size', 0):,}** total observations with a **{result['relative_uplift']:.1f}%** relative change. The result {'is' if result.get('is_significant') else 'is not'} statistically significant (p={result.get('p_value', 1):.4f}). Ask me about the winner, significance, SRM, sample size, or recommendations!",
        "data": result,
    }


def _empty_result(metric_type: str) -> dict:
    return {
        "metric": metric_type,
        "control_mean": 0,
        "treatment_mean": 0,
        "absolute_difference": 0,
        "relative_uplift": 0,
        "control_sample_size": 0,
        "treatment_sample_size": 0,
        "control_median": None,
        "treatment_median": None,
        "control_variance": None,
        "treatment_variance": None,
        "control_std": None,
        "treatment_std": None,
        "p_value": 1.0,
        "confidence_level": 0.95,
        "confidence_interval_lower": 0,
        "confidence_interval_upper": 0,
        "statistical_power": None,
        "mde": None,
        "test_used": None,
        "test_explanation": "Insufficient data for analysis.",
        "is_significant": False,
    }


def _calculate_power(p_control, p_treatment, n_control, n_treatment, alpha=0.05):
    """Calculate statistical power for proportions using normal approximation."""
    p_pool = (p_control * n_control + p_treatment * n_treatment) / (n_control + n_treatment)
    se = np.sqrt(p_pool * (1 - p_pool) * (1 / n_control + 1 / n_treatment))
    if se == 0:
        return None
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    effect = abs(p_treatment - p_control)
    z_beta = (effect / se) - z_alpha
    power = stats.norm.cdf(z_beta)
    return float(power)


def _calculate_mde(n_control, n_treatment, p_control, alpha=0.05, target_power=0.8):
    """Calculate minimum detectable effect for proportions."""
    p_pool = p_control  # assume control proportion
    se = np.sqrt(2 * p_pool * (1 - p_pool) / ((n_control + n_treatment) / 2))
    if se == 0:
        return None
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(target_power)
    mde = (z_alpha + z_beta) * se
    return float(mde)
