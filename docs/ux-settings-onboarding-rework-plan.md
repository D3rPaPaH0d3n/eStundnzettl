# UX Rework: Settings & Onboarding

Branch: `feature/ux-simple-mode-settings`

## Goal
Make eStundnzettl understandable for normal users again without removing advanced features.

The original core use case is simple time recording. The app now also supports target/actual calculations, overtime, holidays, vacation, PDF reports, backups, Nextcloud, work codes, archive features, and expert settings. The UX must clearly separate everyday choices from advanced configuration.

## Non-negotiables
- Existing users must not lose entries, settings, work codes, attachments, backups, or calculation rules.
- Existing `simpleMode`, `expertMode`, `minuteInput`, `workModelId`, `workDays`, `locale`, and `calculationConfig` values remain valid.
- Do not silently reset custom work schedules.
- Do not remove features; move advanced features behind clearer sections/details.
- Old backups/imports must remain compatible.
- Any Simple -> Standard switch must guide the user to set missing work model / locale data instead of blindly toggling.

## Target information architecture: Settings
1. Profile
   - Name, company, role, photo.
2. Recording mode
   - Always-visible choice: simple recording vs calculation/evaluation.
   - Uses existing `userData.simpleMode` initially.
3. My work schedule
   - Weekly model, day hours, templates, lock/unlock, minute input.
   - Hidden or summarized when simple recording is active.
4. Activities / work codes
   - Separate card for work code management.
5. Time calculation
   - Only relevant outside simple mode.
   - Summary first, detailed rules after expansion.
   - Locale/region should not be hidden as an expert-only concept.
6. Backup & safety
   - Status-first: not configured / Google / Nextcloud / local.
   - Basic backup/restore understandable for all users.
7. Evaluation & PDF
   - Normal report/export first.
   - PDF archive and detailed toggles in advanced settings.
8. Appearance
   - Language and theme together.
9. Advanced settings
   - Public label for current `expertMode` / Hausmasta mode.
10. App & help
   - Help, tour, changelog, update, legal/app links.
11. Danger zone
   - Demo/reset/destructive actions at the end.

## Target onboarding
Welcome presents clear paths:
- Only record working hours: profile -> done (optional backup/work codes later).
- With target/actual calculation: profile -> region -> work schedule -> work codes -> backup -> summary.
- Restore backup: restore flow.

## Existing-user migration / update notice
Use a short, non-destructive notice for existing users after the UX update.

Possible setting key: `settings_ux_migration_seen_v1`.

Notice copy should state:
- Your entries and settings are unchanged.
- Settings were reorganized.
- Advanced options are now under "Advanced settings".
- You can review your recording mode if you want.

Rules:
- Do not force a mode change.
- `simpleMode === true` remains "Only record working hours".
- `simpleMode !== true` remains "With calculation & evaluation".
- `expertMode === true` keeps advanced settings visible.

## Implementation phases

### Phase 1 — Settings quick wins
- Create a clear always-visible recording mode section/card.
- Remove the expert-only gate around simple mode.
- Keep old behavior and persistence.
- Split work code management into its own card if low-risk.
- Improve labels/i18n where touched.

### Phase 2 — Settings structure
- Reorder settings according to user intent.
- Move advanced settings toggle higher.
- Combine language and theme into appearance.
- Deduplicate recalculation UX.

### Phase 3 — Existing-user notice
- Add concise update notice modal/card with `settings_ux_migration_seen_v1`.
- No data changes except storing the seen flag.

### Phase 4 — Onboarding fast paths
- Add clear welcome choices.
- Implement simple recording fast path.
- Keep restore flow intact.

### Phase 5 — Calculation/backup/PDF polish
- Add calculation summary before details.
- Make backup status-first.
- Make PDF/archive advanced but reachable.

## Test plan
- `npm run lint`
- `npm run typecheck`
- `npm test`
- Targeted component/hook tests for settings and onboarding if added.
- Manual smoke paths:
  - Existing standard user opens settings.
  - Existing simple user opens settings.
  - Existing expert user opens settings.
  - Toggle simple mode on/off without losing previous custom work schedule.
  - Open work code manager.
  - Backup settings still mount and listeners behave.
  - Locale change confirm flow still works.
  - Old backup import still succeeds.

## Current status
- Branch created.
- Phase 1 started.
