/**
 * Zentrale Logging-Fassade.
 *
 * - In Development (import.meta.env.DEV === true) werden alle Levels an die Konsole
 *   weitergereicht.
 * - In Production werden `debug` und `info` geschluckt, `warn`/`error` bleiben
 *   aktiv (Terser entfernt im Release-Build zusätzlich alle console-Aufrufe,
 *   das hier ist die zweite Verteidigungslinie).
 * - In Production mit Sentry DSN: `error` → Sentry.captureException,
 *   `warn` → Sentry.captureMessage (optional).
 */

import toast from "react-hot-toast";
import type * as SentryType from "@sentry/react";

const isDev = (() => {
  try {
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
})();

interface ScopedLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

type SentryModule = typeof SentryType;

const getSentryDsn = (): string => {
  try {
    return typeof __SENTRY_DSN__ !== "undefined" ? __SENTRY_DSN__ : "";
  } catch {
    return "";
  }
};

let sentryModulePromise: Promise<SentryModule> | null = null;

function shouldUseSentry(): boolean {
  return !isDev && !!getSentryDsn();
}

function loadSentry(): Promise<SentryModule> {
  sentryModulePromise ||= import("@sentry/react");
  return sentryModulePromise;
}

function prefixArgs(scope: string, args: unknown[]): unknown[] {
  return scope ? [`[${scope}]`, ...args] : args;
}

/**
 * Initializes Sentry if a DSN is configured and we're in production.
 * Called once from main.tsx.
 */
export function initSentry(): void {
  const dsn = getSentryDsn();
  if (!dsn || isDev) return;

  void loadSentry().then((Sentry) => {
    Sentry.init({
      dsn,
      release: typeof __APP_VERSION__ !== 'undefined' ? `estundnzettl@${__APP_VERSION__}` : undefined,
      environment: 'production',
      // Only send 10% of transactions for performance monitoring
      tracesSampleRate: 0.1,
      // Don't send session replays
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  }).catch(() => {
    // Sentry failed to load — app startup must stay unaffected.
  });
}

function sendToSentry(level: 'error' | 'warning', args: unknown[]): void {
  if (!shouldUseSentry()) return;

  void loadSentry().then((Sentry) => {
    const firstArg = args[0];
    if (level === 'error') {
      if (firstArg instanceof Error) {
        Sentry.captureException(firstArg);
      } else {
        Sentry.captureException(new Error(args.map(String).join(' ')));
      }
    } else {
      Sentry.captureMessage(args.map(String).join(' '), level);
    }
  }).catch(() => {
    // Sentry not initialized or failed — silently ignore
  });
}

export function captureException(error: unknown, context?: Parameters<SentryModule["captureException"]>[1]): void {
  if (!shouldUseSentry()) return;

  void loadSentry().then((Sentry) => {
    Sentry.captureException(error, context);
  }).catch(() => {
    // Sentry not initialized or failed — silently ignore
  });
}

export const logger = {
  debug(...args: unknown[]): void {
    if (!isDev) return;
    console.debug(...args);
  },
  info(...args: unknown[]): void {
    if (!isDev) return;
    console.info(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
    sendToSentry('warning', args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
    sendToSentry('error', args);
  },
  /**
   * Erzeugt einen Logger mit festem Scope-Prefix, z. B. "[BackupSettings] …".
   */
  scope(name: string): ScopedLogger {
    return {
      debug: (...args: unknown[]) => logger.debug(...prefixArgs(name, args)),
      info: (...args: unknown[]) => logger.info(...prefixArgs(name, args)),
      warn: (...args: unknown[]) => logger.warn(...prefixArgs(name, args)),
      error: (...args: unknown[]) => logger.error(...prefixArgs(name, args)),
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
export function reportError(err: unknown, userMessage: string, options: { scope?: string; silent?: boolean } = {}): void {
  const { scope, silent = false } = options;
  const prefix = scope ? `[${scope}]` : "[error]";

  console.error(prefix, userMessage || "", err);
  sendToSentry('error', [prefix, userMessage, err]);

  if (!silent && userMessage) {
    try {
      toast.error(userMessage);
    } catch {
      /* Toast-System evtl. noch nicht bereit */
    }
  }
}
