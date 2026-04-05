#!/usr/bin/env python3
"""Promote an existing release from one Play Store track to another.

Usage:
    PLAY_FROM=internal PLAY_TO=beta python3 promote-track.py
    PLAY_FROM=internal PLAY_TO=beta VERSION_CODE=178 python3 promote-track.py

Env vars:
    PLAY_FROM     Source track (default: internal)
    PLAY_TO       Target track (default: beta)
    VERSION_CODE  Optional: specific versionCode to promote.
                  If omitted, the highest completed release on PLAY_FROM is used.
    RELEASE_NAME  Optional: custom release name for the target track.
    PLAY_KEY      Optional: path to service account JSON (default /tmp/play-key.json)
"""

import os
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

PACKAGE = "com.estundnzettl.app"
FROM_TRACK = os.environ.get("PLAY_FROM", "internal")
TO_TRACK = os.environ.get("PLAY_TO", "beta")
VERSION_CODE = os.environ.get("VERSION_CODE", "").strip()
RELEASE_NAME_OVERRIDE = os.environ.get("RELEASE_NAME", "").strip()
KEY_PATH = os.environ.get("PLAY_KEY", "/tmp/play-key.json")

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
creds = service_account.Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
edit_id = edit["id"]
print(f"📝 Edit created: {edit_id}")

# 1. Source Track auslesen
try:
    source = service.edits().tracks().get(
        packageName=PACKAGE, editId=edit_id, track=FROM_TRACK
    ).execute()
except HttpError as e:
    print(f"❌ Source track '{FROM_TRACK}' nicht gefunden: {e}")
    service.edits().delete(packageName=PACKAGE, editId=edit_id).execute()
    sys.exit(1)

source_releases = source.get("releases", [])
if not source_releases:
    print(f"❌ Keine Releases im Track '{FROM_TRACK}'")
    service.edits().delete(packageName=PACKAGE, editId=edit_id).execute()
    sys.exit(1)

# 2. Passenden Release finden
target_release = None
if VERSION_CODE:
    for rel in source_releases:
        codes = [str(c) for c in rel.get("versionCodes", [])]
        if VERSION_CODE in codes:
            target_release = rel
            break
    if not target_release:
        print(f"❌ versionCode {VERSION_CODE} nicht im Track '{FROM_TRACK}' gefunden")
        service.edits().delete(packageName=PACKAGE, editId=edit_id).execute()
        sys.exit(1)
else:
    # Höchsten completed Release nehmen
    completed = [r for r in source_releases if r.get("status") == "completed"]
    if not completed:
        print(f"❌ Keine completed Releases im Track '{FROM_TRACK}'")
        service.edits().delete(packageName=PACKAGE, editId=edit_id).execute()
        sys.exit(1)
    target_release = max(
        completed,
        key=lambda r: max(int(c) for c in r.get("versionCodes", ["0"]))
    )

version_codes = target_release.get("versionCodes", [])
release_name = RELEASE_NAME_OVERRIDE or target_release.get("name", f"Promoted from {FROM_TRACK}")
release_notes = target_release.get("releaseNotes", [])

print(f"🎯 Promoting versionCode(s) {version_codes} from '{FROM_TRACK}' → '{TO_TRACK}'")
print(f"   Release name: {release_name}")

# 3. Target Track überschreiben (ersetzt den ganzen releases Array)
new_release = {
    "versionCodes": version_codes,
    "status": "completed",
    "name": release_name,
}
if release_notes:
    new_release["releaseNotes"] = release_notes

service.edits().tracks().update(
    packageName=PACKAGE,
    editId=edit_id,
    track=TO_TRACK,
    body={"releases": [new_release]}
).execute()

# 4. Commit
service.edits().commit(packageName=PACKAGE, editId=edit_id).execute()
print(f"✅ versionCode(s) {version_codes} erfolgreich in Track '{TO_TRACK}' promoted!")
