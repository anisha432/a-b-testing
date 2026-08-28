"""PDF Report Generation Service using ReportLab."""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def generate_experiment_report(
    experiment: dict,
    results: list[dict],
    segments: list[dict],
    srm: dict,
    health: dict,
    insights: list[dict],
    output_path: str,
) -> str:
    """Generate a professional PDF experiment report."""
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    story = []

    # Custom styles
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=24, spaceAfter=6, textColor=colors.HexColor("#1a1a2e"))
    subtitle_style = ParagraphStyle("Subtitle2", parent=styles["Normal"], fontSize=14, spaceAfter=20, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=16, spaceBefore=16, spaceAfter=8, textColor=colors.HexColor("#1a1a2e"))
    body_style = ParagraphStyle("Body2", parent=styles["Normal"], fontSize=10, spaceAfter=6, leading=14)
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=9, spaceAfter=4, leading=12, textColor=colors.HexColor("#475569"))

    # Title
    story.append(Paragraph("ExperimentIQ", title_style))
    story.append(Paragraph("A/B Testing &amp; Experimentation Intelligence Report", subtitle_style))
    story.append(Spacer(1, 20))

    # Experiment Overview
    story.append(Paragraph("1. Experiment Overview", heading_style))
    overview_data = [
        ["Experiment Name", experiment.get("name", "N/A")],
        ["Type", experiment.get("experiment_type", "N/A")],
        ["Status", experiment.get("status", "N/A")],
        ["Owner", experiment.get("owner", "N/A")],
        ["Primary Metric", experiment.get("primary_metric", "N/A")],
        ["Start Date", str(experiment.get("start_date", "N/A"))],
        ["End Date", str(experiment.get("end_date", "N/A"))],
    ]
    story.append(_make_table(overview_data))
    story.append(Spacer(1, 12))

    # Hypothesis
    if experiment.get("hypothesis"):
        story.append(Paragraph("2. Hypothesis", heading_style))
        story.append(Paragraph(experiment["hypothesis"], body_style))
        story.append(Spacer(1, 12))

    # KPI Results
    story.append(Paragraph("3. KPI Results", heading_style))
    if results:
        for r in results:
            story.append(Paragraph(f"<b>Metric: {r.get('metric_name', 'N/A')}</b>", body_style))
            kpi_data = [
                ["Measure", "Control", "Treatment"],
                ["Mean", f"{r.get('control_mean', 0):.4f}", f"{r.get('treatment_mean', 0):.4f}"],
                ["Sample Size", f"{r.get('control_sample_size', 0):,}", f"{r.get('treatment_sample_size', 0):,}"],
                ["Relative Uplift", f"{r.get('relative_uplift', 0):.2f}%", ""],
                ["Significant", "Yes" if r.get("is_significant") else "No", ""],
            ]
            story.append(_make_table(kpi_data))
            story.append(Spacer(1, 8))
    else:
        story.append(Paragraph("No analysis results available.", body_style))

    # Statistical Analysis
    story.append(Paragraph("4. Statistical Analysis", heading_style))
    if results:
        r = results[0]
        stat_data = [
            ["Test Used", r.get("test_used", "N/A")],
            ["P-value", f"{r.get('p_value', 'N/A')}"],
            ["Confidence Level", f"{r.get('confidence_level', 0) * 100:.0f}%"],
            ["Confidence Interval", f"[{r.get('confidence_interval_lower', 'N/A')}, {r.get('confidence_interval_upper', 'N/A')}]"],
            ["Statistical Power", f"{r.get('statistical_power', 'N/A')}"],
            ["MDE", f"{r.get('mde', 'N/A')}%"],
        ]
        story.append(_make_table(stat_data))
        if r.get("test_explanation"):
            story.append(Spacer(1, 6))
            story.append(Paragraph(f"<i>{r['test_explanation']}</i>", small_style))
    story.append(Spacer(1, 12))

    # SRM Analysis
    story.append(Paragraph("5. SRM Analysis", heading_style))
    if srm:
        srm_data = [
            ["Metric", "Value"],
            ["Expected Control", f"{srm.get('expected', {}).get('control', 'N/A')}%"],
            ["Expected Treatment", f"{srm.get('expected', {}).get('treatment', 'N/A')}%"],
            ["Observed Control", f"{srm.get('observed', {}).get('control', 'N/A')}%"],
            ["Observed Treatment", f"{srm.get('observed', {}).get('treatment', 'N/A')}%"],
            ["Chi-Square", f"{srm.get('chi_square', 'N/A')}"],
            ["P-value", f"{srm.get('p_value', 'N/A')}"],
            ["SRM Detected", "Yes" if srm.get("has_srm") else "No"],
        ]
        story.append(_make_table(srm_data))
    story.append(Spacer(1, 12))

    # Segment Analysis
    if segments:
        story.append(Paragraph("6. Segment Analysis", heading_style))
        seg_header = ["Segment", "Value", "Control", "Treatment", "Uplift", "Significant"]
        seg_rows = [seg_header]
        for s in segments:
            seg_rows.append([
                s.get("segment_name", ""),
                s.get("segment_value", ""),
                f"{s.get('control_mean', 0):.4f} (n={s.get('control_sample_size', 0)})",
                f"{s.get('treatment_mean', 0):.4f} (n={s.get('treatment_sample_size', 0)})",
                f"{s.get('relative_uplift', 0):.2f}%",
                "Yes" if s.get("is_significant") else "No",
            ])
        story.append(_make_table(seg_rows))
        story.append(Spacer(1, 12))

    # Health
    story.append(Paragraph("7. Experiment Health", heading_style))
    if health:
        story.append(Paragraph(f"<b>Health Score: {health.get('score', 0)}/100 — {health.get('status', 'Unknown')}</b>", body_style))
        for check in health.get("checks", []):
            icon = "✓" if check["status"] == "healthy" else "⚠" if check["status"] == "warning" else "✗"
            story.append(Paragraph(f"{icon} {check['name']}: {check['message']}", small_style))
    story.append(Spacer(1, 12))

    # Insights
    story.append(Paragraph("8. Insights &amp; Recommendations", heading_style))
    if insights:
        for ins in insights:
            story.append(Paragraph(f"<b>{ins.get('title', '')}</b>", body_style))
            story.append(Paragraph(ins.get("description", ""), small_style))
            if ins.get("recommendation"):
                story.append(Paragraph(f"<i>Recommendation: {ins['recommendation']}</i>", small_style))
            story.append(Spacer(1, 4))
    else:
        story.append(Paragraph("No insights available. Run analysis first.", body_style))

    story.append(Spacer(1, 30))
    story.append(Paragraph("Generated by ExperimentIQ — AI-Powered A/B Testing &amp; Experimentation Intelligence Platform", subtitle_style))

    doc.build(story)
    return output_path


def _make_table(data: list) -> Table:
    """Create a styled table."""
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table
