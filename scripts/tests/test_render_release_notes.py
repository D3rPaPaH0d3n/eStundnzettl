import importlib.util
import pathlib
import tempfile
import unittest


SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "render_release_notes.py"
SPEC = importlib.util.spec_from_file_location("render_release_notes", SCRIPT)
assert SPEC and SPEC.loader
release_notes = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release_notes)


class RenderReleaseNotesTest(unittest.TestCase):
    def test_github_notes_use_full_native_changelog(self) -> None:
        notes = release_notes.render_notes("5.0.0", "de-DE", "github")

        self.assertIn("Komplett neu gebaut", notes)
        self.assertIn("### Neues Fundament", notes)
        self.assertIn("### PDF-Versand, jetzt richtig gschmeidig", notes)
        self.assertIn("Passt, übergeben!", notes)

    def test_play_notes_use_curated_text_and_fit_limit(self) -> None:
        notes = release_notes.render_notes("5.0.0", "de-DE", "play")

        self.assertTrue(notes.startswith("Echt nativ und gschmeidig"))
        self.assertIn("damit ka Stund verloren geht", notes)
        self.assertLessEqual(len(notes), release_notes.PLAY_LIMIT)

    def test_placeholder_fallback_never_wins_over_native_entry(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            fallback = pathlib.Path(temp_dir) / "302.txt"
            fallback.write_text("v5.0.0\n", encoding="utf-8")

            notes = release_notes.render_notes(
                "5.0.0", "en-US", "play", fallback_path=fallback
            )

        self.assertNotEqual(notes, "v5.0.0")
        self.assertIn("truly native", notes.lower())

    def test_unicode_truncation_stays_within_character_limit(self) -> None:
        notes = release_notes.truncate_at_word("grün 🌲 " * 200, 100)

        self.assertLessEqual(len(notes), 100)
        self.assertTrue(notes.endswith("…"))


if __name__ == "__main__":
    unittest.main()
