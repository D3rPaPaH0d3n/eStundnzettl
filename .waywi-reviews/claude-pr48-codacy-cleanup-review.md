## Review — PR #48 / `chore/biome-disable-qwik-rule` vs `main`

Two commits: `46d71ad chore: address codacy low-risk findings` and `34e1062 fix: avoid new Codacy Qwik warning`. ~46 files, mostly mechanical (`type="button"`, `htmlFor`/`id` pairs, dropping unused `React`/named imports). Workflows + changelog parser + Google Drive backup got real reinforcement.

### Workflow injection — clean ✅
- `.github/workflows/deploy-play-store.yml:88-102, 429-457` and `release-github.yml:209-225` move every `${{ github.event.inputs.* }}` and `${{ steps.*.outputs.* }}` into `env:` and reference them via shell vars. The Telegram step now uses `printf -v MSG …` instead of pasting `subject`/`new_name` straight into the JS-templated string. No remaining direct interpolation in a `run:` script that I can find.
- Minor: the heredoc delimiter is literal `EOF` (`deploy-play-store.yml:97-100`). Safe today because `git log -1 --format='%s'` is a single line, but if someone ever switches to `%B` (body), a commit containing a lone `EOF` line would prematurely close the heredoc. Cosmetic; pick a random delimiter for hardening.

### Changelog parser — solid hardening ✅
`scripts/extract-changelog.mjs:23-118` replaces the previous regex-slice-and-`new Function()` evaluator with a TS-AST walk that whitelists `ArrayLiteral / ObjectLiteral / StringLiteral / NoSubstitutionTemplateLiteral / Numeric / true / false / null / unary +/-`. Spread, identifiers, calls, templates with `${…}`, getters and methods all throw. Even if the changelog files were ever tampered with, no code path executes. Good change.

### Google Drive URL/file-id handling — good, one caveat ✅
- `src/utils/googleDriveBackup.ts:235-244` — new `assertGoogleApiUrl` is called from `authFetch` and rejects anything that isn't `https://www.googleapis.com`. Prevents an attacker-controlled `fileId` containing `://other-host/…` from re-targeting the bearer token.
- `:310, :359` — both `existingFileId` and `fileId` are now `encodeURIComponent(…)`'d before going into the URL. Tests cover both (`googleDriveBackup.test.ts:188-217`).
- Pre-existing (not in this PR, but adjacent): `findFileIdByName` / `findLatestBackupFile` / `listBackupFiles` interpolate `fileName` into a Drive `q=` query with single-quote delimiters. Today `BACKUP_CONFIG.FILENAME` is a constant, so it's not exploitable — flagging only because it's an idiomatic mismatch with the new defense-in-depth in the same file.

### Real regressions / behavioural concerns 

| Sev | File:Line | Issue |
|---|---|---|
| **Medium** | `src/utils/entryId.ts:11-15` | Dropped `+ Math.floor(Math.random()*1000)`. Single-process monotonicity is preserved by `_lastEntryId`, but two devices generating entries offline in the same millisecond now collide deterministically instead of 1-in-1000. Comment was updated to no longer claim "1000 IDs/ms", but `src/utils/__tests__/entryId.test.ts` only covers single-process. If merge/import dedupes by `id`, this can silently drop a real entry. Was this intentional? If yes, the multi-device path needs explicit verification. |
| **Low** | `src/components/WorkCodeManager.tsx:217` | `autoFocus` removed from the edit-rename `<input>`. The previous flow ("tap pencil → type") now requires an extra tap to focus. |
| **Low** | `src/components/DashboardMonthPicker.tsx:69` | Same `autoFocus` removal on the month picker `<input type="month">`. Modal opens with no field focused. |
| **Low (a11y)** | `src/components/EntryForm.tsx:381,412,430,462` and `src/components/Onboarding/steps/LocaleStep.tsx:177,217` | `<label>` → `<div>` for fields whose actual control is a `<button>`. Lints clean but kills the labelling semantics entirely — screen readers no longer announce "Datum"/"Start"/"Bundesland"/"Kanton" with the value. Fix is `<button aria-labelledby="…">` or `aria-label`, not stripping the label tag. The date `<input>` got `aria-label` (`EntryForm.tsx:395`); the button siblings did not. |
| **Low** | `src/hooks/useFormState.ts:2` | `import type { Entry, } from '../types';` — trailing comma inside the named bindings after removing `EntryType`. Valid, but a leftover from automatic removal. |
| **Low** | `src/components/HelpModal.tsx:3-5` | Pruned `Play, Car, Trash2, Monitor` from `lucide-react` imports. Verify these icons aren't referenced anywhere in the JSX below the cut line (tests pass implies it, but a build-only TS error would not). |

### Residual risks worth keeping in mind
- `biome.json` globally disables `useQwikValidLexicalScope`. This is a React+Capacitor app (no Qwik), so the rule was always a false positive — fine to disable, but worth a one-line `"//": "..."` note in the config so a future contributor doesn't pull Qwik in and lose the rule.
- The `findFileIdByName` SQL-like Drive `q=` injection vector (string-literal escaping in Google Drive queries) is unaddressed — currently safe only because the filename is a constant.
- All the `React` import removals rely on the project's JSX runtime being `react-jsx` (Vite default). Confirmed indirectly by tests passing; no change needed.

Overall: the security-relevant pieces (workflows, parser, Drive URL hardening) are net improvements. The thing I would push back on before merge is the `entryId.ts` randomness removal — it isn't a Codacy-low-risk equivalent change.
