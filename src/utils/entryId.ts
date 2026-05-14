/**
 * Generiert monoton steigende, kollisionsfreie Entry-IDs.
 *
 * Basis: `Date.now() * 1000` — bleibt innerhalb Number.MAX_SAFE_INTEGER.
 * Zusätzlich wird ein interner Counter hochgezählt, damit auch bei
 * parallelen oder sehr schnellen Aufrufen keine Duplikate entstehen.
 */

let _lastEntryId: number = 0;

export function generateEntryId(): number {
  let id = Date.now() * 1000;
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
