import { useEffect, useState } from "react";
import { APP_VERSION } from "./constants";

const STORAGE_KEY = "last_seen_app_version";

/**
 * useWhatsNewModal — automatische "Was ist neu"-Erkennung beim App-Start.
 *
 * Vergleicht die aktuell laufende Version (aus `APP_VERSION`) mit der
 * Version, die der User beim letzten App-Start gesehen hat (in
 * localStorage). Bei einer Differenz wird `shouldShow=true` gesetzt,
 * sodass das ChangelogModal automatisch mit dem neuesten Eintrag
 * aufgehen kann.
 *
 * Verhalten:
 *   - Erstinstallation: kein Popup (User würde sonst beim allerersten
 *     Start gleich mit einem Changelog erschlagen). Die Version wird
 *     stillschweigend gespeichert.
 *   - Nach Update: `shouldShow=true` exakt einmal. Sobald der User das
 *     Modal schließt (`markSeen()` aufrufen), wird die neue Version
 *     persistiert und der nächste Start zeigt nichts mehr.
 *   - Dev-Builds (`APP_VERSION === 'dev'`): kein Popup, damit lokale
 *     Vite-Sessions nicht ständig auftauchen.
 */
export interface WhatsNewState {
  /** True genau einmal: nach erfolgreicher Versionsänderung. */
  shouldShow: boolean;
  /** Aufrufen wenn der User das Modal geschlossen hat. */
  markSeen: () => void;
}

export function useWhatsNewModal(): WhatsNewState {
  const [shouldShow, setShouldShow] = useState<boolean>(false);

  useEffect(() => {
    if (APP_VERSION === "dev") return;
    let lastSeen: string | null;
    try {
      lastSeen = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Quotabschuss / SSR — nichts zu tun.
      return;
    }
    if (lastSeen === null) {
      // Erstinstallation: nur stumm registrieren.
      try {
        localStorage.setItem(STORAGE_KEY, APP_VERSION);
      } catch {
        /* ignore */
      }
      return;
    }
    if (lastSeen !== APP_VERSION) {
      setShouldShow(true);
    }
  }, []);

  const markSeen = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {
      /* ignore */
    }
    setShouldShow(false);
  };

  return { shouldShow, markSeen };
}

/** Test-Helper: cleared den persistierten Stand. */
export function __resetWhatsNewForTests(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
