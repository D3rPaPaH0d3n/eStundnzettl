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

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  connectGoogleDrivePdf,
  disconnectGoogleDrivePdf,
  getValidGoogleTokenPdf,
  getGoogleDrivePdfStatus,
  uploadPdfArchiveFile,
  AUTH_SCOPE_PDF,
  TOKEN_STORAGE_KEY_PDF,
  FOLDER_ID_STORAGE_KEY,
  getStoredAuthPdf,
} from "../googleDrivePdfArchive";

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  // Clear module-level session token cache by calling disconnect
  // (which internally calls clearStoredAuthPdf -> cacheSessionTokenPdf(null))
  await disconnectGoogleDrivePdf();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("connectGoogleDrivePdf", () => {
  it("returns authentication and email on success", async () => {
    mockConnect.mockResolvedValueOnce({
      accessToken: "pdf-tok-123",
      accountEmail: "user@example.com",
      source: "native-plugin",
    });

    const result = await connectGoogleDrivePdf();
    expect(result.authentication).toEqual({ accessToken: "pdf-tok-123" });
    expect(result.email).toBe("user@example.com");
  });

  it("passes drive.file scope to connect", async () => {
    mockConnect.mockResolvedValueOnce({ accessToken: "tok" });
    await connectGoogleDrivePdf();
    expect(mockConnect).toHaveBeenCalledWith({ scope: AUTH_SCOPE_PDF });
  });

  it("saves auth state to localStorage on success", async () => {
    mockConnect.mockResolvedValueOnce({
      accessToken: "tok",
      accountEmail: "user@example.com",
    });

    await connectGoogleDrivePdf();
    const stored = JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY_PDF)!);
    expect(stored.scope).toBe(AUTH_SCOPE_PDF);
    expect(stored.accountEmail).toBe("user@example.com");
    expect(stored.nativeConnected).toBe(true);
  });

  it("throws when no accessToken is returned", async () => {
    mockConnect.mockResolvedValueOnce({ accountEmail: "user@example.com" });
    await expect(connectGoogleDrivePdf()).rejects.toThrow();
  });

  it("clears stored auth on error", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY_PDF, JSON.stringify({ accountEmail: "old" }));
    mockConnect.mockRejectedValueOnce(new Error("CANCELLED"));

    await expect(connectGoogleDrivePdf()).rejects.toThrow("GOOGLE_DRIVE_AUTH_CANCELLED");
    expect(localStorage.getItem(TOKEN_STORAGE_KEY_PDF)).toBeNull();
  });

  it("maps 'not implemented' to GOOGLE_DRIVE_NATIVE_UNAVAILABLE", async () => {
    mockConnect.mockRejectedValueOnce(new Error("not implemented"));
    await expect(connectGoogleDrivePdf()).rejects.toThrow("GOOGLE_DRIVE_NATIVE_UNAVAILABLE");
  });
});

describe("disconnectGoogleDrivePdf", () => {
  it("clears localStorage keys", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY_PDF, JSON.stringify({ test: true }));
    localStorage.setItem(FOLDER_ID_STORAGE_KEY, "folder123");

    await disconnectGoogleDrivePdf();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY_PDF)).toBeNull();
    expect(localStorage.getItem(FOLDER_ID_STORAGE_KEY)).toBeNull();
  });

  it("calls getStatus with drive.file scope before disconnect", async () => {
    await disconnectGoogleDrivePdf();
    expect(mockGetStatus).toHaveBeenCalledWith({ scope: AUTH_SCOPE_PDF });
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});

describe("getValidGoogleTokenPdf", () => {
  it("refreshes token via native plugin", async () => {
    mockRefreshToken.mockResolvedValueOnce({
      accessToken: "refreshed-pdf-tok",
      accountEmail: "user@example.com",
    });

    const result = await getValidGoogleTokenPdf();
    expect(result.accessToken).toBe("refreshed-pdf-tok");
  });

  it("passes drive.file scope to refreshToken", async () => {
    mockRefreshToken.mockResolvedValueOnce({ accessToken: "tok" });
    await getValidGoogleTokenPdf();
    expect(mockRefreshToken).toHaveBeenCalledWith({ scope: AUTH_SCOPE_PDF });
  });

  it("throws AUTH_REQUIRED when refresh returns no token", async () => {
    mockRefreshToken.mockResolvedValueOnce({});
    await expect(getValidGoogleTokenPdf()).rejects.toThrow("AUTH_REQUIRED");
  });

  it("throws AUTH_REQUIRED when refresh fails with AUTH_REQUIRED", async () => {
    mockRefreshToken.mockRejectedValueOnce(new Error("AUTH_REQUIRED"));
    await expect(getValidGoogleTokenPdf()).rejects.toThrow("AUTH_REQUIRED");
  });
});

describe("getGoogleDrivePdfStatus", () => {
  it("returns status from native plugin", async () => {
    mockGetStatus.mockResolvedValueOnce({
      connected: true,
      hasToken: true,
      reauthRequired: false,
      accountEmail: "user@example.com",
    });
    localStorage.setItem(TOKEN_STORAGE_KEY_PDF, JSON.stringify({ nativeConnected: true }));

    const status = await getGoogleDrivePdfStatus();
    expect(status.available).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.scope).toBe(AUTH_SCOPE_PDF);
    expect(status.accountEmail).toBe("user@example.com");
  });

  it("returns error info when plugin throws", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY_PDF, JSON.stringify({
      nativeConnected: true,
      accountEmail: "stored@example.com",
    }));
    mockGetStatus.mockRejectedValueOnce(new Error("Plugin crash"));

    const status = await getGoogleDrivePdfStatus();
    expect(status.available).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.hasToken).toBe(false);
    expect(typeof status.error).toBe("string");
  });
});

describe("uploadPdfArchiveFile", () => {
  it("throws when base64 is empty", async () => {
    await expect(uploadPdfArchiveFile("test.pdf", "")).rejects.toThrow("base64 fehlt");
  });

  it("throws when base64 is not a string", async () => {
    await expect(uploadPdfArchiveFile("test.pdf", null as unknown as string)).rejects.toThrow("base64 fehlt");
  });
});

describe("getStoredAuthPdf", () => {
  it("returns null when no stored auth", () => {
    expect(getStoredAuthPdf()).toBeNull();
  });

  it("returns parsed auth from localStorage", () => {
    localStorage.setItem(TOKEN_STORAGE_KEY_PDF, JSON.stringify({ accountEmail: "test@x.com" }));
    const stored = getStoredAuthPdf();
    expect(stored?.accountEmail).toBe("test@x.com");
  });

  it("returns null on corrupted JSON", () => {
    localStorage.setItem(TOKEN_STORAGE_KEY_PDF, "not json");
    expect(getStoredAuthPdf()).toBeNull();
  });
});

describe("AUTH_SCOPE_PDF constant", () => {
  it("is set to drive.file", () => {
    expect(AUTH_SCOPE_PDF).toBe("https://www.googleapis.com/auth/drive.file");
  });
});
