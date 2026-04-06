/**
 * Zentrale Logging-Fassade.
 *
 * - In Development (import.meta.env.DEV === true) werden alle Levels an die Konsole
 *   weitergereicht.
 * - In Production werden `debug` und `info` geschluckt, `warn`/`error` bleiben
 *   aktiv (Terser entfernt im Release-Build zusätzlich alle console-Aufrufe,
 *   das hier ist die zweite Verteidigungslinie).
 *
 * Ziel ist, die ~100 verstreuten `console.*`-Aufrufe in der App batchweise
 * hierher umzuziehen und eine einheitliche Stelle für eine spätere
 * Integration eines echten Logging-Backends (Sentry o. ä.) zu haben.
 */

import toast from "react-hot-toast";

// Vite/import.meta.env Typen sind nicht verfügbar in TypeScript ohne Vite-Konfig
// Wir definieren eine einfache Prüfung für Entwicklungsumgebung
const isDev = (() => {
  try {
    // @ts-ignore - import.meta.env ist Vite-spezifisch
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
})();

function prefixArgs(scope: string | undefined, args: any[]): any[] {
  return scope ? [`[${scope}]`, ...args] : args;
}

export const logger = {
  debug(...args: any[]): void {
    if (!isDev) return;
     
    console.debug(...args);
  },
  info(...args: any[]): void {
    if (!isDev) return;
     
    console.info(...args);
  },
  warn(...args: any[]): void {
     
    console.warn(...args);
  },
  error(...args: any[]): void {
     
    console.error(...args);
  },
  /**
   * Erzeugt einen Logger mit festem Scope-Prefix, z. B. "[BackupSettings] …".
   */
  scope(name: string) {
    return {
      debug: (...args: any[]) => logger.debug(...prefixArgs(name, args)),
      info: (...args: any[]) => logger.info(...prefixArgs(name, args)),
      warn: (...args: any[]) => logger.warn(...prefixArgs(name, args)),
      error: (...args: any[]) => logger.error(...prefixArgs(name, args)),
    };
  },
};

interface ReportErrorOptions {
  scope?: string;
  silent?: boolean;
}

/**
 * Loggt einen Fehler strukturiert und zeigt dem User einen Error-Toast.
 */
export function reportError(err: unknown, userMessage: string, options: ReportErrorOptions = {}): void {
  const { scope, silent = false } = options;
  const prefix = scope ? `[${scope}]` : "[error]";
   
  console.error(prefix, userMessage || "", err);
  if (!silent && userMessage) {
    try {
      toast.error(userMessage);
    } catch {
      /* Toast-System evtl. noch nicht bereit */
    }
  }
}
