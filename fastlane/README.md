# Fastlane metadata

Play Store listing texts in the layout that Fastlane's
[`supply`](https://docs.fastlane.tools/actions/supply/) action
expects. The repo includes a minimal `Fastfile` + `Appfile` and a
GitHub workflow (`update-store-listings.yml`) that uploads the
listings — APKs/AABs and changelogs continue to be handled by
`deploy-play-store.yml` and the Python script in
`.github/scripts/deploy-play.py`.

The **single source of truth** for every text below remains
`docs/play-store-listing.md`. Keep them in sync.

## Layout

```
fastlane/
  metadata/
    android/
      de-DE/
        title.txt                   — ≤ 30 chars
        short_description.txt       — ≤ 80 chars
        full_description.txt        — ≤ 4000 chars
        changelogs/
          <versionCode>.txt         — ≤ 500 chars, one per release
      en-US/
        (same structure)
```

Changelog file names match the Android `versionCode` (not
`versionName`). Current release is `251` (= `versionName 4.1.0`, see
`android/app/build.gradle`). Older codes aren't committed — they
correspond to development builds that were never in Play Store
production. Add a new `<code>.txt` file per language for each
release going forward.

## Upload via GitHub Actions

The `Update Play Store Listings` workflow uploads everything in
this folder to the Play Store. Trigger it manually:

1. Open the GitHub repo → **Actions** → **Update Play Store
   Listings** → **Run workflow**.
2. Toggle "Nur validieren, kein Upload" on for a dry-run that
   only validates the metadata against the Play Store API.
3. Hit **Run workflow** — the job decodes the existing
   `PLAY_DEPLOY_KEY_BASE64` secret (same one the deploy
   workflow uses), installs fastlane, and runs `supply` with
   `--skip_upload_apk --skip_upload_aab --skip_upload_changelogs`.
4. New translations are picked up automatically — drop a new
   `<locale>/` folder in here, push, run the workflow.

What the workflow **does not** touch:
- AAB/APK builds and signing
- Changelogs (release notes per `versionCode`)
- Track promotions (Internal/Beta/Production)
- Version bumps

## Local upload (optional)

If you have a service-account JSON locally (NOT committed):

```bash
SUPPLY_JSON_KEY=/path/to/play-key.json fastlane android update_listings
```

Or for a dry-run:

```bash
SUPPLY_JSON_KEY=/path/to/play-key.json fastlane android validate_listings
```

## Adding a new release

1. Bump `versionCode` in `android/app/build.gradle` as usual.
2. Add the release note:
   ```
   fastlane/metadata/android/de-DE/changelogs/<newCode>.txt
   fastlane/metadata/android/en-US/changelogs/<newCode>.txt
   ```
   Keep each file ≤ 500 characters (Play Console limit).
3. Mirror the new release note into `docs/play-store-listing.md`
   under the right language section so the Markdown doc stays
   complete.
4. If the base listing copy (title/short/full) changes, update all
   four `.txt` files **and** the matching section in
   `docs/play-store-listing.md`.

## Character-count sanity check

```bash
python3 -c "
import os, sys
MAX = {'title.txt': 30, 'short_description.txt': 80, 'full_description.txt': 4000}
for root, _, files in os.walk('fastlane/metadata/android'):
    for f in files:
        path = os.path.join(root, f)
        if not f.endswith('.txt'): continue
        txt = open(path, encoding='utf-8').read().rstrip('\n')
        limit = MAX.get(f, 500 if 'changelogs' in root else None)
        if limit is None: continue
        mark = 'OK ' if len(txt) <= limit else 'OVER'
        print(f'{mark} {path}: {len(txt)}/{limit}')
"
```
