/**
 * Generiert monoton steigende, kollisionsfreie Entry-IDs.
 *
 * Basis: `Date.now() * 1000 + random(0..999)` — bleibt innerhalb
 * Number.MAX_SAFE_INTEGER und ermöglicht bis zu 1000 IDs pro ms.
 * Zusätzlich wird ein interner Counter hochgezählt, damit auch bei
 * parallelen Aufrufen in derselben ms keine Duplikate entstehen.
 */

let _lastEntryId = 0;

export function generateEntryId(): number {
  let id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  if (id <= _lastEntryId) id = _lastEntryId + 1;
  _lastEntryId = id;
  return id;
}

/**
 * Nur für Tests: setzt den internen Counter zurück.
 */
export function _resetEntryIdCounterForTests(): void {
  _lastEntryId = 0;
}
