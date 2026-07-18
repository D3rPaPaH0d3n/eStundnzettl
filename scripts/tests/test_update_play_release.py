import importlib.util
import pathlib
import unittest


SCRIPT = (
    pathlib.Path(__file__).resolve().parents[2]
    / ".github/workflows/scripts/update-play-release.py"
)
SPEC = importlib.util.spec_from_file_location("update_play_release", SCRIPT)
assert SPEC and SPEC.loader
update_play = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(update_play)


class UpdatePlayReleaseTest(unittest.TestCase):
    def test_only_target_release_metadata_changes(self) -> None:
        track = {
            "track": "beta",
            "releases": [
                {
                    "name": "old",
                    "versionCodes": ["301", "302"],
                    "status": "completed",
                    "countryTargeting": {"countries": ["AT"]},
                    "releaseNotes": [{"language": "de-DE", "text": "v5.0.0"}],
                }
            ],
        }
        notes = [
            {"language": "de-DE", "text": "Echt nativ"},
            {"language": "en-US", "text": "Truly native"},
        ]

        result = update_play.update_track_release(track, "302", "new", notes)

        self.assertEqual(result["releases"][0]["name"], "new")
        self.assertEqual(result["releases"][0]["releaseNotes"], notes)
        self.assertEqual(result["releases"][0]["status"], "completed")
        self.assertEqual(result["releases"][0]["versionCodes"], ["301", "302"])
        self.assertEqual(
            result["releases"][0]["countryTargeting"], {"countries": ["AT"]}
        )
        self.assertEqual(track["releases"][0]["name"], "old")

    def test_release_name_does_not_duplicate_version(self) -> None:
        name = update_play.derive_release_name(
            "5.0.0", "302", "v5.0.0 — Echt nativ und gschmeidig 🚀"
        )

        self.assertEqual(name, "v5.0.0 — Echt nativ und gschmeidig 🚀")


if __name__ == "__main__":
    unittest.main()
