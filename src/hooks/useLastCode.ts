import { useEffect, useRef, useCallback } from "react";
import { STORAGE_KEYS, WORK_CODE } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting } from "../db/repositories/settingsRepo";
import type { WorkCode } from "../types";

/**
 * useLastCode — Liefert eine stabile `getDefaultCode()`-Callback,
 * die den zuletzt vom User ausgewählten Work Code zurückgibt.
 *
 * Beim Mount wird der letzte Code aus localStorage
 * (`STORAGE_KEYS.LAST_CODE`) gelesen, bei aktivem SQLite zusätzlich
 * async aus der Settings-Tabelle (der SQLite-Wert überschreibt den
 * localStorage-Wert wenn er existiert).
 *
 * Reihenfolge der Fallbacks in `getDefaultCode()`:
 * 1. Der zuletzt verwendete Code (Ref)
 * 2. Der erste WorkCode in der Liste (falls vorhanden)
 * 3. `WORK_CODE.DEFAULT` (hardcoded Fallback)
 *
 * @param hasAnyCodes — ob der User überhaupt WorkCodes hat
 * @param workCodes — aktuelle Liste aller WorkCodes (Fallback)
 *
 * @returns Stabile Callback-Funktion, die bei jedem Aufruf die
 *          aktuelle Default-Code-Id zurückgibt.
 */
export function useLastCode({
  hasAnyCodes,
  workCodes,
}: {
  hasAnyCodes: boolean;
  workCodes: WorkCode[];
}): () => number {
  const lastCodeRef = useRef(localStorage.getItem(STORAGE_KEYS.LAST_CODE));

  useEffect(() => {
    let cancelled = false;
    if (isSQLiteActive()) {
      (async () => {
        try {
          const sqlVal = await getSetting("last_code");
          if (!cancelled && sqlVal !== null) {
            lastCodeRef.current = String(sqlVal);
          }
        } catch { /* keep localStorage value */ }
      })();
    }
    return () => { cancelled = true; };
  }, []);

  return useCallback(() => {
    const lastCode = lastCodeRef.current || localStorage.getItem(STORAGE_KEYS.LAST_CODE);
    if (lastCode) return Number(lastCode);
    if (hasAnyCodes) return workCodes[0].id;
    return WORK_CODE.DEFAULT;
  }, [hasAnyCodes, workCodes]);
}
