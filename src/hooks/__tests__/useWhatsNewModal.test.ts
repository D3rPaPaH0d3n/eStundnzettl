import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../constants", async () => {
  const actual = await vi.importActual<typeof import("../constants")>("../constants");
  return { ...actual, APP_VERSION: "v4.2.1" };
});

import { useWhatsNewModal, __resetWhatsNewForTests } from "../useWhatsNewModal";

describe("useWhatsNewModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetWhatsNewForTests();
  });

  it("zeigt KEIN Modal beim allerersten Start (kein lastSeen vorhanden)", () => {
    const { result } = renderHook(() => useWhatsNewModal());
    expect(result.current.shouldShow).toBe(false);
    // Aber: Version sollte still gespeichert werden
    expect(localStorage.getItem("last_seen_app_version")).toBe("v4.2.1");
  });

  it("zeigt KEIN Modal wenn lastSeen identisch zur aktuellen Version", () => {
    localStorage.setItem("last_seen_app_version", "v4.2.1");
    const { result } = renderHook(() => useWhatsNewModal());
    expect(result.current.shouldShow).toBe(false);
  });

  it("zeigt das Modal wenn lastSeen sich von der aktuellen Version unterscheidet", () => {
    localStorage.setItem("last_seen_app_version", "v4.1.0");
    const { result } = renderHook(() => useWhatsNewModal());
    expect(result.current.shouldShow).toBe(true);
  });

  it("markSeen() persistiert die neue Version und schließt das Modal", () => {
    localStorage.setItem("last_seen_app_version", "v4.1.0");
    const { result } = renderHook(() => useWhatsNewModal());
    expect(result.current.shouldShow).toBe(true);

    act(() => result.current.markSeen());

    expect(result.current.shouldShow).toBe(false);
    expect(localStorage.getItem("last_seen_app_version")).toBe("v4.2.1");
  });
});
