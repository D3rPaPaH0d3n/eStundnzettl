import { useEffect, useRef, useCallback } from "react";
import { STORAGE_KEYS, WORK_CODE } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting } from "../db/repositories/settingsRepo";
import type { WorkCode } from "../types";

/**
 * Manages the "last used work code" persistence.
 * Returns a stable getDefaultCode callback.
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
