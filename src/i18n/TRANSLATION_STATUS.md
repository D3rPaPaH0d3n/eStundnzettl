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
- [x] B9: Settings shell + ProfileSettings + ThemeSettings + AppInfoSettings
- [x] B10: Settings/CalculationSettings
- [x] B11: Settings/BackupSettings
- [x] B12: Settings/LocaleSettings (+ Language Picker UI) + DataSettings + PdfArchiveSettings
- [x] B13: OnboardingWizard + Welcome/Profile/SummaryStep
- [x] B14: Onboarding LocaleStep + WorkScheduleStep
- [x] B15: Onboarding CalculationStep
- [x] B16: Onboarding WorkCodesStep

## Phase C — Locale-sensitive formatting
- [x] C1: `src/utils/formatLocale.ts` + swap all `de-DE` usages, register `enUS` for date-fns

## Phase D — Hooks & utility toasts
- [x] D1: migrate toast strings in `src/hooks/*` and `src/utils/*`

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
- **Session D1** (2026-04-13): migrated all toasts in `src/hooks/*`.
  New `toasts.*` namespace covering 12 hook files and ~40 toasts:
  - `toasts.entry.*` — saved/updated/deleted/saveFailed/updateFailed/
    deleteFailed/deleteAllFailed/importFailed plus
    endBeforeStart/overlap.
  - `toasts.appReset`, `toasts.noInternet`,
    `toasts.playStore.{opening,failed,copiedClipboard}`,
    `toasts.onboardingCompleted`, `toasts.timer.{started,captured}`,
    `toasts.attachments.readyToShare_{one,other}` (plural with
    {{count}}), `toasts.autoBackup.{failed5x,completed}`,
    `toasts.autoCheckout`.
  - `toasts.export.*` (12 keys including the share-sheet
    title/text/dialog with {{date}}, {{message}} for the error
    template).
  - `toasts.import.*` (8 keys including
    `skippedEntries_{one,other}` plural and {{message}} error
    template).
  Files touched: useDeleteActions, useEntryActions, useMiscActions,
  useOnboardingActions, useTimerActions, useAttachmentShare
  (+ chooserTitle now uses `reports.title` + `dashboard.documentsCount`),
  useAutoBackup, useEntries, useExport, useImport,
  useAutoCheckoutHandler. `utils/logger.ts` left as-is — its toast
  receives the message string from callers, who are responsible for
  translating it.
  All hooks pull `useTranslation()` and add `t` to their useCallback
  dependency arrays.
  Tests 630/630 green; TS error count unchanged at 59.
- **Session C1** (2026-04-13): introduced dynamic format-locale.
  - New `src/utils/formatLocale.ts` exporting `getCurrentLanguage()`,
    `getIntlLocale()` (-> "de-DE" | "en-US") and
    `getDatePickerLocale()` (-> "de" | "en"). All read from
    `i18n.language` at call-time, so a language switch via the
    Settings picker affects every formatter on the next render.
  - Replaced all hard-coded `toLocaleDateString("de-DE", …)` and
    `toLocaleString("de-DE", …)` calls in: Dashboard,
    ReportDocument, PrintReport, AttachmentManager,
    Settings/PdfArchiveSettings, Settings/DataSettings,
    Settings/CalculationSettings, Onboarding/CalculationStep,
    hooks/useExport. The remaining `de-DE` strings in the repo
    are all in TRANSLATION_STATUS.md historical notes.
  - Registered `enUS` from `date-fns/locale` in Dashboard and
    EntryForm alongside `de`. The `react-datepicker` `locale` prop
    in both is now driven by `getDatePickerLocale()`. Existing
    `registerLocale` mocks in Dashboard.test.tsx /
    EntryForm.test.tsx already accept any string, so tests remain
    untouched.
  Total TS error count unchanged at 59 (pre-existing only).
- **Session B16** (2026-04-13): migrated `Onboarding/steps/WorkCodesStep.tsx`.
  Small step (142 lines): step title/subtitle, two basic preset
  cards (Allgemein/Leer with title + subtitle each), industry-
  presets toggle, code-count line built from
  `onboarding.workCodes.codeCount` with `{{description}}/{{count}}`
  interpolation, footer hint. Refactored the static `BASIC_PRESETS`
  array into a `BASIC_PRESET_IDS` tuple and resolves titles inside
  the component via `t()` — same pattern used in B10/B15 for
  options arrays. Tests 630/630 green.
- **Session B15** (2026-04-13): migrated `Onboarding/steps/CalculationStep.tsx`
  (656 lines, the rule-builder for "custom plan" onboarding).
  - New `onboarding.calc.*` namespace for onboarding-specific copy:
    step title/subtitle/infoHint, contractedHoursAuto line,
    advanced open/close labels, holidaysTitle + halfDaysTitle (short
    single-word variants for the two advanced cards),
    customHolidayTitle, noHolidays, noHalfDays, classicHalfDays
    ("Add Dec 24 & Dec 31"), vacationTitle, and 6 interpolated
    preview strings under `onboarding.calc.preview.*`
    (overtimeNone/All/Split with {{weekTarget}}/{{balance}}/{{ma}}/
    {{ue}}, sickCap/Additive/Ignore).
  - Everything else (overtime/sick/holidayOnWork option labels, all
    4 drawer titles, import-source labels with {{state}}/{{kanton}}
    interpolation, threshold label, hoursPerWeek/Unit, dateLabel +
    nameLabel + placeholders, days/yearlyAllowance/carryover/
    carryoverHint, removeHolidayAria {{name}}, addHalfDayAria, the
    three fallback labels, holidayWork drawer title,
    importHolidays button, add button) reuses existing
    `settings.calc.*` keys from B10. Same useMemo pattern for
    option arrays (stable ID tuples + t()-driven labels).
  - `formatHours` still uses `toLocaleString("de-DE", …)` — stays
    for C1.
  Tests 630/630 green.
- **Session B14** (2026-04-13): migrated two larger onboarding steps.
  - `Onboarding/steps/LocaleStep.tsx`: `onboarding.locale.*` — step
    title/subtitle, info hint, four group cards (Neutral/AT/DE/CH)
    with title + description each, state + canton labels, both
    SelectionDrawer titles, custom-plan card. Base locale/state/
    kanton names still come from `GERMAN_STATE_NAMES` /
    `SWISS_KANTON_NAMES` (data layer, handled later).
  - `Onboarding/steps/WorkScheduleStep.tsx`: `onboarding.workSchedule.*`
    — title/subtitle, two mode cards (Target/Actual vs Simple with
    their hints), simple-mode info banner, custom-mode info banner,
    daily-hours card heading, weekly-hours label, presets heading,
    minute-input toggle (title + hint + aria). Weekday short-day
    labels reuse `settings.weekdays.*` from B9, so Mo/Di/…/So
    translate consistently with DataSettings.
  Tests 630/630 green.
- **Session B13** (2026-04-13): migrated the onboarding wizard shell
  + three small steps (Welcome/Profile/Summary). Opens the
  `onboarding.*` namespace that B14–B16 will extend.
  - `onboarding.nav.*` — Back/Next/Finish.
  - `onboarding.welcome.*` — logo alt, greeting, intro (Trans with
    <brand> slot), three feature badges, three action buttons.
  - `onboarding.profile.*` — title/subtitle, privacy hint (Trans
    with <b>), photo alt/label, three labels + placeholders.
  - `onboarding.summary.*` — title, dual body (restore vs fresh),
    tour hint, finish button.
  - `onboarding.backup.*` — full step-6 copy: dual title/subtitle,
    optional/bonus hints, three target cards (gdrive/local/
    nextcloud with connectedAs {{user}}, awaiting, URL placeholder,
    connect button), skip hint, four restore entry points
    (gdrive/nextcloud/folder/file), ncLoading.
  - `onboarding.toast.*` — 28 toasts including interpolation for
    ncConnectedAs and integrity mismatch; reused integrity text
    shared with settings.toast.integrityMismatch where appropriate.
  Cancel buttons in the Nextcloud polling views reuse common.cancel.
  JSON fix: the German skip-hint originally used the closing
  low-double-quote „…" which terminates a JSON string; replaced
  with single quotation marks ‚Weiter' so the file parses.
  Tests 630/630 green.
- **Session B12** (2026-04-13): migrated the last three Settings panels
  and **added the Language Picker UI** planned since A1.
  - `Settings/LocaleSettings.tsx`: new `settings.language.*` card
    rendered above the existing regional-calculation card. Uses the
    `useLocaleSetting` hook from A1, so clicking "Deutsch"/"English"
    persists to localStorage, calls `i18n.changeLanguage`, syncs
    `<html lang>`, and triggers a re-render. Full `settings.locale.*`
    namespace for the four country buttons (Neutral/Austria/Germany/
    Switzerland), state/canton labels + drawer titles, the "active:"
    hint (via `<Trans>` with inline `<b>` + `{{name}}`), the
    reset-rules ConfirmModal (title/message/confirm), and eight
    toasts (four group switches, state/canton change with {{name}},
    rulesReset, localeSwitchedKeepConfig).
  - `Settings/DataSettings.tsx`: new `settings.data.*` namespace
    covering work-model heading + current-label, templates button,
    weekly hours line with {{hours}} interpolation (number still
    formatted via `"de-DE"` — stays for C1), simple-mode toggle copy
    with two toasts + aria, minute-input toggle, activity codes card,
    both ConfirmModals (preset warning + demo warning with a
    composable {{hint}} that swaps between noBackupHint /
    withBackupHint), three toasts (customActivated/templateApplied/
    demoLoaded). Weekday short labels reuse `settings.weekdays.*`
    from B9.
  - `Settings/PdfArchiveSettings.tsx`: new `settings.pdfArchive.*`
    namespace covering header + subtitle, three target cards (local
    folder + path, Nextcloud path or "connect first" hint, Google
    Drive with connected badge + folder-with-email / folder / info
    tri-state copy), disconnect/connect buttons, lastRun line with
    {{date}}, lastRunNever fallback, runNow button, and 16 toasts
    (ncNotConnected, full Google-Drive connect/disconnect/toggle
    paths, archiveDisabled, pickTarget, loading/updated/upToDate/
    partiallyFailed/notRun with {{reason}}/genericError with
    {{message}}). `formatLastRun` moved inside the component to use
    `t()` for the empty-state label.
  Pre-existing TS errors in DataSettings + PdfArchiveSettings
  shifted lines due to imports/hooks; error count unchanged.
  Tests 630/630 green.

  **User-visible milestone:** with the Language Picker in place, a
  user can now actually switch the whole app to English — all
  migrated components (A1 + B1–B12) re-render through i18next.
  Remaining migrations (B13–B16 onboarding, C1–G2) still contain
  hard-coded strings until their own sessions.
- **Session B11** (2026-04-13): migrated `Settings/BackupSettings.tsx`
  (997 lines, widest Settings file by toast count).
  New `settings.backup.*` namespace covering:
  - Header + subtitle
  - `last.*` block with plural-aware `minutes`/`hours`/`days` and
    `now` + `never` + `lastAt {{time}}` for the last-backup
    formatter (`formatLastBackup` now returns translated strings).
  - Three connection cards:
    * `gdrive.*` (connectedAs/activeAppData/expired/notConnected +
      connect/disconnect button labels)
    * `nextcloud.*` (connectedAs/awaitingLogin/notConfigured +
      pollingTitle/pollingHint for the in-browser flow, serverUrl
      label + placeholder, connect button, testConnection button,
      setup/disconnect buttons)
    * `local.*` (title, activeDaily, notConfigured, disconnect,
      select)
  - `badge.connected` shared across all three cards.
  - `warning.*` block for the two failure banners
    (gdriveFailed / gdriveReconnect / nextcloudWithError {{error}} /
    nextcloudGeneric / retrying / retryNow).
  - `manual.*` (saving / title / saveNow) for the manual-backup
    card.
  - `export` / `import` for the expert-mode buttons.
  - Full `toast.*` tree (18 messages): polling timeout, all three
    Nextcloud connect/test/disconnect toasts with {{message}} /
    {{loginName}} interpolation, all three Google-Drive outcomes,
    local folder toasts, backupCreated/backupPartialFailed with
    {{targets}}, backupDebugTitle with {{details}}, final
    backupFailed fallback.
  - `targetLocal` constant for the "Lokal"/"Local" chip that the
    manual backup toast joins with product names (Google Drive /
    Nextcloud stay untranslated).
  Cancel button in the polling view reuses `common.cancel`.
  Three pre-existing TS errors in the file shifted by +3 lines
  because of the added import, hook call, and blank line; total
  TS error count unchanged.
  Tests 630/630 green.
- **Session B10** (2026-04-13): migrated `Settings/CalculationSettings.tsx`
  (717 lines, the beast of the settings area).
  Introduced the `settings.calc.*` namespace covering every label
  above the fold (header, subtitle, teaser with `{{overtime}}` /
  `{{sick}}`, contracted hours with `{{hours}}`, overtime rule,
  threshold label, sick-on-workday, holidays & half-days), every
  advanced control (auto-pause rule with `{{fromHours}}`/`{{pauseMinutes}}`,
  vacation yearly allowance + carryover + hint) and every toast
  (holidays imported with plural `{{count}}`, format validation,
  recalc running/fixed/allCorrect/error with interpolation).
  Option arrays moved from module-level German-literal constants to
  `OVERTIME_OPTION_IDS` / `SICK_OPTION_IDS` / `HOLIDAY_ON_WORK_OPTION_IDS`
  (stable IDs kept because they persist in `CalculationConfig`). The
  labeled `{ id, label }` arrays are now built inside the component
  via `useMemo` on `t`, so a language switch re-renders them
  correctly. The country/state/kanton import options are also
  translated with `{{state}}`/`{{kanton}}` interpolation; base locale
  names come from `GERMAN_STATE_NAMES`/`SWISS_KANTON_NAMES` which are
  data and handled later.
  Settings weekday keys from B9 are NOT needed here — this file
  doesn't render weekday pickers directly.
  `formatHours` still uses `toLocaleString("de-DE", …)` — stays for C1.
  Tests 630/630 green.
- **Session B9** (2026-04-13): migrated the settings shell and the
  three small settings panels (Profile/Theme/AppInfo). Largest Settings
  session so far — opens the big `settings.*` namespace that B10–B12
  will extend.
  - `Settings.tsx` (shell): ten toasts (customModeRequired,
    unlockRequired, timeUpdated, customOnly, unlocked, invalidBackup,
    integrityMismatch, entriesImported_one/_other with `{{count}}`,
    fileReadError, restoreSuccess) under `settings.toast.*`, plus the
    DecimalDurationPicker title built from `settings.editDay` +
    `settings.weekdays.*` (7 keys).
  - `ProfileSettings.tsx`: title, photo hint, photo alt, three
    labels + placeholders (name/company/position), three toasts
    (photoUpdated/photoError/photoRemoved).
  - `ThemeSettings.tsx`: title + three mode labels
    (light/dark/system) rewritten to drive button copy straight from
    `t(\`settings.theme.\${mode}\`)`.
  - `AppInfoSettings.tsx`: largest of the three — section headings
    (app & info, about, danger zone, power-user), every link button
    (play store, help, changelog, privacy, website, source, imprint,
    license, contact, donate), power-user toggle copy, recalc &
    demo-data chips, danger-zone body, version/credits footer, and
    the ConfirmModal title/message/confirm for the recalc flow.
    Added `recalcFixed` ({{fixed}}/{{total}}) and `recalcAllCorrect`
    ({{total}}) with interpolation, plus `linkError`/`mailError`
    toasts.
  - Pre-existing TS errors in Settings.tsx/ProfileSettings.tsx shifted
    two lines (import + hook) — still not introduced here. Total TS
    error count unchanged at 59.
  Tests 630/630 green.
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
