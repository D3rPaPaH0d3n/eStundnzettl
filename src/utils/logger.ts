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

function isTextDelimiter(char: string): boolean {
  return char === "" || char === " " || char === "\n" || char === "\r" || char === "\t" || char === "|" || char === "," || char === ";";
}

function findUrlEnd(value: string, start: number): number {
  let end = start;
  while (end < value.length && !isTextDelimiter(value[end])) {
    end += 1;
  }
  return end;
}

function findNextHttpScheme(value: string, start: number): { index: number; schemeLength: number } | null {
  const http = value.indexOf("http://", start);
  const https = value.indexOf("https://", start);
  if (http === -1 && https === -1) return null;
  if (https !== -1 && (http === -1 || https < http)) return { index: https, schemeLength: "https://".length };
  return { index: http, schemeLength: "http://".length };
}

function redactUrlCredentials(value: string): string {
  let result = "";
  let cursor = 0;
  let next = findNextHttpScheme(value, cursor);

  while (next) {
    const schemeEnd = next.index + next.schemeLength;
    const urlEnd = findUrlEnd(value, schemeEnd);
    const authorityEndCandidates = ["/", "?", "#"]
      .map((separator) => value.indexOf(separator, schemeEnd))
      .filter((index) => index !== -1 && index < urlEnd);
    const authorityEnd = authorityEndCandidates.length ? Math.min(...authorityEndCandidates) : urlEnd;
    const authority = value.slice(schemeEnd, authorityEnd);
    const atIndex = authority.lastIndexOf("@");
    const colonIndex = authority.indexOf(":");

    if (atIndex > 0 && colonIndex > 0 && colonIndex < atIndex) {
      result += value.slice(cursor, schemeEnd) + "[REDACTED]" + value.slice(schemeEnd + atIndex, urlEnd);
    } else {
      result += value.slice(cursor, urlEnd);
    }

    cursor = urlEnd;
    next = findNextHttpScheme(value, cursor);
  }

  return result + value.slice(cursor);
}

export function redactSentryText(value: string): string {
  return redactUrlCredentials(value)
    .replace(/Authorization:\s*Basic\s+[^\s|,;]+/gi, "Authorization: Basic [REDACTED]")
    .replace(/Authorization:\s*Bearer\s+[^\s|,;]+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/\bBearer\s+[^\s|,;]+/gi, "Bearer [REDACTED]")
    .replace(/\/remote\.php\/dav\/files\/[^/\s|,;]+/gi, "/remote.php/dav/files/[USER]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b(C:\\Users\\)[^\\\s|,;]+/gi, "$1[USER]")
    .replace(/\/Users\/[^/\s|,;]+/g, "/Users/[USER]")
    .replace(/\b(password|pass|token|secret|appPassword)=([^\s|,;]+)/gi, "$1=[REDACTED]");
}

function isSensitiveSentryKey(key: string): boolean {
  return /password|pass|token|secret|authorization|cookie/i.test(key);
}

export function redactSentryValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 50) return "[REDACTED_DEPTH]";
  if (typeof value === "string") return redactSentryText(value);
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[REDACTED_CIRCULAR]";

  seen.add(value);
  try {
    if (value instanceof Error) {
      const redacted = new Error(redactSentryText(value.message));
      redacted.name = value.name;
      redacted.stack = value.stack ? redactSentryText(value.stack) : value.stack;
      if ("cause" in value) {
        (redacted as Error & { cause?: unknown }).cause = redactSentryValue((value as Error & { cause?: unknown }).cause, depth + 1, seen);
      }
      for (const [key, nested] of Object.entries(value as Error & Record<string, unknown>)) {
        (redacted as Error & Record<string, unknown>)[key] = isSensitiveSentryKey(key)
          ? "[REDACTED]"
          : redactSentryValue(nested, depth + 1, seen);
      }
      return redacted;
    }

    if (Array.isArray(value)) return value.map((item) => redactSentryValue(item, depth + 1, seen));

    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveSentryKey(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactSentryValue(nested, depth + 1, seen);
      }
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

function redactArgs(args: unknown[]): unknown[] {
  return args.map((arg) => redactSentryValue(arg));
}

/**
 * Initializes Sentry if a DSN is configured and we're in production.

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
      beforeSend(event) {
        return redactSentryValue(event) as typeof event;
      },
    });
  }).catch(() => {
    // Sentry failed to load — app startup must stay unaffected.
  });
}

function sendToSentry(level: 'error' | 'warning', args: unknown[]): void {
  if (!shouldUseSentry()) return;

  void loadSentry().then((Sentry) => {
    const redactedArgs = redactArgs(args);
    const firstArg = redactedArgs[0];
    if (level === 'error') {
      if (firstArg instanceof Error) {
        Sentry.captureException(firstArg);
      } else {
        Sentry.captureException(new Error(redactedArgs.map(String).join(' ')));
      }
    } else {
      Sentry.captureMessage(redactedArgs.map(String).join(' '), level);
    }
  }).catch(() => {
    // Sentry not initialized or failed — silently ignore
  });
}

export function captureException(error: unknown, context?: Parameters<SentryModule["captureException"]>[1]): void {
  if (!shouldUseSentry()) return;

  void loadSentry().then((Sentry) => {
    Sentry.captureException(redactSentryValue(error), redactSentryValue(context) as typeof context);
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
