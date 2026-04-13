# Translation Status — English Migration

This file is the **re-entry point** for every follow-up session. Read this
file first, then pick exactly one unchecked item below. Update this file as
part of the same commit.

**Branch:** `claude/plan-english-translation-QeVm9`
**Plan:** `/root/.claude/plans/swift-tickling-bee.md` (master plan)
**Baseline:** 51 test files, 630 tests passing (captured 2026-04-12).

## Workflow per session

1. Read this file → pick next `[ ]` item.
2. `git log --oneline -10` and `git status` to confirm clean state.
3. Work **exactly one** item. Do not start the next one, even if budget remains.
4. Check the item below, add brief notes (keys added, tricky spots).
5. `npm test -- --run` (full) or scoped vitest for the touched files.
6. Commit + `git push -u origin claude/plan-english-translation-QeVm9`.
7. End session.

## Hard rules against API errors

- ONE item per session. Never combine B-items.
- Push after every commit; progress must be remote.
- No full-file rewrites for large files (EntryForm, CalculationStep) — use
  targeted `Edit`s on small blocks.
- When in doubt about key naming or tone of an English string, ask the user.

## Namespace convention for `de.json` / `en.json`

```
common.*          shared buttons/labels (ok, cancel, save…)
header.*          AppHeader
dashboard.*       Dashboard
entryForm.*       EntryForm (labels, placeholders)
reports.*         ReportDocument + PrintReport
modals.*          HelpModal, ChangelogModal, Confirm, Export, etc.
settings.*        Settings panels (settings.calculation, settings.backup, …)
onboarding.*      OnboardingWizard + steps (onboarding.welcome, …)
toast.*           Toast messages from hooks/utils
changelog.*       changelog-data.ts entries (changelog.v4_1_0.title, …)
format.*          any format helpers needing translated text
```

---

## Phase 0 — Setup
- [x] Session 0: status tracker + baseline (this commit)

## Phase A — Infrastructure
- [x] A1: i18n bootstrap (device detection, persistence, `useLocaleSetting`, dynamic `<html lang>`)

## Phase B — Component migration

- [x] B1: AppHeader + ConfirmModal + ExportModal + WorkCodeManager (tiny)
- [x] B2: Dashboard.tsx
- [x] B3: EntryForm.tsx
- [x] B4: ReportDocument.tsx + PrintReport.tsx
- [x] B5: ViewRouter + SelectionDrawer + TimePickerDrawer + DecimalDurationPicker
- [x] B6: HelpModal + ChangelogModal
- [x] B7: ImportConflictModal + LocaleMigrationModal + PresetModal + AttachmentManager
- [x] B8: LiveTimerOverlay + AppTour
- [ ] B9: Settings shell + ProfileSettings + ThemeSettings + AppInfoSettings
- [ ] B10: Settings/CalculationSettings
- [ ] B11: Settings/BackupSettings
- [ ] B12: Settings/LocaleSettings (+ Language Picker UI) + DataSettings + PdfArchiveSettings
- [ ] B13: OnboardingWizard + Welcome/Profile/SummaryStep
- [ ] B14: Onboarding LocaleStep + WorkScheduleStep
- [ ] B15: Onboarding CalculationStep
- [ ] B16: Onboarding WorkCodesStep

## Phase C — Locale-sensitive formatting
- [ ] C1: `src/utils/formatLocale.ts` + swap all `de-DE` usages, register `enUS` for date-fns

## Phase D — Hooks & utility toasts
- [ ] D1: migrate toast strings in `src/hooks/*` and `src/utils/*`

## Phase E — Changelog data
- [ ] E1: refactor `src/data/changelog-data.ts` to keys, translate `changelog.*`

## Phase F — Meta & tests
- [ ] F1: index.html alt text, App.tsx/main.tsx residual strings
- [ ] F2: fix tests broken by migration (Dashboard/EntryForm/hooks tests)

## Phase G — QA & release
- [ ] G1: full end-to-end QA (both languages)
- [ ] G2: final commit + push (no PR unless user asks)

---

## Session log (append after each session)

- **Session 0** (2026-04-12): tracker created, baseline 630/630 tests green.
- **Session B8** (2026-04-13): migrated the floating live timer and the
  onboarding tour.
  - `LiveTimerOverlay` (~5 strings): new `liveTimer.*` namespace covers
    the hours suffix ("Std" → "h"), the "Pausiert" badge, the
    swipe-up hint and the two FAB mini-labels ("AUS"/"TIMER"). The
    existing `timer.*` aria-labels from A1 stay as-is.
  - `AppTour` (14 strings): tour content lives in a new
    `appTour.steps.*` tree with one entry per step (welcome, dashboard,
    fabTap, fabTimer+hint, report, settings, done). Refactored the
    static `steps` array into a `STEP_DEFINITIONS` constant that only
    holds icon/color/target/hasHint; the component builds the final
    translated step list via `useMemo` on `t`. Chrome strings (Skip
    aria, Done, Next) moved to `appTour.skipAria/finish/next`; "Zurück"
    reuses `common.back`.
  Tests 630/630 green.
- **Session B7** (2026-04-13): migrated the four interstitial modals.
  - `ImportConflictModal` (~8 strings): backup-review title, description
    with inline `<b>` via `<Trans>`, entry/settings labels, included
    badge, warning, "import all" / "entries only" buttons. Cancel reuses
    `common.cancel`.
  - `LocaleMigrationModal` (~13 strings): migration popup that greets
    existing users. Title, explanation, three option cards (Austria
    with recommended note, Germany with state picker, Neutral) each
    with their own title+description, state label, SelectionDrawer
    title, "change later" hint. Confirm button now uses the new
    shared `common.apply`.
  - `PresetModal` (~3 strings): title, big-red calc-recalc warning,
    Cancel/Apply buttons via `common.cancel` + `common.apply`. The
    `model.label`/`model.description` copy still comes from
    `WORK_MODELS` in `constants.ts` — that stays for B12.
  - `AttachmentManager` (~12 strings): new `attachments.*` namespace
    with 7 toast variants (entryMissing, selectFile, labelRequired,
    added, addError, deleted, deleteError), title, two field labels,
    placeholder, saving-button + add-button, existing-list heading and
    empty-state text. `toLocaleDateString("de-DE", ...)` in the date
    subtitle kept for C1.

  New shared key: `common.apply` (shared between LocaleMigrationModal
  and PresetModal).
  Tests 630/630 green.
- **Session B6** (2026-04-13): migrated `HelpModal.tsx` (~45 strings of
  user-facing copy) and `ChangelogModal.tsx` (3 shell strings — the
  actual version log content stays for E1).
  - Introduced `helpModal.*` namespace covering title/subtitle/intro,
    seven numbered step sections (log hours, drive times, vacation/
    sick/TO, attachments, month close, backup, power-user mode), a
    tips grid and the tagline. Rich-text strings use the
    react-i18next `<Trans>` component with small reusable slot
    objects (`boldSlot`, `plusSlot`, `plusBoldSlot`, `previewIconSlot`)
    so `<strong>`, the coloured `+` button reference and the inline
    FileText icon survive translation.
  - `changelogModal.*`: title, `recentBugfixes`, plural-aware
    `versionsCount_{one,other}` replacing the hard-coded German
    "Versionen".
  - EN wording for step 7 was chosen as "Power-user mode" rather than
    a literal translation of "Hausmasta" (Austrian slang); still
    matches the settings toggle copy plan in B12.
  - The "ZA" abbreviation in step 3 maps to "TO" in EN matching the
    EntryForm abbreviation from B3.
  Tests 630/630 green.
- **Session B5** (2026-04-13): migrated the four small overlay components.
  Only a handful of strings each, but they anchor the drawer UX across
  the whole app.
  - `SelectionDrawer.tsx`: title fallback → `common.select`, close aria
    → `common.close`; resolved once via a `resolvedTitle` local so
    drawer header and dialog aria-label stay consistent.
  - `TimePickerDrawer.tsx`: title fallback → `drawers.timePicker.title`;
    cancel-X aria → `common.cancel`; confirm-check aria →
    `drawers.timePicker.confirmAria`.
  - `DecimalDurationPicker.tsx`: title fallback →
    `drawers.decimalDuration.title`.
  - `ViewRouter.tsx`: three Suspense fallback labels now use existing
    `skeleton.entryForm`/`skeleton.settings` plus a new
    `skeleton.pdfModule` for the PDF-module loader.
  Added `common.select`, `skeleton.pdfModule`, `drawers.*`.
  Pre-existing TS error in ViewRouter line shifted 193→195 due to two
  new lines (import + hook) — still not this commit's fault.

  TEST FIX: Fixed pre-existing date-dependent flakiness in
  Dashboard.test.tsx. Dashboard's default-expanded week comes from
  real `new Date()`, but the test fixture pins `currentDate` to April
  2026 and expected week 15 to be expanded. This only passed while
  wall-clock happened to fall inside that window. Now freezes system
  time to 2026-04-07 via `vi.useFakeTimers`/`vi.setSystemTime` in
  beforeEach, restores real timers in afterEach. Deterministic going
  forward — no production code change.
  Tests 630/630 green.
- **Session B4** (2026-04-12): migrated the report pair:
  `ReportDocument.tsx` (688 lines, the headless PDF body) and
  `PrintReport.tsx` (356 lines, the interactive preview shell).
  Done in one session because the two files share strings and it
  avoids key drift.
  New `reports.*` namespace: title, preview, fullMonth, employeeAlt,
  monthWithWeek, table column headers, pauseMin with `{{minutes}}`,
  noPauseUpper, publicHoliday, documentsLabel, `summary.*` (work,
  holidays, vacation, timeComp, sickness, totalActual, targetTime,
  balance, extraHours, overtime, driveUnpaid), `vacationBalance.*`
  (allowance, days, carryoverPositive/Negative, used with `{{year}}`,
  remaining), notesTitle, `largeExport.*` (title, message with
  `{{count}}`, confirm), toast.* (downloadStarted, readyToShare,
  savedToDocuments, error with `{{message}}`), `noteModal.*` (title,
  placeholder, done), pdfElementMissing.
  ReportDocument now reuses `entryTypes.holiday/timeComp/vacation/sick`
  for the per-row labels and `dashboard.calendarWeekShort` for the
  `(KW n)` suffix next to the month.
  Filenames and the `"Stundenzettel"` Share title string intentionally
  keep the product wording (`t("reports.title")`) instead of a
  hard-coded label — the filesystem path segment `eStundnzettl/…`
  remains literal because it is an on-disk folder name.
  Date formatting (`toLocaleDateString("de-DE", …)`) stays for C1.
  A pre-existing Html2PdfOptions TS error in PrintReport shifted from
  line 198 to 200 because of the two new import/hook lines — still
  not caused by this change.
  Tests 630/630 green.
- **Session B3** (2026-04-12): migrated `EntryForm.tsx` (~36 strings).
  New `entryForm.*` namespace covering: toasts (copyLastError/Success,
  quickAddSuccess), code placeholder, time-picker titles, entry-type
  tabs (`types.work/drive/sick/vacation/timeCompShort`), drive-sub-type
  chips (`driveSubtype.arrival/arrivalBadge/driveTime/driveTimeBadge`),
  auto-calc info panel with `{{type}}` interpolation and three type
  labels (vacationType/sickType/timeCompType), auto/manual mode toggle,
  field labels (date/start/end/pause/activity/project/distanceOrNote),
  `noPause`, `pauseMinutes` with `{{minutes}}` interpolation (covers
  both the `30 Min` default and dynamic pause value; hours-suffix stays
  language-neutral with `h`/`m`), new-activity quick-add + placeholder,
  project placeholder, knownProjects hint. Cancel/Save reuse
  `common.cancel`/`common.save`.
  `registerLocale("de", de)` and `DatePicker locale="de"` kept for C1.
  Tests 630/630 green.
- **Session B2** (2026-04-12): migrated `Dashboard.tsx`.
  New keys under `dashboard.*` (actual/target/balance/driveTime with
  {{code}} interpolation, overtimeShort.extra/overtime, recentEntries,
  noEntries, calendarWeek/calendarWeekShort, total, pause with
  {{minutes}} interpolation, noPause, documentsLabel plus
  plural-aware `documentsCount`). New top-level `entryTypes.*` namespace
  reused across future components (holiday, allDay, paidOff, timeComp,
  vacation, sick). Added a `getEntryTypeLabel(type, t)` helper next to
  the Dashboard component.
  Date formatting (`toLocaleDateString("de-DE", ...)`) and the
  `registerLocale("de", de)` / `DatePicker locale="de"` stay for C1.

  IMPORTANT TEST-INFRA: jsdom reports `navigator.language = "en-US"`,
  which made the new i18n bootstrap pick EN and break DE-string
  assertions. Added `src/test/setup.ts` which runs
  `i18n.changeLanguage("de")` once and wired it via
  `vitest.config.js` → `setupFiles`. The existing F2 strategy is now
  partly in place; remaining test breakage for future migrations
  should be minimal.
  Tests 630/630 green.
- **Session B1** (2026-04-12): migrated four small components.
  Added namespaces `modals.confirm`, `modals.export`, `workCodes` and the
  `common.delete` / `header.logoAlt` keys. Touched:
  `AppHeader.tsx` (aria-labels, subtitle, logo alt),
  `ConfirmModal.tsx` (cancel button + default confirm text now translated,
  `confirmText` prop is now truly optional — callers that passed explicit
  text keep working),
  `ExportModal.tsx` (header, folder/share options, cancel),
  `WorkCodeManager.tsx` (title, preset dropdown, empty state, placeholder,
  delete-all button, both warning modals). Preset names/descriptions in
  `constants.ts` stay for the dedicated settings session (B12).
  Tests 630/630 green.
- **Session A1** (2026-04-12): i18n bootstrap with device-language detection.
  Added `STORAGE_KEYS.LANGUAGE`, exported `detectInitialLanguage` +
  `LANGUAGE_STORAGE_KEY` + `SUPPORTED_LANGUAGES` from `src/i18n/index.ts`,
  created `src/hooks/useLocaleSetting.ts` (reads/writes localStorage,
  listens on `languageChanged`, syncs `<html lang>`). Updated `index.html`
  inline script to resolve language early and set the `<html lang>`
  attribute + loading-logo alt text before React mounts.
  Tests 630/630 green, `vite build` ok. Pre-existing TS errors in
  App.tsx/OnboardingWizard/Settings/PrintReport untouched (not caused
  by this change).
