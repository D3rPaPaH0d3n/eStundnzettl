#!/usr/bin/env python3
"""Deploy AAB to Google Play Console (Internal Testing or Open Beta)."""

import os
import re
import json
import pathlib
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

PACKAGE = "com.estundnzettl.app"
AAB_PATH = "android/app/build/outputs/bundle/release/app-release.aab"
# Track: 'internal' (default), 'beta' (Open Testing), 'alpha' (Closed Testing), 'production'
TRACK = os.environ.get("PLAY_TRACK", "internal")

with open("android/app/build.gradle") as f:
    content = f.read()
match = re.search(r'versionCode\s+(\d+)', content)
VERSION_CODE = match.group(1) if match else "0"

# ── Release-Metadaten laden ──────────────────────────────────
# Priorität: Env-Var > release-meta.json > Fallback
meta_path = pathlib.Path(".github/release-meta.json")
meta = {}
if meta_path.exists():
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        print(f"📋 release-meta.json geladen: {meta.get('releaseName', '(kein Name)')}")
    except Exception as e:
        print(f"⚠️ release-meta.json konnte nicht gelesen werden: {e}")

RELEASE_NAME = os.environ.get("RELEASE_NAME") or meta.get("releaseName") or f"v{VERSION_CODE} ({TRACK})"
RELEASE_NOTES = os.environ.get("RELEASE_NOTES") or meta.get("releaseNotes") or ""

# Play Console Limit: 500 Zeichen für releaseNotes
if len(RELEASE_NOTES) > 500:
    RELEASE_NOTES = RELEASE_NOTES[:497] + "..."

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
creds = service_account.Credentials.from_service_account_file(
    "/tmp/play-key.json", scopes=SCOPES
)
service = build("androidpublisher", "v3", credentials=creds)

edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
edit_id = edit["id"]
print(f"Edit created: {edit_id}")

media = MediaFileUpload(AAB_PATH, mimetype="application/octet-stream", resumable=True)
bundle = service.edits().bundles().upload(
    packageName=PACKAGE, editId=edit_id, media_body=media
).execute()
vc = bundle["versionCode"]
print(f"Bundle uploaded: versionCode {vc}")

try:
    track = service.edits().tracks().get(
        packageName=PACKAGE, editId=edit_id, track=TRACK
    ).execute()
    releases = track.get("releases", [])
except HttpError:
    releases = []

new_release = {
    "versionCodes": [str(vc)],
    "status": "completed",
    "name": RELEASE_NAME,
}

if RELEASE_NOTES:
    new_release["releaseNotes"] = [{"language": "de-DE", "text": RELEASE_NOTES}]
    print(f"📝 Versionshinweise ({len(RELEASE_NOTES)} Zeichen) werden mitgesendet")

service.edits().tracks().update(
    packageName=PACKAGE, editId=edit_id, track=TRACK,
    body={"releases": [new_release]}
).execute()

commit = service.edits().commit(packageName=PACKAGE, editId=edit_id).execute()
print(f"✅ Deployed versionCode {vc} to track '{TRACK}'!")
print(f"   Release-Name: {RELEASE_NAME}")
