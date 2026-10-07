#!/usr/bin/env python3
"""Render the repo-local coverage badge from a Kover (JaCoCo-format) XML report.

Usage:
    python3 scripts/write_coverage_badge.py [report.xml] [badge.svg]

Defaults point at the :core module's Kover report and badges/coverage.svg.
"""

from __future__ import annotations

import pathlib
import sys
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_REPORT = REPO_ROOT / "native/core/build/reports/kover/report.xml"
DEFAULT_OUTPUT = REPO_ROOT / "badges/coverage.svg"
LABEL = "coverage"


def line_coverage_percent(report_xml: str) -> float:
    """Return the report-wide LINE coverage in percent (0.0 when empty)."""
    root = ET.fromstring(report_xml)
    for counter in root.findall("counter"):
        if counter.get("type") == "LINE":
            missed = int(counter.get("missed", "0"))
            covered = int(counter.get("covered", "0"))
            total = missed + covered
            return covered * 100.0 / total if total else 0.0
    raise ValueError("Report has no report-level LINE counter")


def badge_color(percent: float) -> str:
    if percent >= 80:
        return "#2ea44f"
    if percent >= 60:
        return "#d29922"
    return "#6b7280"


def render_badge(percent: float, label: str = LABEL) -> str:
    value = f"{percent:.1f}%"
    label_width = max(72, len(label) * 7 + 16)
    value_width = max(54, len(value) * 8 + 14)
    width = label_width + value_width
    title = escape(f"{label}: {value}", {'"': "&quot;"})
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="28" role="img" aria-label="{title}">
  <title>{title}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
    <stop offset="1" stop-opacity=".12"/>
  </linearGradient>
  <clipPath id="r"><rect width="{width}" height="28" rx="6" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="{label_width}" height="28" fill="#24292f"/>
    <rect x="{label_width}" width="{value_width}" height="28" fill="{badge_color(percent)}"/>
    <rect width="{width}" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11" font-weight="700">
    <text x="{label_width / 2:g}" y="18">{escape(label)}</text>
    <text x="{label_width + value_width / 2:g}" y="18">{escape(value)}</text>
  </g>
</svg>
"""


def main(argv: list[str]) -> int:
    report = pathlib.Path(argv[1]) if len(argv) > 1 else DEFAULT_REPORT
    output = pathlib.Path(argv[2]) if len(argv) > 2 else DEFAULT_OUTPUT
    percent = line_coverage_percent(report.read_text(encoding="utf-8"))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_badge(percent), encoding="utf-8")
    print(f"Wrote {output} ({percent:.1f}% lines coverage)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
