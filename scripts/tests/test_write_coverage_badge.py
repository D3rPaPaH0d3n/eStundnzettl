import importlib.util
import pathlib
import tempfile
import unittest


SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "write_coverage_badge.py"
SPEC = importlib.util.spec_from_file_location("write_coverage_badge", SCRIPT)
assert SPEC and SPEC.loader
badge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(badge)

REPORT = """<?xml version="1.0" encoding="UTF-8"?>
<report name="Kover Gradle Plugin XML report for :core">
  <package name="com/estundnzettl/core/calc">
    <counter type="LINE" missed="1" covered="1"/>
  </package>
  <counter type="INSTRUCTION" missed="10" covered="90"/>
  <counter type="LINE" missed="25" covered="75"/>
</report>
"""


class WriteCoverageBadgeTest(unittest.TestCase):
    def test_uses_report_level_line_counter(self) -> None:
        self.assertAlmostEqual(badge.line_coverage_percent(REPORT), 75.0)

    def test_empty_report_counts_as_zero(self) -> None:
        empty = '<report name="x"><counter type="LINE" missed="0" covered="0"/></report>'
        self.assertEqual(badge.line_coverage_percent(empty), 0.0)

    def test_missing_line_counter_is_an_error(self) -> None:
        with self.assertRaises(ValueError):
            badge.line_coverage_percent('<report name="x"/>')

    def test_color_thresholds(self) -> None:
        self.assertEqual(badge.badge_color(80.0), "#2ea44f")
        self.assertEqual(badge.badge_color(60.0), "#d29922")
        self.assertEqual(badge.badge_color(59.9), "#6b7280")

    def test_writes_badge_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            report = pathlib.Path(tmp) / "report.xml"
            output = pathlib.Path(tmp) / "badges" / "coverage.svg"
            report.write_text(REPORT, encoding="utf-8")
            self.assertEqual(badge.main(["write_coverage_badge.py", str(report), str(output)]), 0)
            svg = output.read_text(encoding="utf-8")
            self.assertIn('aria-label="coverage: 75.0%"', svg)
            self.assertIn('fill="#d29922"', svg)


if __name__ == "__main__":
    unittest.main()
