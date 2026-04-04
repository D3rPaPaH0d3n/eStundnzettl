/**
 * Dual-Write-Helper für localStorage + SQLite.
 *
 * Schreibt parallel in beide Backends. Bei SQLite-Fehler wird localStorage
 * zurückgerollt, um den "partial write"-Zustand zu vermeiden. localStorage
 * ist damit unser Sicherheitsnetz, während SQLite die Source of Truth bleibt.
 */

import { isSQLiteActive } from "../db/storageMode";
import { setSetting, deleteSetting } from "../db/repositories/settingsRepo";

export async function dualWriteSync(lsKey, sqlKey, value) {
  const prev = localStorage.getItem(lsKey);
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    try {
      await setSetting(sqlKey, value);
    } catch (e) {
      // Rollback localStorage bei SQLite-Fehler
      if (prev !== null) localStorage.setItem(lsKey, prev);
      else localStorage.removeItem(lsKey);
       
      console.error(`[dualWrite] SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}

export async function dualRemoveSync(lsKey, sqlKey) {
  const prev = localStorage.getItem(lsKey);
  localStorage.removeItem(lsKey);
  if (isSQLiteActive()) {
    try {
      await deleteSetting(sqlKey);
    } catch (e) {
      // Rollback localStorage bei SQLite-Fehler
      if (prev !== null) localStorage.setItem(lsKey, prev);
       
      console.error(`[dualWrite] SQLite-Delete "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}
