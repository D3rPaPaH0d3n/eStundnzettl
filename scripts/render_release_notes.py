#!/usr/bin/env python3
"""Render GitHub and Google Play release notes from the native changelog."""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from typing import Any


REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
CHANGELOG_DIR = REPO_ROOT / "native/app/src/main/assets/changelog"
PLAY_LIMIT = 500


def language_key(language: str) -> str:
    normalized = language.lower()
    if normalized in {"de", "de-de", "de-at"}:
        return "de"
    if normalized in {"en", "en-us", "en-gb"}:
        return "en"
    raise ValueError(f"Unsupported language: {language}")


def load_entry(version: str, language: str) -> dict[str, Any] | None:
    lang = language_key(language)
    path = CHANGELOG_DIR / f"changelog.{lang}.json"
    entries = json.loads(path.read_text(encoding="utf-8"))
    return next((entry for entry in entries if entry.get("version") == version), None)


def render_github(entry: dict[str, Any], language: str) -> str:
    lines: list[str] = []
    title = str(entry.get("title", "")).strip()
    date = str(entry.get("date", "")).strip()
    if title:
        lines.append(f"**{title}**")
    if date:
        label = "Veröffentlicht" if language_key(language) == "de" else "Released"
        lines.append(f"_{label}: {date}_")
    lines.append("")

    for section in entry.get("sections", []):
        section_title = str(section.get("title", "")).strip()
        if section_title:
            lines.append(f"### {section_title}")
        for item in section.get("items", []):
            text = str(item).strip()
            if text:
                lines.append(f"- {text}")
        lines.append("")

    return "\n".join(lines).strip()


def is_placeholder(text: str) -> bool:
    return re.fullmatch(r"v?\d+(?:\.\d+){1,3}", text.strip(), flags=re.IGNORECASE) is not None


def truncate_at_word(text: str, limit: int = PLAY_LIMIT) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    shortened = text[: limit - 1].rstrip()
    boundary = shortened.rfind(" ")
    if boundary >= int(limit * 0.75):
        shortened = shortened[:boundary].rstrip()
    return shortened + "…"


def generated_play_text(entry: dict[str, Any]) -> str:
    lines = [str(entry.get("title", "")).strip()]
    for section in entry.get("sections", []):
        title = str(section.get("title", "")).strip()
        if title:
            lines.append(f"• {title}")
    return "\n".join(line for line in lines if line)


def render_play(entry: dict[str, Any] | None, fallback_text: str = "") -> str:
    if entry:
        curated = str(entry.get("playStoreText", "")).strip()
        if curated:
            return truncate_at_word(curated)

    fallback_text = fallback_text.strip()
    if fallback_text and not is_placeholder(fallback_text):
        return truncate_at_word(fallback_text)

    if entry:
        generated = generated_play_text(entry)
        if generated:
            return truncate_at_word(generated)

    raise ValueError("No meaningful release notes found")


def render_notes(
    version: str,
    language: str,
    output_format: str,
    fallback_path: pathlib.Path | None = None,
) -> str:
    entry = load_entry(version, language)
    fallback_text = ""
    if fallback_path and fallback_path.exists():
        fallback_text = fallback_path.read_text(encoding="utf-8")

    if output_format == "github":
        if entry:
            return render_github(entry, language)
        if fallback_text.strip() and not is_placeholder(fallback_text):
            return fallback_text.strip()
        raise ValueError(f"No changelog entry found for v{version} ({language})")

    return render_play(entry, fallback_text)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--language", required=True)
    parser.add_argument("--format", choices=("github", "play"), required=True)
    parser.add_argument("--fallback", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    args = parse_args(argv or sys.argv[1:])
    try:
        notes = render_notes(
            version=args.version,
            language=args.language,
            output_format=args.format,
            fallback_path=args.fallback,
        )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Could not render release notes: {error}", file=sys.stderr)
        return 1

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(notes + "\n", encoding="utf-8")
    else:
        print(notes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
