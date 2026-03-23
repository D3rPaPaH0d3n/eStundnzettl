#!/usr/bin/env python3
"""Deploy AAB to Google Play Console Internal Testing track."""
import os
import re
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

PACKAGE = "com.estundnzettl.app"
AAB_PATH = "android/app/build/outputs/bundle/release/app-release.aab"

# Read versionCode from build.gradle
with open("android/app/build.gradle") as f:
    content = f.read()
match = re.search(r'versionCode\s+(\d+)', content)
vc = match.group(1) if match else "0"

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "/tmp/play-key.json")
creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

# Create edit
edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
edit_id = edit["id"]
print(f"Edit created: {edit_id}")

# Upload AAB
media = MediaFileUpload(AAB_PATH, mimetype="application/octet-stream", resumable=True)
bundle = service.edits().bundles().upload(
    packageName=PACKAGE, editId=edit_id, media_body=media
).execute()
uploaded_vc = bundle["versionCode"]
print(f"Bundle uploaded: versionCode {uploaded_vc}")

# Get existing internal track releases
try:
    track = service.edits().tracks().get(
        packageName=PACKAGE, editId=edit_id, track="internal"
    ).execute()
    releases = track.get("releases", [])
except HttpError:
    releases = []

# Replace with only the new release
new_releases = [{
    "versionCodes": [str(uploaded_vc)],
    "status": "completed",
    "name": f"v{uploaded_vc} - GitHub Actions Auto-Deploy"
}]
service.edits().tracks().update(
    packageName=PACKAGE, editId=edit_id, track="internal",
    body={"releases": new_releases}
).execute()

# Commit
commit = service.edits().commit(packageName=PACKAGE, editId=edit_id).execute()
print(f"✅ Deployed versionCode {uploaded_vc} to Internal Testing!")
print(f"   Commit ID: {commit['id']}")
