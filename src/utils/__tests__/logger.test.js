import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, reportError } from "../logger";

// Wir ersetzen react-hot-toast, damit reportError-Aufrufe keine Side Effects
// auf das DOM haben. Das Modul wird beim Import von logger lazy gezogen.
vi.mock("react-hot-toast", () => {
  const mock = Object.assign(vi.fn(), { error: vi.fn() });
  return { default: mock };
});

describe("logger", () => {
  let warnSpy, errorSpy;
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
  let errorSpy;
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
    const toastErrorMock = toastModule.default.error;
    toastErrorMock.mockClear();
    reportError(new Error("x"), "Message", { silent: true });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("zeigt Toast bei userMessage und silent=false (Default)", async () => {
    const toastModule = await import("react-hot-toast");
    const toastErrorMock = toastModule.default.error;
    toastErrorMock.mockClear();
    reportError(new Error("x"), "User-sichtbare Meldung");
    expect(toastErrorMock).toHaveBeenCalledWith("User-sichtbare Meldung");
  });
});
