import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ─── Mocks (VOR Hook-Import) ───────────────────────────────────────

vi.mock("../constants", async () => {
  const actual = await vi.importActual<typeof import("../constants")>("../constants");
  return { ...actual, APP_VERSION: "v4.2.1" };
});

const mockInstallSourceGet = vi.fn();
vi.mock("../../plugins/InstallSourcePlugin", async () => {
  const actual = await vi.importActual<
    typeof import("../../plugins/InstallSourcePlugin")
  >("../../plugins/InstallSourcePlugin");
  return {
    ...actual,
    InstallSource: { get: (...args: unknown[]) => mockInstallSourceGet(...args) },
  };
});

const mockIsNativePlatform = vi.fn(() => true);
vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => mockIsNativePlatform(),
    },
  };
});

vi.mock("../../utils/logger", () => ({
  logger: {
    scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import {
  useUpdateAvailable,
  __resetUpdateAvailableForTests,
  __compareSemver,
} from "../useUpdateAvailable";

// ─── Helpers ───────────────────────────────────────────────────────

function mockFetchOnce(payload: unknown, ok = true): void {
  globalThis.fetch = vi.fn().mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("compareSemver", () => {
  it("erkennt eine größere Version", () => {
    expect(__compareSemver("4.3.0", "4.2.1")).toBeGreaterThan(0);
  });
  it("erkennt eine kleinere Version", () => {
    expect(__compareSemver("4.2.0", "4.2.1")).toBeLessThan(0);
  });
  it("erkennt Gleichheit", () => {
    expect(__compareSemver("4.2.1", "4.2.1")).toBe(0);
  });
  it("akzeptiert v-Präfix beidseitig", () => {
    expect(__compareSemver("v4.3.0", "v4.2.1")).toBeGreaterThan(0);
    expect(__compareSemver("v4.2.1", "4.2.1")).toBe(0);
  });
  it("ignoriert Pre-Release-Suffix für Reihenfolge", () => {
    expect(__compareSemver("4.3.0-rc1", "4.2.1")).toBeGreaterThan(0);
  });
});

describe("useUpdateAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNativePlatform.mockReturnValue(true);
    __resetUpdateAvailableForTests();
  });

  it("schweigt bei Play-Store-Install", async () => {
    mockInstallSourceGet.mockResolvedValue({ installer: "com.android.vending" });
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { result } = renderHook(() => useUpdateAvailable());

    await waitFor(() => {
      expect(mockInstallSourceGet).toHaveBeenCalled();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.available).toBe(false);
  });

  it("schweigt wenn Install-Source-Probe selbst wirft (fail-closed)", async () => {
    mockInstallSourceGet.mockRejectedValue(new Error("plugin missing"));
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    renderHook(() => useUpdateAvailable());

    await waitFor(() => {
      expect(mockInstallSourceGet).toHaveBeenCalled();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("zeigt Update an wenn GitHub eine neuere Version hat (sideload)", async () => {
    mockInstallSourceGet.mockResolvedValue({ installer: null });
    mockFetchOnce({
      tag_name: "v4.3.0",
      html_url: "https://github.com/D3rPaPaH0d3n/eStundnzettl/releases/tag/v4.3.0",
      draft: false,
      prerelease: false,
    });

    const { result } = renderHook(() => useUpdateAvailable());

    await waitFor(() => {
      expect(result.current.available).toBe(true);
    });
    expect(result.current.latestTag).toBe("v4.3.0");
    expect(result.current.htmlUrl).toContain("/v4.3.0");
  });

  it("zeigt KEIN Update an wenn GitHub-Tag identisch zur installierten Version", async () => {
    mockInstallSourceGet.mockResolvedValue({ installer: null });
    mockFetchOnce({
      tag_name: "v4.2.1",
      html_url: "https://github.com/foo/bar/releases/tag/v4.2.1",
      draft: false,
      prerelease: false,
    });

    const { result } = renderHook(() => useUpdateAvailable());

    await waitFor(() => {
      expect(mockInstallSourceGet).toHaveBeenCalled();
    });
    expect(result.current.available).toBe(false);
  });

  it("ignoriert pre-releases und drafts", async () => {
    mockInstallSourceGet.mockResolvedValue({ installer: null });
    mockFetchOnce({
      tag_name: "v5.0.0",
      html_url: "https://example.com",
      prerelease: true,
    });

    const { result } = renderHook(() => useUpdateAvailable());

    await waitFor(() => {
      expect(mockInstallSourceGet).toHaveBeenCalled();
    });
    expect(result.current.available).toBe(false);
  });

  it("dismiss() persistiert die Version und versteckt den Banner", async () => {
    mockInstallSourceGet.mockResolvedValue({ installer: null });
    mockFetchOnce({
      tag_name: "v4.3.0",
      html_url: "https://example.com/v4.3.0",
      draft: false,
      prerelease: false,
    });

    const { result } = renderHook(() => useUpdateAvailable());
    await waitFor(() => expect(result.current.available).toBe(true));

    act(() => result.current.dismiss());

    expect(result.current.available).toBe(false);
    expect(localStorage.getItem("github_update_dismissed_for_version")).toBe("v4.3.0");
  });

  it("Banner bleibt versteckt nach Re-Mount für die gleiche dismissed Version", async () => {
    localStorage.setItem("github_update_dismissed_for_version", "v4.3.0");
    mockInstallSourceGet.mockResolvedValue({ installer: null });
    mockFetchOnce({
      tag_name: "v4.3.0",
      html_url: "https://example.com",
      draft: false,
      prerelease: false,
    });

    const { result } = renderHook(() => useUpdateAvailable());

    await waitFor(() => {
      expect(result.current.latestTag).toBe("v4.3.0");
    });
    expect(result.current.available).toBe(false);
  });

  it("nutzt Cache wenn jünger als 24h und überspringt fetch", async () => {
    localStorage.setItem("github_update_last_check_ts", String(Date.now() - 1000));
    localStorage.setItem(
      "github_update_last_result",
      JSON.stringify({
        latestTag: "v4.3.0",
        htmlUrl: "https://example.com/v4.3.0",
      }),
    );
    mockInstallSourceGet.mockResolvedValue({ installer: null });
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { result } = renderHook(() => useUpdateAvailable());

    await waitFor(() => expect(result.current.available).toBe(true));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
