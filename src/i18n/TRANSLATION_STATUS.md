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
- [ ] B3: EntryForm.tsx
- [ ] B4: ReportDocument.tsx + PrintReport.tsx
- [ ] B5: ViewRouter + SelectionDrawer + TimePickerDrawer + DecimalDurationPicker
- [ ] B6: HelpModal + ChangelogModal
- [ ] B7: ImportConflictModal + LocaleMigrationModal + PresetModal + AttachmentManager
- [ ] B8: LiveTimerOverlay + AppTour
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
