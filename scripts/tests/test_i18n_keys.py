"""Consistency checks for the native app's translation files.

Ported from the former Vitest smoke test (src/i18n/__tests__/i18n.smoke.test.ts):
every static t("...") key used by the Kotlin code must exist in German and
English, and both languages must have the same key tree.
"""

import json
import pathlib
import re
import unittest


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
I18N_DIR = REPO_ROOT / "native/app/src/main/assets/i18n"
KOTLIN_ROOT = REPO_ROOT / "native/app/src/main/kotlin"
LITERAL_CALL = re.compile(r'\b(?:[A-Za-z_]\w*\.)?t\(\s*"([^"]+)"')


def flatten(node: dict, prefix: str = "") -> dict:
    keys = {}
    for name, value in node.items():
        path = f"{prefix}.{name}" if prefix else name
        if isinstance(value, dict):
            keys.update(flatten(value, path))
        else:
            keys[path] = value
    return keys


def load(language: str) -> dict:
    return flatten(json.loads((I18N_DIR / f"{language}.json").read_text(encoding="utf-8")))


class I18nKeysTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.de = load("de")
        cls.en = load("en")

    def test_de_and_en_have_identical_key_trees(self) -> None:
        self.assertEqual(sorted(set(self.en) - set(self.de)), [], "missing in de.json")
        self.assertEqual(sorted(set(self.de) - set(self.en)), [], "missing in en.json")

    def test_every_value_is_a_non_empty_string(self) -> None:
        for language, keys in (("de", self.de), ("en", self.en)):
            bad = sorted(k for k, v in keys.items() if not isinstance(v, str) or not v)
            self.assertEqual(bad, [], f"empty or non-string values in {language}.json")

    def test_plural_keys_come_in_pairs(self) -> None:
        for language, keys in (("de", self.de), ("en", self.en)):
            unpaired = sorted(
                k for k in keys
                if (k.endswith("_one") and k[:-4] + "_other" not in keys)
                or (k.endswith("_other") and k[:-6] + "_one" not in keys)
            )
            self.assertEqual(unpaired, [], f"incomplete plural pairs in {language}.json")

    def test_every_static_key_used_by_the_kotlin_app_exists(self) -> None:
        missing = set()
        for source in sorted(KOTLIN_ROOT.rglob("*.kt")):
            text = source.read_text(encoding="utf-8")
            for match in LITERAL_CALL.finditer(text):
                key = match.group(1)
                if "$" in key:
                    continue
                direct = key in self.de and key in self.en
                plural = all(
                    f"{key}{suffix}" in keys
                    for suffix in ("_one", "_other")
                    for keys in (self.de, self.en)
                )
                if not direct and not plural:
                    missing.add(f"{key} ({source.relative_to(KOTLIN_ROOT)})")
        self.assertEqual(sorted(missing), [])


if __name__ == "__main__":
    unittest.main()
