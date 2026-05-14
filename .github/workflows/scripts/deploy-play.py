#!/usr/bin/env python3
"""Deploy AAB to Google Play Console (Internal Testing or Open Beta).

Release-Name und Release-Notes werden *dynamisch* abgeleitet:

    Release-Name:
        1. Env-Var RELEASE_NAME (falls gesetzt)
        2. "v<package.json.version> — <erste Zeile aus fastlane de-DE/<code>.txt>"
        3. Fallback: "v<versionCode> (<track>)"

    Release-Notes:
        1. Env-Var RELEASE_NOTES (falls gesetzt) → nur de-DE
        2. fastlane/metadata/android/de-DE/changelogs/<code>.txt   (de-DE)
           + fastlane/metadata/android/en-US/changelogs/<code>.txt (en-US)
        3. Leer (Play Console zeigt dann nichts an)

Das Script räumt absichtlich KEINE anderen Tracks auf — es schreibt
ausschließlich den in PLAY_TRACK angegebenen Track. Nach dem Upload
werden alle Tracks gelesen und bei unerwarteter Cross-Track-Präsenz
des neuen versionCodes wird gewarnt (Hinweis auf Play-Console-seitige
Auto-Promotion).
"""

import json
import os
import pathlib
import re
import sys

from google.oauth2 import service_account
import httplib2
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

PACKAGE = "com.estundnzettl.app"
AAB_PATH = "android/app/build/outputs/bundle/release/app-release.aab"
TRACK = os.environ.get("PLAY_TRACK", "internal")
ALL_TRACKS = ("internal", "alpha", "beta", "production")
RELEASE_NOTES_LIMIT = 500
RELEASE_NAME_LIMIT = 50

# ── Versionsinfo aus Repo lesen ──────────────────────────────────────────
build_gradle = pathlib.Path("android/app/build.gradle").read_text()
match = re.search(r"versionCode\s+(\d+)", build_gradle)
VERSION_CODE = match.group(1) if match else "0"

pkg_json = json.loads(pathlib.Path("package.json").read_text(encoding="utf-8"))
VERSION_NAME = pkg_json.get("version", "0.0.0")

# ── Release-Name ableiten ────────────────────────────────────────────────
FASTLANE_DE = pathlib.Path(
    f"fastlane/metadata/android/de-DE/changelogs/{VERSION_CODE}.txt"
)
FASTLANE_EN = pathlib.Path(
    f"fastlane/metadata/android/en-US/changelogs/{VERSION_CODE}.txt"
)


def truncate(text: str, limit: int = RELEASE_NOTES_LIMIT) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[: limit - 3] + "..."


def first_line(path: pathlib.Path) -> str:
    if not path.exists():
        return ""
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return ""


derived_title = first_line(FASTLANE_DE)
derived_name = (
    f"v{VERSION_NAME} — {derived_title}" if derived_title else f"v{VERSION_NAME}"
)


def fit_release_name(name: str) -> str:
    """Google Play erlaubt maximal 50 Zeichen im Release-Namen."""
    name = name.strip()
    if len(name) <= RELEASE_NAME_LIMIT:
        return name
    fallback = f"v{VERSION_NAME} ({VERSION_CODE})"
    if len(fallback) <= RELEASE_NAME_LIMIT:
        return fallback
    return name[: RELEASE_NAME_LIMIT - 3].rstrip() + "..."


RELEASE_NAME = fit_release_name(os.environ.get("RELEASE_NAME") or derived_name)

# ── Release-Notes ableiten (multi-locale) ────────────────────────────────
release_notes_list = []

env_notes = os.environ.get("RELEASE_NOTES", "").strip()
if env_notes:
    release_notes_list.append(
        {"language": "de-DE", "text": truncate(env_notes)}
    )
    print(f"📝 Release-Notes aus Env-Override ({len(env_notes)} Zeichen)")
else:
    for lang, path in (("de-DE", FASTLANE_DE), ("en-US", FASTLANE_EN)):
        if path.exists():
            text = truncate(path.read_text(encoding="utf-8"))
            release_notes_list.append({"language": lang, "text": text})
            print(f"📝 Release-Notes {lang}: {path} ({len(text)} Zeichen)")
        else:
            print(f"⚠️  Keine Release-Notes für {lang} unter {path}")

print(f"🏷  Release-Name:  {RELEASE_NAME}")
print(f"📦 versionCode:   {VERSION_CODE}")
print(f"🎯 Ziel-Track:    {TRACK}")

# ── Play API Setup ───────────────────────────────────────────────────────
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
creds = service_account.Credentials.from_service_account_file(
    "/tmp/play-key.json", scopes=SCOPES
)
http = AuthorizedHttp(creds, http=httplib2.Http(timeout=300))
service = build("androidpublisher", "v3", http=http, cache_discovery=False)


def snapshot_tracks(edit_id: str) -> dict[str, list[int]]:
    """Liest alle Tracks und gibt {track: [versionCodes…]} zurück."""
    result = {}
    for t in ALL_TRACKS:
        try:
            data = (
                service.edits()
                .tracks()
                .get(packageName=PACKAGE, editId=edit_id, track=t)
                .execute()
            )
            codes = []
            for rel in data.get("releases", []):
                codes.extend(int(c) for c in rel.get("versionCodes", []))
            result[t] = sorted(set(codes))
        except HttpError:
            result[t] = []
    return result


# ── Pre-Snapshot ─────────────────────────────────────────────────────────
pre_edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
pre_snapshot = snapshot_tracks(pre_edit["id"])
service.edits().delete(packageName=PACKAGE, editId=pre_edit["id"]).execute()
print(f"📸 Pre-Upload Snapshot: {pre_snapshot}")

# ── Eigentliches Deployment ──────────────────────────────────────────────
edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
edit_id = edit["id"]
print(f"Edit created: {edit_id}")

media = MediaFileUpload(AAB_PATH, mimetype="application/octet-stream", resumable=True)
bundle = (
    service.edits()
    .bundles()
    .upload(packageName=PACKAGE, editId=edit_id, media_body=media)
    .execute(num_retries=5)
)
vc = bundle["versionCode"]
print(f"Bundle uploaded: versionCode {vc}")

new_release = {
    "versionCodes": [str(vc)],
    "status": "completed",
    "name": RELEASE_NAME,
}
if release_notes_list:
    new_release["releaseNotes"] = release_notes_list

service.edits().tracks().update(
    packageName=PACKAGE,
    editId=edit_id,
    track=TRACK,
    body={"releases": [new_release]},
).execute(num_retries=5)

service.edits().commit(packageName=PACKAGE, editId=edit_id).execute(num_retries=5)
print(f"✅ Deployed versionCode {vc} to track '{TRACK}'!")

# ── Post-Snapshot + Cross-Track-Sanity-Check ─────────────────────────────
post_edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
post_snapshot = snapshot_tracks(post_edit["id"])
service.edits().delete(packageName=PACKAGE, editId=post_edit["id"]).execute()
print(f"📸 Post-Upload Snapshot: {post_snapshot}")

unexpected = []
for t in ALL_TRACKS:
    if t == TRACK:
        continue
    if vc in post_snapshot.get(t, []) and vc not in pre_snapshot.get(t, []):
        unexpected.append(t)

if unexpected:
    print("")
    print("⚠️  ⚠️  ⚠️  WARNUNG: Cross-Track-Propagation erkannt  ⚠️  ⚠️  ⚠️")
    print(
        f"   versionCode {vc} wurde in Track '{TRACK}' hochgeladen, ist "
        f"aber jetzt zusätzlich in: {', '.join(unexpected)}"
    )
    print(
        "   Das deutet auf eine Play-Console-seitige Auto-Promotion-Regel hin "
        "(Testing → Settings → 'Automatic release promotion')."
    )
    print(
        "   Der Upload-Code selbst schreibt nur einen Track — bitte in der "
        "Play Console die Auto-Promotion-Settings prüfen."
    )
    # Kein sys.exit(1) — Deploy war erfolgreich, die Warnung reicht.
else:
    print("✅ Sanity-Check: versionCode nur im erwarteten Track — keine "
          "Cross-Track-Propagation.")

print(f"🎉 Fertig — Release-Name: {RELEASE_NAME}")
