import { useEffect, useRef, useCallback } from "react";
import { WORK_CODE } from "./constants";
import { loadLastCode } from "../utils/lastCode";
import type { WorkCode } from "../types";

/**
 * useLastCode — Liefert eine stabile `getDefaultCode()`-Callback,
 * die den zuletzt vom User ausgewählten Work Code zurückgibt.
 *
 * Beim Mount wird der letzte Code aus SQLite/settingsRepo gelesen.
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
  const lastCodeRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLastCode()
      .then((code) => {
        if (!cancelled) lastCodeRef.current = code;
      })
      .catch(() => {
        if (!cancelled) lastCodeRef.current = null;
      });
    return () => { cancelled = true; };
  }, []);

  return useCallback(() => {
    const lastCode = lastCodeRef.current;
    if (lastCode !== null) return lastCode;
    if (hasAnyCodes) return workCodes[0].id;
    return WORK_CODE.DEFAULT;
  }, [hasAnyCodes, workCodes]);
}
