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

const isDev = (() => {
  try {
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
})();

function prefixArgs(scope, args) {
  return scope ? [`[${scope}]`, ...args] : args;
}

export const logger = {
  debug(...args) {
    if (!isDev) return;
     
    console.debug(...args);
  },
  info(...args) {
    if (!isDev) return;
     
    console.info(...args);
  },
  warn(...args) {
     
    console.warn(...args);
  },
  error(...args) {
     
    console.error(...args);
  },
  /**
   * Erzeugt einen Logger mit festem Scope-Prefix, z. B. "[BackupSettings] …".
   */
  scope(name) {
    return {
      debug: (...args) => logger.debug(...prefixArgs(name, args)),
      info: (...args) => logger.info(...prefixArgs(name, args)),
      warn: (...args) => logger.warn(...prefixArgs(name, args)),
      error: (...args) => logger.error(...prefixArgs(name, args)),
    };
  },
};

/**
 * Loggt einen Fehler strukturiert und zeigt dem User einen Error-Toast.
 *
 * @param {unknown} err         Die geworfene Error-Instanz (oder beliebiges Objekt).
 * @param {string}  userMessage Kurze, userfreundliche Meldung für den Toast.
 * @param {object}  [options]
 * @param {string}  [options.scope]  Optionaler Scope für das Log.
 * @param {boolean} [options.silent] Wenn true, wird kein Toast gezeigt (nur Log).
 */
export function reportError(err, userMessage, options = {}) {
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
