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
- [ ] A1: i18n bootstrap (device detection, persistence, `useLocaleSetting`, dynamic `<html lang>`)

## Phase B — Component migration

- [ ] B1: AppHeader + ConfirmModal + ExportModal + WorkCodeManager (tiny)
- [ ] B2: Dashboard.tsx
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
