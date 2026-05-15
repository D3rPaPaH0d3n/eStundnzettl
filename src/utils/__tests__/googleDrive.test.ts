import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the underlying googleDriveBackup module
const mockEnsureInit = vi.fn();
const mockConnect = vi.fn();
const mockGetNativeStatus = vi.fn();
const mockGetValidToken = vi.fn();
const mockUploadBackupFile = vi.fn();
const mockFindLatest = vi.fn();
const mockDownloadContent = vi.fn();
const mockDisconnect = vi.fn();
const mockGetStoredAuth = vi.fn();

vi.mock("../googleDriveBackup", () => ({
  ensureGoogleAuthInitialized: (...args: unknown[]) => mockEnsureInit(...args),
  connectGoogleDrive: (...args: unknown[]) => mockConnect(...args),
  getNativeStatus: (...args: unknown[]) => mockGetNativeStatus(...args),
  getValidGoogleToken: (...args: unknown[]) => mockGetValidToken(...args),
  uploadBackupFile: (...args: unknown[]) => mockUploadBackupFile(...args),
  findLatestBackupFile: (...args: unknown[]) => mockFindLatest(...args),
  downloadBackupFileContent: (...args: unknown[]) => mockDownloadContent(...args),
  disconnectGoogleDrive: (...args: unknown[]) => mockDisconnect(...args),
  getStoredAuth: (...args: unknown[]) => mockGetStoredAuth(...args),
}));

import {
  initGoogleAuth,
  signInGoogle,
  getValidToken,
  refreshGoogleToken,
  isGoogleLoggedIn,
  signOutGoogle,
  backgroundTokenRefresh,
  uploadOrUpdateFile,
  findLatestBackup,
  downloadFileContent,
} from "../googleDrive";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("initGoogleAuth", () => {
  it("delegates to ensureGoogleAuthInitialized", async () => {
    mockEnsureInit.mockResolvedValueOnce(true);
    await initGoogleAuth();
    expect(mockEnsureInit).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from ensureGoogleAuthInitialized", async () => {
    mockEnsureInit.mockRejectedValueOnce(new Error("GOOGLE_DRIVE_NATIVE_UNAVAILABLE"));
    await expect(initGoogleAuth()).rejects.toThrow("GOOGLE_DRIVE_NATIVE_UNAVAILABLE");
  });
});

describe("getValidToken", () => {
  it("returns access token from underlying module", async () => {
    mockGetValidToken.mockResolvedValueOnce({ accessToken: "tok123" });
    const result = await getValidToken();
    expect(result.accessToken).toBe("tok123");
  });

  it("propagates AUTH_REQUIRED error", async () => {
    mockGetValidToken.mockRejectedValueOnce(new Error("AUTH_REQUIRED"));
    await expect(getValidToken()).rejects.toThrow("AUTH_REQUIRED");
  });
});

describe("refreshGoogleToken", () => {
  it("delegates to getValidGoogleToken", async () => {
    mockGetValidToken.mockResolvedValueOnce({ accessToken: "refreshed" });
    const result = await refreshGoogleToken();
    expect(result.accessToken).toBe("refreshed");
  });
});

describe("uploadOrUpdateFile", () => {
  it("delegates to uploadBackupFile, ignoring accessToken param", async () => {
    mockUploadBackupFile.mockResolvedValueOnce({ id: "file1" });
    const result = await uploadOrUpdateFile("ignored-token", "backup.json", { entries: [] });
    expect(mockUploadBackupFile).toHaveBeenCalledWith("backup.json", { entries: [] });
    expect(result).toEqual({ id: "file1" });
  });

  it("propagates upload errors", async () => {
    mockUploadBackupFile.mockRejectedValueOnce(new Error("Upload Error: 500"));
    await expect(uploadOrUpdateFile("tok", "backup.json", {})).rejects.toThrow("Upload Error");
  });
});

describe("isGoogleLoggedIn", () => {
  it("returns true when hasToken is true", async () => {
    mockGetNativeStatus.mockResolvedValueOnce({ hasToken: true });
    expect(await isGoogleLoggedIn()).toBe(true);
  });

  it("returns false when hasToken is false", async () => {
    mockGetNativeStatus.mockResolvedValueOnce({ hasToken: false });
    expect(await isGoogleLoggedIn()).toBe(false);
  });

  it("returns false when hasToken is undefined", async () => {
    mockGetNativeStatus.mockResolvedValueOnce({});
    expect(await isGoogleLoggedIn()).toBe(false);
  });
});

describe("signInGoogle", () => {
  it("delegates to connectGoogleDrive", async () => {
    const mockResult = { authentication: { accessToken: "tok" }, email: "user@test.com" };
    mockConnect.mockResolvedValueOnce(mockResult);
    const result = await signInGoogle();
    expect(result).toEqual(mockResult);
  });
});

describe("signOutGoogle", () => {
  it("delegates to disconnectGoogleDrive", async () => {
    mockDisconnect.mockResolvedValueOnce(undefined);
    await signOutGoogle();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});

describe("backgroundTokenRefresh", () => {
  it("always returns false", async () => {
    expect(await backgroundTokenRefresh()).toBe(false);
  });
});

describe("findLatestBackup / downloadFileContent", () => {
  it("findLatestBackup delegates to findLatestBackupFile", async () => {
    mockFindLatest.mockResolvedValueOnce({ id: "latest1", name: "backup.json" });
    const result = await findLatestBackup();
    expect(result).toEqual({ id: "latest1", name: "backup.json" });
  });

  it("findLatestBackup returns null when no backup exists", async () => {
    mockFindLatest.mockResolvedValueOnce(null);
    expect(await findLatestBackup()).toBeNull();
  });

  it("downloadFileContent delegates to downloadBackupFileContent", async () => {
    mockDownloadContent.mockResolvedValueOnce({ entries: [{ id: 1 }] });
    const result = await downloadFileContent("ignored-tok", "fileId123");
    expect(mockDownloadContent).toHaveBeenCalledWith("fileId123");
    expect(result).toEqual({ entries: [{ id: 1 }] });
  });
});
