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
    def test_520_notes_cover_time_off_account_and_letterhead(self) -> None:
        github_notes = release_notes.render_notes("5.2.0", "de-DE", "github")
        play_notes = release_notes.render_notes("5.2.0", "de-DE", "play")

        self.assertIn("Überstunden wandern mit", github_notes)
        self.assertIn("Schaut aus wia vom Büro", github_notes)
        self.assertIn("A bissl Feinschliff", github_notes)
        self.assertTrue(play_notes.startswith("Ihr habt's gwünscht, i hob's gmocht"))
        self.assertIn("schreibt's ma weiter, wos enk fehlt! – Markus", play_notes)
        self.assertLessEqual(len(play_notes), release_notes.PLAY_LIMIT)

    def test_520_english_notes_render_for_play_and_github(self) -> None:
        github_notes = release_notes.render_notes("5.2.0", "en-US", "github")
        play_notes = release_notes.render_notes("5.2.0", "en-US", "play")

        self.assertIn("Overtime carries over", github_notes)
        self.assertIn("Looks like it came from the office", github_notes)
        self.assertIn("keep telling me what you're missing! – Markus", play_notes)
        self.assertLessEqual(len(play_notes), release_notes.PLAY_LIMIT)

    def test_520_fastlane_notes_match_curated_play_text(self) -> None:
        for language in ("de-DE", "en-US"):
            fastlane = release_notes.REPO_ROOT / f"fastlane/metadata/android/{language}/changelogs/314.txt"
            self.assertEqual(
                fastlane.read_text(encoding="utf-8").strip(),
                release_notes.render_notes("5.2.0", language, "play"),
            )

    def test_511_notes_cover_backup_folder_timer_and_data_safety(self) -> None:
        github_notes = release_notes.render_notes("5.1.1", "de-DE", "github")
        play_notes = release_notes.render_notes("5.1.1", "de-DE", "play")

        self.assertIn("Dein Backup, dein Ordner", github_notes)
        self.assertIn("Zeiten, die zampassen", github_notes)
        self.assertIn("Daten sicher, Start stabil", github_notes)
        self.assertIn("So liegt dein Backup genau dort, wo's hinghört", play_notes)
        self.assertLessEqual(len(play_notes), release_notes.PLAY_LIMIT)

    def test_511_english_notes_render_for_play_and_github(self) -> None:
        github_notes = release_notes.render_notes("5.1.1", "en-US", "github")
        play_notes = release_notes.render_notes("5.1.1", "en-US", "play")

        self.assertIn("Your backup, your folder", github_notes)
        self.assertIn("Safe data, steady start", github_notes)
        self.assertIn("So your backup ends up exactly where it belongs", play_notes)
        self.assertLessEqual(len(play_notes), release_notes.PLAY_LIMIT)

    def test_510_notes_cover_cloud_restore_and_backup_safeguards(self) -> None:
        github_notes = release_notes.render_notes("5.1.0", "de-DE", "github")
        play_notes = release_notes.render_notes("5.1.0", "de-DE", "play")

        self.assertIn("Du siehst, was zurückkommt", github_notes)
        self.assertIn("Dein Backup bleibt, wie's ghört", github_notes)
        self.assertIn("Diagnose für den Hausmasta", github_notes)
        self.assertIn("So kommt beim Handywechsel wirklich alles mit", play_notes)
        self.assertLessEqual(len(play_notes), release_notes.PLAY_LIMIT)

    def test_510_english_notes_render_for_play_and_github(self) -> None:
        github_notes = release_notes.render_notes("5.1.0", "en-US", "github")
        play_notes = release_notes.render_notes("5.1.0", "en-US", "play")

        self.assertIn("You see what comes back", github_notes)
        self.assertIn("Diagnostics for expert mode", github_notes)
        self.assertIn("So everything really comes along when you switch phones", play_notes)
        self.assertLessEqual(len(play_notes), release_notes.PLAY_LIMIT)

    def test_502_notes_cover_project_and_activity_code_improvements(self) -> None:
        github_notes = release_notes.render_notes("5.0.2", "de-DE", "github")
        play_notes = release_notes.render_notes("5.0.2", "de-DE", "play")

        self.assertIn("Projekte wieder glei bei der Hand", github_notes)
        self.assertIn("Tätigkeitscodes kompakt & ordentlich", github_notes)
        self.assertIn("So geht beim Eintragen nix mehr verloren", play_notes)
        self.assertLessEqual(len(play_notes), release_notes.PLAY_LIMIT)

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
