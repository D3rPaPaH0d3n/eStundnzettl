# Fastlane metadata

Play Store listing texts in the layout that Fastlane's
[`supply`](https://docs.fastlane.tools/actions/supply/) action
expects. **No Fastlane configuration is committed yet** (no
`Fastfile`, no `Appfile`, no `Pluginfile`, no Ruby) — just the
metadata tree, so it's trivial to add Fastlane later without
re-translating.

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

## Manual upload (current workflow)

Google Play Console only — no automation yet:

1. Open Play Console → your app → **Grow → Store presence → Main
   store listing**.
2. **Manage translations → Add translation → English (United
   States)** if not already added.
3. Copy-paste from each `.txt` file into the matching field
   (title / short description / full description).
4. Save for each language.
5. For release notes: **Release → Production →** open the release
   → paste the `<versionCode>.txt` content into the "What's new"
   field for every configured language.
6. Review → submit.

## Future: automate with `fastlane supply`

Once you're ready to auto-upload, you'll need three one-time
setups:

1. **Ruby + Bundler** on the build host (or CI).
2. **Google Play API service account** (Play Console → Setup →
   API access → create service account → grant "Release manager"
   role → download JSON key). Store the key outside the repo —
   e.g. `$HOME/.config/fastlane/play-store-key.json`.
3. Run `bundle init` + `bundle add fastlane` in the repo root,
   then `bundle exec fastlane init` with the service-account
   path.

`supply` will then read the existing `fastlane/metadata/android`
tree straight away. Typical invocation from CI:

```bash
bundle exec fastlane supply \
  --package_name com.estundnzettl.app \
  --json_key "$HOME/.config/fastlane/play-store-key.json" \
  --skip_upload_apk \
  --skip_upload_aab \
  --skip_upload_images \
  --skip_upload_screenshots
```

(Skip the asset flags unless you also curate screenshots / feature
graphic in `fastlane/metadata/android/<locale>/images/`.)

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
