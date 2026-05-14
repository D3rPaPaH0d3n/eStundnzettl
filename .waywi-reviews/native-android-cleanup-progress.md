# Native Android cleanup progress

Branch: `cleanup/native-android-web-removal`
Issue: #46
Started/resumed: 2026-05-14 20:45 Europe/Vienna

## Phase 0 — Baseline

Status: partial pass / environment blocker for Android assemble.

Checks run:
- `npm run typecheck` ✅
- `npm test` ✅ 65 files / 783 tests passed
- `npm run build` ✅
- `npx cap sync android` ✅
- `cd android && ./gradlew assembleDebug` ⚠️ blocked: no `java` in PATH and `JAVA_HOME` is not set in this runtime

Blocker detail:
- Gradle cannot run because Java is unavailable in the current OpenClaw shell environment.
- `which java` returned no path; `/usr/lib/jvm/*` also returned no installed JVM path.

Next safe step:
- Continue low-risk phases using available web/Capacitor checks.
- Re-run Android assemble once Java/JDK is available, or on a machine/session with `JAVA_HOME` configured.

## Phase 1 — PWA/template cleanup

Status: completed; local commit pending at time of writing.

Changes:
- Removed PWA/browser-only manifest link and Apple web-app metadata from `index.html`.
- Deleted unused PWA/template assets:
  - `public/manifest.json`
  - `public/vite.svg`
  - `src/assets/react.svg`
  - `src/components/Settings/BackupSettings.jsx.backup`

Checks run:
- PWA leftover grep for `manifest.json`, `vite.svg`, `react.svg`, Apple web-app tags ✅ no matches in app/source targets
- `npm run build` ✅
- `npx cap sync android` ✅
- `cd android && ./gradlew assembleDebug` ⚠️ same environment blocker: Java/JAVA_HOME unavailable

Manual Android smoke tests:
- Not run in this environment.

## Phase 2 — unused `@capacitor-community/date-picker` removal

Status: completed; local commit pending at time of writing.

Changes:
- Removed `@capacitor-community/date-picker` from `package.json` and `package-lock.json` via `npm uninstall`.
- Removed the matching Knip ignore entry from `knip.config.ts`.
- Ran `npx cap sync android`; Capacitor plugin list dropped from 10 to 9 plugins and no longer includes the community date picker.

Checks run:
- Dependency grep for `@capacitor-community/date-picker` in package/config/source targets ✅ no matches
- `npx cap sync android` ✅
- `npm run typecheck` ✅
- `npm test` ✅ 65 files / 783 tests passed
- `npm run build` ✅
- `cd android && ./gradlew assembleDebug` ⚠️ same environment blocker: Java/JAVA_HOME unavailable

Manual Android picker tests:
- Not run in this environment.
