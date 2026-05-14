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

## Phase 3 — Web datepicker fallback removal

Status: completed; local commit pending at time of writing.

Changes:
- Removed `react-datepicker` UI/imports from `EntryForm.tsx`; the date field now uses the Material3 native date picker trigger only.
- Reduced `DashboardMonthPicker.tsx` to a native Material3 month picker wrapper and removed the browser modal fallback.
- Removed all `.react-datepicker*` CSS from `src/index.css`.
- Removed the date-picker manual chunk from `vite.config.js`.
- Removed stale test mocks and translation-status references to the old browser picker.
- Removed `react-datepicker` and `date-fns` from `package.json`/`package-lock.json` because no app/source imports remain.

Checks run:
- Guard grep for `react-datepicker`, `react-datepicker__`, `getDatePickerLocale`, `date-fns`, `@floating-ui` in `src`, `vite.config.js`, `package.json`, `package-lock.json` ✅ no matches
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ 65 files / 783 tests passed
- `npm run build` ✅; date-picker chunk disappeared and transformed modules dropped from 3709 to 2871
- `npx cap sync android` ✅; still 9 Capacitor plugins
- `cd android && ./gradlew assembleDebug` ⚠️ same environment blocker: Java/JAVA_HOME unavailable

Manual Android picker tests:
- Not run in this environment. Must be checked on a device/emulator once Java/JDK is available.

## Phase 4 — Browser export/download fallback removal

Status: completed; local commit pending at time of writing.

Changes:
- Removed JSON export web share/blob download fallback from `src/hooks/useExport.ts`; `exportData()` now always builds the backup payload and opens the native export modal.
- Removed PDF browser Blob download branch from `src/components/PrintReport.tsx`; PDF export/share now uses the native Filesystem/Share flow only.
- Removed web Blob download fallback from `writeLocalArchive()` in `src/utils/pdfArchiveTargets.ts`; the native three-stage Filesystem fallback chain remains intact.
- Adjusted `useAutoPdfArchive` and `pdfArchiveTargets` tests for native-only local archive behavior.
- Also removed the remaining PrintReport browser month-picker fallback while touching the same native-only export surface.

Checks run:
- Guard grep for `handleWebExport`, `navigator.share`, export/download `createObjectURL`/`URL.revokeObjectURL`, `local-web`, and web-download error text in Phase 4 target files ✅ no matches
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ 65 files / 781 tests passed
- `npm run build` ✅
- `npx cap sync android` ✅; still 9 Capacitor plugins
- `cd android && ./gradlew assembleDebug` ⚠️ same environment blocker: Java/JAVA_HOME unavailable

Manual Android export tests:
- Not run in this environment. Still needs device/emulator checks for JSON folder export, JSON share, PDF export/share, and archive targets.

## Phase 5 — StorageMode/SQLite no-op cleanup (slice 1: lastCode)

Status: partially completed; local commit pending at time of writing.

Changes:
- Simplified `src/utils/lastCode.ts` to SQLite/settingsRepo-only behavior.
- Removed dead `isSQLiteActive()` / `localStorage` branches for last-code load/save/delete.
- Updated `src/hooks/__tests__/useLastCode.test.ts` to remove inactive-storage/localStorage expectations.

Not changed in this slice:
- `src/db/storageMode.ts` remains in place for compatibility.
- No migrations, legacy localStorage migration, Nextcloud/Google token logic, or Secret migration code were removed.
- Remaining Phase 5 consumers still need separate cautious slices.

Checks run:
- Guard grep for `isSQLiteActive`, `storageMode`, `estundnzettl_last_code` in the changed lastCode files ✅ no matches
- `npm run typecheck` ✅
- `npm run lint` ✅
- targeted `npm test -- src/hooks/__tests__/useLastCode.test.ts src/utils/__tests__/storageBackup.test.ts` ✅ 2 files / 23 tests passed
- full `npm test` ✅ 65 files / 780 tests passed
- `npm run build` ✅
- `npx cap sync android` ✅; still 9 Capacitor plugins
- `cd android && ./gradlew assembleDebug` ⚠️ same environment blocker: Java/JAVA_HOME unavailable

Manual Android tests:
- Not run in this environment. Last-code/default-code behavior should be included in the next device smoke pass.
