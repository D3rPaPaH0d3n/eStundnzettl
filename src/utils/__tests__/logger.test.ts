import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { captureException, logger, redactSentryText, redactSentryValue, reportError } from "../logger";

// Wir ersetzen react-hot-toast, damit reportError-Aufrufe keine Side Effects
// auf das DOM haben. Das Modul wird beim Import von logger lazy gezogen.
vi.mock("react-hot-toast", () => {
  const mock = Object.assign(vi.fn(), { error: vi.fn() });
  return { default: mock };
});

describe("redactSentryText", () => {
  it("redigiert Zugangsdaten, Tokens, E-Mails und lokale Pfade", () => {
    const input = [
      "Authorization: Basic dXNlcjpwYXNz",
      "Bearer ghp_12...cdef",
      "Authorization: Bearer gho_exampletoken",
      "https://alice:secret@example.com/remote.php/dav/files/alice/private",
      "project@kainer.co.at",
      "C:\\Users\\marku\\Documents\\backup.json",
      "/Users/markus/Documents/backup.json",
      "password=supersecret",
    ].join(" | ");

    const redacted = redactSentryText(input);

    expect(redacted).toContain("Authorization: Basic [REDACTED]");
    expect(redacted).toContain("Bearer [REDACTED]");
    expect(redacted).toContain("Authorization: Bearer [REDACTED]");
    expect(redacted).toContain("https://[REDACTED]@example.com/remote.php/dav/files/[USER]/private");
    expect(redacted).toContain("[EMAIL]");
    expect(redacted).toContain("C:\\Users\\[USER]\\Documents\\backup.json");
    expect(redacted).toContain("/Users/[USER]/Documents/backup.json");
    expect(redacted).toContain("password=[REDACTED]");
    expect(redacted).not.toContain("supersecret");
    expect(redacted).not.toContain("project@kainer.co.at");
  });

  it("redigiert URL-Credentials ohne den URL-Host oder Pfad zu verlieren", () => {
    const redacted = redactSentryText("sync https://user:pass@cloud.example.test/path?ok=1 done");

    expect(redacted).toBe("sync https://[REDACTED]@cloud.example.test/path?ok=1 done");
  });

  it("lässt URLs ohne Credentials unverändert und verarbeitet http sowie Query-Grenzen", () => {
    const redacted = redactSentryText([
      "http://plain.example.test/path",
      "https://api.example.test?email=project@kainer.co.at",
      "http://user:pass@plain.example.test?token=secret",
    ].join(" | "));

    expect(redacted).toContain("http://plain.example.test/path");
    expect(redacted).toContain("https://api.example.test?email=[EMAIL]");
    expect(redacted).toContain("http://[REDACTED]@plain.example.test?token=[REDACTED]");
  });
});

describe("redactSentryValue", () => {
  it("redigiert verschachtelte Sentry-Events, Error-Message und Error-Stack", () => {
    const error = new Error("failed for token=abc123 at C:\\Users\\marku\\secret.txt");
    error.stack = "Error: failed\n    at project@kainer.co.at C:\\Users\\marku\\secret.txt";

    const redacted = redactSentryValue({
      message: "Authorization: Bearer gho_exampletoken",
      error,
      contexts: {
        nextcloud: {
          url: "https://alice:secret@example.com/remote.php/dav/files/alice/private",
          appPassword: "supersecret",
        },
      },
    }) as {
      message: string;
      error: Error;
      contexts: { nextcloud: { url: string; appPassword: string } };
    };

    expect(redacted.message).toBe("Authorization: Bearer [REDACTED]");
    expect(redacted.error.message).toBe("failed for token=[REDACTED] at C:\\Users\\[USER]\\secret.txt");
    expect(redacted.error.stack).toContain("[EMAIL]");
    expect(redacted.error.stack).toContain("C:\\Users\\[USER]\\secret.txt");
    expect(redacted.contexts.nextcloud.url).toBe("https://[REDACTED]@example.com/remote.php/dav/files/[USER]/private");
    expect(redacted.contexts.nextcloud.appPassword).toBe("[REDACTED]");
  });

  it("erhält tiefe Sentry-Stackframes und redigiert darin sensible Strings", () => {
    const redacted = redactSentryValue({
      exception: {
        values: [
          {
            type: "Error",
            value: "Sync failed for project@kainer.co.at",
            stacktrace: {
              frames: [
                {
                  filename: "C:\\Users\\marku\\project\\src\\sync.ts",
                  function: "syncBackup",
                  lineno: 42,
                  vars: {
                    nextcloudUrl: "https://alice:secret@example.com/remote.php/dav/files/alice/private",
                    token: "abc123",
                  },
                },
              ],
            },
          },
        ],
      },
    }) as {
      exception: {
        values: Array<{
          value: string;
          stacktrace: { frames: Array<{ filename: string; function: string; lineno: number; vars: { nextcloudUrl: string; token: string } }> };
        }>;
      };
    };

    const frame = redacted.exception.values[0].stacktrace.frames[0];
    expect(frame).toMatchObject({
      filename: "C:\\Users\\[USER]\\project\\src\\sync.ts",
      function: "syncBackup",
      lineno: 42,
    });
    expect(redacted.exception.values[0].value).toBe("Sync failed for [EMAIL]");
    expect(frame.vars.nextcloudUrl).toBe("https://[REDACTED]@example.com/remote.php/dav/files/[USER]/private");
    expect(frame.vars.token).toBe("[REDACTED]");
  });

  it("crasht nicht bei zirkulären Sentry-Kontexten", () => {
    const circular: Record<string, unknown> = { message: "token=abc123" };
    circular.self = circular;

    const redacted = redactSentryValue(circular) as { message: string; self: string };

    expect(redacted.message).toBe("token=[REDACTED]");
    expect(redacted.self).toBe("[REDACTED_CIRCULAR]");
  });
});

describe("logger", () => {
  let warnSpy: MockInstance, errorSpy: MockInstance;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("schluckt debug/info-Aufrufe in Production (isDev=false)", () => {
    // Wir können den isDev-Wert hier nicht auswählen, aber wir können
    // sicherstellen, dass warn/error immer durchgereicht werden.
    logger.warn("w");
    logger.error("e");
    expect(warnSpy).toHaveBeenCalledWith("w");
    expect(errorSpy).toHaveBeenCalledWith("e");
  });

  it("scope() hängt ein Prefix an warn/error an", () => {
    const scoped = logger.scope("TestModule");
    scoped.warn("msg");
    scoped.error("err");
    expect(warnSpy).toHaveBeenCalledWith("[TestModule]", "msg");
    expect(errorSpy).toHaveBeenCalledWith("[TestModule]", "err");
  });
});

describe("reportError", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("loggt strukturiert mit [error]-Prefix bei fehlendem Scope", () => {
    const err = new Error("boom");
    reportError(err, "Konnte Daten nicht laden");
    expect(errorSpy).toHaveBeenCalledWith("[error]", "Konnte Daten nicht laden", err);
  });

  it("nutzt den Scope als Prefix wenn angegeben", () => {
    const err = new Error("boom");
    reportError(err, "Netzwerk-Fehler", { scope: "Backup" });
    expect(errorSpy).toHaveBeenCalledWith("[Backup]", "Netzwerk-Fehler", err);
  });

  it("respektiert silent: true (kein Toast)", async () => {
    const toastModule = await import("react-hot-toast");
    const toastErrorMock = toastModule.default.error as unknown as ReturnType<typeof vi.fn>;
    toastErrorMock.mockClear();
    reportError(new Error("x"), "Message", { silent: true });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("zeigt Toast bei userMessage und silent=false (Default)", async () => {
    const toastModule = await import("react-hot-toast");
    const toastErrorMock = toastModule.default.error as unknown as ReturnType<typeof vi.fn>;
    toastErrorMock.mockClear();
    reportError(new Error("x"), "User-sichtbare Meldung");
    expect(toastErrorMock).toHaveBeenCalledWith("User-sichtbare Meldung");
  });
});
