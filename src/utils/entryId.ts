/**
 * Generiert monoton steigende, kollisionsfreie Entry-IDs.
 *
 * Basis: `Date.now() * 1000` plus kryptografisch zufälliger Offset (0-999) —
 * bleibt innerhalb Number.MAX_SAFE_INTEGER und reduziert Kollisionen zwischen
 * mehreren Offline-Geräten. Zusätzlich wird ein interner Counter hochgezählt,
 * damit lokale schnelle Aufrufe strikt monoton und duplikatfrei bleiben.
 */

let _lastEntryId: number = 0;

function getSecureRandomOffset(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0] % 1000;
  }

  return 0;
}

export function generateEntryId(): number {
  let id = (Date.now() * 1000) + getSecureRandomOffset();
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
