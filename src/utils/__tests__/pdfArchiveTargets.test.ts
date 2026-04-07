import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    mkdir: vi.fn(),
    getUri: vi.fn(),
  },
  Directory: { Data: "DATA", Documents: "DOCUMENTS", External: "EXTERNAL", Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));

const mockIsNative = vi.fn(() => false);
const mockGetPlatform = vi.fn(() => "web");

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNative(),
    getPlatform: () => mockGetPlatform(),
  },
}));

vi.mock("../nextcloudClient", () => ({
  uploadBinaryToPath: vi.fn(),
}));

vi.mock("../googleDrivePdfArchive", () => ({
  uploadPdfArchiveFile: vi.fn(),
}));

vi.mock("../obfuscate", () => ({
  deobfuscate: vi.fn((val: string) => Promise.resolve(val)),
}));

vi.mock("../logger", () => ({
  logger: { scope: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }) },
}));

import { Filesystem } from "@capacitor/filesystem";
import { uploadBinaryToPath } from "../nextcloudClient";
import { uploadPdfArchiveFile } from "../googleDrivePdfArchive";
import {
  writeLocalArchive,
  uploadNextcloudArchive,
  uploadGDriveArchive,
} from "../pdfArchiveTargets";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockIsNative.mockReturnValue(false);
  mockGetPlatform.mockReturnValue("web");
});

describe("writeLocalArchive", () => {
  it("triggers blob download on web platform", async () => {
    // jsdom has document, so we can test the web path
    const blob = new Blob(["test"], { type: "application/pdf" });
    const result = await writeLocalArchive("test.pdf", "base64data", blob);
    expect(result.ok).toBe(true);
    expect(result.target).toBe("local-web");
  });

  it("returns error on web when no blob is provided", async () => {
    const result = await writeLocalArchive("test.pdf", "base64data");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Blob");
  });

  it("writes to Documents/eStundnzettl/Archiv on native (stage 1)", async () => {
    mockIsNative.mockReturnValue(true);
    vi.mocked(Filesystem.writeFile).mockResolvedValueOnce({ uri: "file://ok" });

    const result = await writeLocalArchive("test.pdf", "base64data");
    expect(result.ok).toBe(true);
    expect(result.target).toBe("local");
    expect(result.note).toContain("eStundnzettl/Archiv");
  });

  it("falls back to Documents flat when stage 1 fails", async () => {
    mockIsNative.mockReturnValue(true);
    vi.mocked(Filesystem.writeFile)
      .mockRejectedValueOnce(new Error("EACCES"))
      .mockResolvedValueOnce({ uri: "file://ok" });

    const result = await writeLocalArchive("test.pdf", "base64data");
    expect(result.ok).toBe(true);
    expect(result.note).toContain("flach");
  });

  it("falls back to External/Archiv when stage 1+2 fail", async () => {
    mockIsNative.mockReturnValue(true);
    vi.mocked(Filesystem.writeFile)
      .mockRejectedValueOnce(new Error("EACCES"))
      .mockRejectedValueOnce(new Error("EACCES"))
      .mockResolvedValueOnce({ uri: "file://ok" });

    const result = await writeLocalArchive("test.pdf", "base64data");
    expect(result.ok).toBe(true);
    expect(result.note).toContain("app-privat");
  });

  it("returns error when all three stages fail", async () => {
    mockIsNative.mockReturnValue(true);
    vi.mocked(Filesystem.writeFile)
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"))
      .mockRejectedValueOnce(new Error("fail3"));

    const result = await writeLocalArchive("test.pdf", "base64data");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("scheiterten");
    expect(result.target).toBe("local");
  });
});

describe("uploadNextcloudArchive", () => {
  it("returns error when Nextcloud is not configured", async () => {
    const result = await uploadNextcloudArchive("test.pdf", "base64data");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("nicht konfiguriert");
    expect(result.target).toBe("nextcloud");
  });

  it("uploads successfully when credentials are present", async () => {
    localStorage.setItem("estundnzettl_nextcloud_url", "https://nc.example.com");
    localStorage.setItem("estundnzettl_nextcloud_user", "admin");
    localStorage.setItem("estundnzettl_nextcloud_pass", "secret");
    vi.mocked(uploadBinaryToPath).mockResolvedValueOnce(true);

    const result = await uploadNextcloudArchive("test.pdf", "base64data");
    expect(result.ok).toBe(true);
    expect(result.target).toBe("nextcloud");
    expect(uploadBinaryToPath).toHaveBeenCalledWith(
      "https://nc.example.com",
      "admin",
      "secret",
      ["eStundnzettl", "Archiv"],
      "test.pdf",
      "base64data",
      "application/pdf",
    );
  });

  it("returns error on upload failure", async () => {
    localStorage.setItem("estundnzettl_nextcloud_url", "https://nc.example.com");
    localStorage.setItem("estundnzettl_nextcloud_user", "admin");
    localStorage.setItem("estundnzettl_nextcloud_pass", "secret");
    vi.mocked(uploadBinaryToPath).mockRejectedValueOnce(new Error("Upload failed"));

    const result = await uploadNextcloudArchive("test.pdf", "base64data");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Upload failed");
    expect(result.target).toBe("nextcloud");
  });
});

describe("uploadGDriveArchive", () => {
  it("returns error when base64 is empty", async () => {
    const result = await uploadGDriveArchive("test.pdf", "");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("base64");
    expect(result.target).toBe("gdrive");
  });

  it("uploads successfully via googleDrivePdfArchive", async () => {
    vi.mocked(uploadPdfArchiveFile).mockResolvedValueOnce({ id: "file123" });
    const result = await uploadGDriveArchive("test.pdf", "base64data");
    expect(result.ok).toBe(true);
    expect(result.target).toBe("gdrive");
  });

  it("returns error on GDrive upload failure", async () => {
    vi.mocked(uploadPdfArchiveFile).mockRejectedValueOnce(new Error("Auth failed"));
    const result = await uploadGDriveArchive("test.pdf", "base64data");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Auth failed");
    expect(result.target).toBe("gdrive");
  });
});
