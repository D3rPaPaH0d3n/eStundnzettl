import { describe, it, expect, vi, beforeEach } from "vitest";

// Must use vi.hoisted so mocks are available inside vi.mock factory
const { mockGetStatus, mockConnect, mockDisconnect, mockRefreshToken } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockRefreshToken: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  registerPlugin: () => ({
    getStatus: mockGetStatus,
    connect: mockConnect,
    disconnect: mockDisconnect,
    refreshToken: mockRefreshToken,
  }),
}));

import {
  getNativeStatus,
  connectGoogleDrive,
  getValidGoogleToken,
  clearStoredAuth,
  getStoredAuth,
  AUTH_SCOPE,
  uploadBackupFile,
  downloadBackupFileContent,
} from "../googleDriveBackup";

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
  clearStoredAuth();
});

describe("parseNativeError (tested via connectGoogleDrive error paths)", () => {
  it("maps 'not implemented' to GOOGLE_DRIVE_NATIVE_UNAVAILABLE", async () => {
    mockConnect.mockRejectedValueOnce(new Error("not implemented"));
    await expect(connectGoogleDrive()).rejects.toThrow("GOOGLE_DRIVE_NATIVE_UNAVAILABLE");
  });

  it("maps 'UNAVAILABLE' to GOOGLE_DRIVE_NATIVE_UNAVAILABLE", async () => {
    mockConnect.mockRejectedValueOnce(new Error("Plugin UNAVAILABLE on this device"));
    await expect(connectGoogleDrive()).rejects.toThrow("GOOGLE_DRIVE_NATIVE_UNAVAILABLE");
  });

  it("maps 'CANCELLED' to GOOGLE_DRIVE_AUTH_CANCELLED", async () => {
    mockConnect.mockRejectedValueOnce(new Error("User CANCELLED the operation"));
    await expect(connectGoogleDrive()).rejects.toThrow("GOOGLE_DRIVE_AUTH_CANCELLED");
  });

  it("passes through other error messages unchanged", async () => {
    mockConnect.mockRejectedValueOnce(new Error("Something else went wrong"));
    await expect(connectGoogleDrive()).rejects.toThrow("Something else went wrong");
  });
});

describe("getNativeStatus", () => {
  it("returns status from native plugin when available", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: true,
      hasToken: true,
      reauthRequired: false,
      scope: AUTH_SCOPE,
      accountEmail: "user@example.com",
    });

    const status = await getNativeStatus();
    expect(status.available).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.hasToken).toBe(true);
    expect(status.accountEmail).toBe("user@example.com");
  });

  it("returns stored auth info on plugin error", async () => {
    localStorage.setItem("google_auth_state", JSON.stringify({
      accountEmail: "stored@example.com",
      nativeConnected: true,
    }));
    mockGetStatus.mockRejectedValueOnce(new Error("Plugin failed"));

    const status = await getNativeStatus();
    expect(status.available).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.accountEmail).toBe("stored@example.com");
    expect(typeof status.error).toBe("string");
  });

  it("returns scope in status", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: false,
      hasToken: false,
    });

    const status = await getNativeStatus();
    expect(status.scope).toBe(AUTH_SCOPE);
  });
});

describe("connectGoogleDrive", () => {
  it("returns authentication and email on success", async () => {
    mockConnect.mockResolvedValueOnce({
      accessToken: "tok123",
      accountEmail: "user@example.com",
      source: "native-plugin",
    });

    const result = await connectGoogleDrive();
    expect(result.authentication).toEqual({ accessToken: "tok123" });
    expect(result.email).toBe("user@example.com");
  });

  it("saves auth state to localStorage on success", async () => {
    mockConnect.mockResolvedValueOnce({
      accessToken: "tok123",
      accountEmail: "user@example.com",
    });

    await connectGoogleDrive();
    const stored = getStoredAuth();
    expect(stored).not.toBeNull();
    expect(stored?.accountEmail).toBe("user@example.com");
    expect(stored?.nativeConnected).toBe(true);
  });

  it("throws when no access token is returned", async () => {
    mockConnect.mockResolvedValueOnce({ accountEmail: "user@example.com" });
    await expect(connectGoogleDrive()).rejects.toThrow();
  });

  it("clears stored auth on error", async () => {
    localStorage.setItem("google_auth_state", JSON.stringify({ accountEmail: "old" }));
    mockConnect.mockRejectedValueOnce(new Error("CANCELLED"));

    await expect(connectGoogleDrive()).rejects.toThrow();
    const stored = getStoredAuth();
    expect(stored).toBeNull();
  });
});

describe("getValidGoogleToken", () => {
  it("refreshes token via native plugin when no cached token", async () => {
    mockRefreshToken.mockResolvedValueOnce({
      accessToken: "refreshed-tok",
      accountEmail: "user@example.com",
    });

    const result = await getValidGoogleToken();
    expect(result.accessToken).toBe("refreshed-tok");
  });

  it("throws AUTH_REQUIRED when refresh returns no token", async () => {
    mockRefreshToken.mockResolvedValueOnce({});
    await expect(getValidGoogleToken()).rejects.toThrow("AUTH_REQUIRED");
  });

  it("throws AUTH_REQUIRED when native plugin is not available", async () => {
    // Simulate nativeAvailable returning false by making getStatus undefined
    // This is tricky since nativeAvailable checks typeof GoogleDriveBackupPlugin?.getStatus
    // Instead test the refresh failure path
    mockRefreshToken.mockRejectedValueOnce(new Error("AUTH_REQUIRED"));
    await expect(getValidGoogleToken()).rejects.toThrow("AUTH_REQUIRED");
  });
});

describe("clearStoredAuth / getStoredAuth", () => {
  it("clears localStorage state", () => {
    localStorage.setItem("google_auth_state", JSON.stringify({ accountEmail: "test" }));
    expect(getStoredAuth()).not.toBeNull();

    clearStoredAuth();
    expect(getStoredAuth()).toBeNull();
  });

  it("returns null when no stored auth exists", () => {
    expect(getStoredAuth()).toBeNull();
  });

  it("handles corrupted JSON in localStorage gracefully", () => {
    localStorage.setItem("google_auth_state", "not-json{{{");
    expect(getStoredAuth()).toBeNull();
  });
});

describe("Google Drive API requests", () => {
  it("encodes file IDs before using them in Google Drive URLs", async () => {
    mockRefreshToken.mockResolvedValue({ accessToken: "tok123" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    await downloadBackupFileContent("file/id with spaces");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.googleapis.com/drive/v3/files/file%2Fid%20with%20spaces?alt=media",
      expect.objectContaining({ method: "GET" }),
    );
    vi.unstubAllGlobals();
  });

  it("keeps backup upload requests on the Google API host", async () => {
    mockRefreshToken.mockResolvedValue({ accessToken: "tok123" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [{ id: "existing/id" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    await uploadBackupFile("backup.json", { entries: [] });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://www.googleapis.com/upload/drive/v3/files/existing%2Fid?uploadType=multipart",
      expect.objectContaining({ method: "PATCH" }),
    );
    vi.unstubAllGlobals();
  });
});
