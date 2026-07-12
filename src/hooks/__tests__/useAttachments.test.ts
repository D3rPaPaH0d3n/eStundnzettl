import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attachment } from "../../types";

const deleteFileMock = vi.fn();
const getAllAttachmentsMock = vi.fn();
const deleteAttachmentFromDbMock = vi.fn();

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Filesystem: {
    deleteFile: (...args: unknown[]) => deleteFileMock(...args),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: () => true,
}));

vi.mock("../../db/repositories/attachmentsRepo", () => ({
  getAllAttachments: (...args: unknown[]) => getAllAttachmentsMock(...args),
  getAllLabelSuggestions: vi.fn().mockResolvedValue([]),
  insertAttachment: vi.fn(),
  deleteAttachmentFromDb: (...args: unknown[]) => deleteAttachmentFromDbMock(...args),
  pushLabelSuggestion: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useAttachments } from "../useAttachments";

const attachments: Attachment[] = [
  {
    id: "att-1",
    entryId: 7,
    label: "Beleg",
    fileName: "beleg.pdf",
    mimeType: "application/pdf",
    storagePath: "attachments/att-1.pdf",
    fileSize: 100,
    createdAt: "2026-07-11T10:00:00.000Z",
  },
  {
    id: "att-2",
    entryId: 8,
    label: "Foto",
    fileName: "foto.jpg",
    mimeType: "image/jpeg",
    storagePath: "attachments/att-2.jpg",
    fileSize: 200,
    createdAt: "2026-07-11T11:00:00.000Z",
  },
];

describe("useAttachments.removeAttachmentsForEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllAttachmentsMock.mockResolvedValue(attachments);
    deleteFileMock.mockResolvedValue(undefined);
  });

  it("bereinigt nach dem DB-Commit nur State und Dateien", async () => {
    const { result } = renderHook(() => useAttachments());

    await vi.waitFor(() => expect(result.current.attachments).toHaveLength(2));

    await act(async () => {
      await result.current.removeAttachmentsForEntry(7);
    });

    expect(result.current.attachments.map((item) => item.id)).toEqual(["att-2"]);
    expect(deleteFileMock).toHaveBeenCalledWith({
      path: "attachments/att-1.pdf",
      directory: "DATA",
    });
    expect(deleteAttachmentFromDbMock).not.toHaveBeenCalled();
  });

  it("lässt eine fehlgeschlagene Dateibereinigung den erfolgreichen Delete nicht kippen", async () => {
    deleteFileMock.mockRejectedValueOnce(new Error("file missing"));
    const { result } = renderHook(() => useAttachments());

    await vi.waitFor(() => expect(result.current.attachments).toHaveLength(2));

    await expect(act(async () => {
      await result.current.removeAttachmentsForEntry(7);
    })).resolves.toBeUndefined();

    expect(result.current.attachments.map((item) => item.id)).toEqual(["att-2"]);
  });
});
