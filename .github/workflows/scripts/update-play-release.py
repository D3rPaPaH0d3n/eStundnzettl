#!/usr/bin/env python3
"""Update notes and name of an existing Google Play track release."""

from __future__ import annotations

import argparse
import copy
import pathlib
import re
import sys
from typing import Any


REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from render_release_notes import render_notes  # noqa: E402


PACKAGE = "com.estundnzettl.app"
RELEASE_NAME_LIMIT = 50


def derive_release_name(
    version_name: str,
    version_code: str,
    german_notes: str,
    override: str = "",
) -> str:
    if override.strip():
        candidate = override.strip()
    else:
        title = next((line.strip() for line in german_notes.splitlines() if line.strip()), "")
        title = re.sub(
            rf"^v?{re.escape(version_name)}\s*(?:—|–|-|:)\s*",
            "",
            title,
            flags=re.IGNORECASE,
        ).strip()
        candidate = f"v{version_name} — {title}" if title else f"v{version_name}"

    if len(candidate) <= RELEASE_NAME_LIMIT:
        return candidate
    return f"v{version_name} ({version_code})"


def update_track_release(
    track_data: dict[str, Any],
    version_code: str,
    release_name: str,
    release_notes: list[dict[str, str]],
) -> dict[str, Any]:
    updated = copy.deepcopy(track_data)
    releases = updated.get("releases", [])
    matches = [
        release
        for release in releases
        if version_code in [str(code) for code in release.get("versionCodes", [])]
    ]
    if len(matches) != 1:
        raise ValueError(
            f"Expected exactly one release containing versionCode {version_code}, "
            f"found {len(matches)}"
        )

    matches[0]["name"] = release_name
    matches[0]["releaseNotes"] = release_notes
    return updated


def release_for_code(track_data: dict[str, Any], version_code: str) -> dict[str, Any]:
    matches = [
        release
        for release in track_data.get("releases", [])
        if version_code in [str(code) for code in release.get("versionCodes", [])]
    ]
    if len(matches) != 1:
        raise ValueError(
            f"Expected exactly one release containing versionCode {version_code}, "
            f"found {len(matches)}"
        )
    return matches[0]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--track", required=True)
    parser.add_argument("--version-code", required=True)
    parser.add_argument("--version-name", required=True)
    parser.add_argument("--release-name", default="")
    parser.add_argument("--service-account", default="/tmp/play-key.json")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    de_fallback = REPO_ROOT / f"fastlane/metadata/android/de-DE/changelogs/{args.version_code}.txt"
    en_fallback = REPO_ROOT / f"fastlane/metadata/android/en-US/changelogs/{args.version_code}.txt"
    german_notes = render_notes(
        args.version_name, "de-DE", "play", fallback_path=de_fallback
    )
    english_notes = render_notes(
        args.version_name, "en-US", "play", fallback_path=en_fallback
    )
    notes = [
        {"language": "de-DE", "text": german_notes},
        {"language": "en-US", "text": english_notes},
    ]
    name = derive_release_name(
        args.version_name,
        args.version_code,
        german_notes,
        args.release_name,
    )

    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    credentials = service_account.Credentials.from_service_account_file(
        args.service_account,
        scopes=["https://www.googleapis.com/auth/androidpublisher"],
    )
    service = build(
        "androidpublisher", "v3", credentials=credentials, cache_discovery=False
    )

    print(
        f"Updating {PACKAGE} track '{args.track}', versionCode {args.version_code}: "
        f"{name}"
    )
    print(f"Release notes: de-DE {len(german_notes)} chars, en-US {len(english_notes)} chars")

    edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
    edit_id = edit["id"]
    try:
        current = (
            service.edits()
            .tracks()
            .get(packageName=PACKAGE, editId=edit_id, track=args.track)
            .execute()
        )
        body = update_track_release(current, args.version_code, name, notes)
        service.edits().tracks().update(
            packageName=PACKAGE,
            editId=edit_id,
            track=args.track,
            body=body,
        ).execute(num_retries=5)
        service.edits().commit(packageName=PACKAGE, editId=edit_id).execute(
            num_retries=5
        )
        edit_id = ""
    finally:
        if edit_id:
            service.edits().delete(packageName=PACKAGE, editId=edit_id).execute()

    verify_edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
    try:
        verified_track = (
            service.edits()
            .tracks()
            .get(
                packageName=PACKAGE,
                editId=verify_edit["id"],
                track=args.track,
            )
            .execute()
        )
        verified = release_for_code(verified_track, args.version_code)
    finally:
        service.edits().delete(
            packageName=PACKAGE, editId=verify_edit["id"]
        ).execute()

    if verified.get("name") != name or verified.get("releaseNotes") != notes:
        raise RuntimeError("Play Console verification did not return the requested metadata")

    print("Release metadata updated and verified successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
