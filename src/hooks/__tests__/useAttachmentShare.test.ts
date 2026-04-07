import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    getUri: vi.fn().mockResolvedValue({ uri: "file:///data/cache/test.pdf" }),
  },
  Directory: { Cache: "Cache" },
}));

vi.mock("../../plugins/MultiSharePlugin", () => ({
  MultiShare: {
    shareMultiple: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });
  return { default: fn };
});

import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { MultiShare } from "../../plugins/MultiSharePlugin";
import toast from "react-hot-toast";
import { useAttachmentShare } from "../useAttachmentShare";
import type { Attachment } from "../../types";

// ─── Helpers ────────────────────────────────────────────────

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "att-1",
    entryId: 1,
    label: "Rechnung",
    fileName: "rechnung.pdf",
    mimeType: "application/pdf",
    storagePath: "attachments/rechnung.pdf",
    fileSize: 1024,
    createdAt: "2026-04-06T10:00:00Z",
    ...overrides,
  };
}

const mockReadAttachmentFile = vi.fn().mockResolvedValue("base64data==");

function mount() {
  return renderHook(() =>
    useAttachmentShare({ readAttachmentFile: mockReadAttachmentFile })
  );
}

// ─── Tests ──────────────────────────────────────────────────

describe("useAttachmentShare", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns shareReportBundle function", () => {
    const { result } = mount();
    expect(typeof result.current.shareReportBundle).toBe("function");
  });

  it("throws if not on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { result } = mount();

    await expect(
      act(async () => {
        await result.current.shareReportBundle({
          pdfFile: { storagePath: "test.pdf" },
        });
      })
    ).rejects.toThrow("Multi-Share wird nur in der Android-App unterstützt");
  });

  it("throws if pdfFile.storagePath is missing", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { result } = mount();

    await expect(
      act(async () => {
        await result.current.shareReportBundle({
          pdfFile: { storagePath: "" },
        });
      })
    ).rejects.toThrow("PDF fehlt");
  });

  it("shares PDF file via MultiShare", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { result } = mount();

    await act(async () => {
      await result.current.shareReportBundle({
        pdfFile: { storagePath: "report.pdf" },
      });
    });

    expect(Filesystem.getUri).toHaveBeenCalled();
    expect(MultiShare.shareMultiple).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [
          expect.objectContaining({
            path: "/data/cache/test.pdf",
            mimeType: "application/pdf",
          }),
        ],
        chooserTitle: "Stundenzettel",
      })
    );
  });

  it("includes attachments in the share bundle", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const attachment = makeAttachment();
    const { result } = mount();

    await act(async () => {
      await result.current.shareReportBundle({
        pdfFile: { storagePath: "report.pdf" },
        attachments: [attachment],
      });
    });

    expect(mockReadAttachmentFile).toHaveBeenCalledWith(attachment);
    expect(Filesystem.writeFile).toHaveBeenCalled();
    expect(MultiShare.shareMultiple).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.arrayContaining([
          expect.objectContaining({ mimeType: "application/pdf" }),
          expect.objectContaining({ mimeType: "application/pdf" }),
        ]),
        chooserTitle: "Stundenzettel + 1 Dokument",
      })
    );
  });

  it("pluralizes chooserTitle for multiple attachments", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const att1 = makeAttachment({ id: "att-1" });
    const att2 = makeAttachment({ id: "att-2", fileName: "foto.jpg", mimeType: "image/jpeg" });
    const { result } = mount();

    await act(async () => {
      await result.current.shareReportBundle({
        pdfFile: { storagePath: "report.pdf" },
        attachments: [att1, att2],
      });
    });

    expect(MultiShare.shareMultiple).toHaveBeenCalledWith(
      expect.objectContaining({
        chooserTitle: "Stundenzettel + 2 Dokumente",
      })
    );
  });

  it("shows success toast after sharing", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { result } = mount();

    await act(async () => {
      await result.current.shareReportBundle({
        pdfFile: { storagePath: "report.pdf" },
      });
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Datei")
    );
  });

  it("silently ignores canceled share intent", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(MultiShare.shareMultiple).mockRejectedValueOnce(
      new Error("Share canceled by user")
    );
    const { result } = mount();

    // Should not throw
    await act(async () => {
      await result.current.shareReportBundle({
        pdfFile: { storagePath: "report.pdf" },
      });
    });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("strips file:// prefix from URIs", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Filesystem.getUri).mockResolvedValue({
      uri: "file:///storage/emulated/0/report.pdf",
    });
    const { result } = mount();

    await act(async () => {
      await result.current.shareReportBundle({
        pdfFile: { storagePath: "report.pdf" },
      });
    });

    expect(MultiShare.shareMultiple).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.arrayContaining([
          expect.objectContaining({
            path: "/storage/emulated/0/report.pdf",
          }),
        ]),
      })
    );
  });
});
