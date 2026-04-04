import { describe, it, expect, vi, beforeEach } from "vitest";

const runMock = vi.fn();
const queryMock = vi.fn();
const executeMock = vi.fn();
const executeSetMock = vi.fn();

vi.mock("../../database", () => ({
  run: (...args) => runMock(...args),
  query: (...args) => queryMock(...args),
  execute: (...args) => executeMock(...args),
  executeSet: (...args) => executeSetMock(...args),
}));

import {
  getAllAttachments,
  getAttachmentsByEntryId,
  insertAttachment,
  deleteAttachmentFromDb,
  deleteAttachmentsByEntryId,
  bulkReplaceAttachments,
  getAllLabelSuggestions,
  bulkReplaceLabelSuggestions,
  pushLabelSuggestion,
} from "../attachmentsRepo";

beforeEach(() => {
  runMock.mockReset();
  queryMock.mockReset();
  executeMock.mockReset();
  executeSetMock.mockReset();
});

describe("getAllAttachments", () => {
  it("normalisiert Rohrows zu Attachment-Objekten", async () => {
    queryMock.mockResolvedValue([
      {
        id: "abc",
        entryId: 1,
        label: "Belege",
        fileName: "rechnung.pdf",
        mimeType: "application/pdf",
        storagePath: "attachments/abc.pdf",
        fileSize: 1234,
        createdAt: "2026-04-04T08:00:00Z",
      },
    ]);
    const result = await getAllAttachments();
    expect(result[0].id).toBe("abc");
    expect(result[0].fileSize).toBe(1234);
  });

  it("füllt null-Felder mit Defaults", async () => {
    queryMock.mockResolvedValue([{ id: "x", entryId: 1, label: null, fileSize: null }]);
    const r = await getAllAttachments();
    expect(r[0].label).toBe("");
    expect(r[0].fileSize).toBe(0);
    expect(r[0].fileName).toBe("");
  });
});

describe("getAttachmentsByEntryId", () => {
  it("übergibt entryId als Parameter", async () => {
    queryMock.mockResolvedValue([]);
    await getAttachmentsByEntryId(42);
    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/entryId = \?/i), [42]);
  });
});

describe("insertAttachment", () => {
  it("füllt Default createdAt wenn nicht angegeben", async () => {
    runMock.mockResolvedValue(undefined);
    await insertAttachment({ id: "x", entryId: 1 });
    const values = runMock.mock.calls[0][1];
    expect(values[0]).toBe("x");
    expect(values[1]).toBe(1);
    expect(typeof values[7]).toBe("string"); // createdAt = Default ISO-String
    expect(values[7].length).toBeGreaterThan(10);
  });

  it("respektiert angegebene Felder", async () => {
    runMock.mockResolvedValue(undefined);
    await insertAttachment({
      id: "y",
      entryId: 2,
      label: "Test",
      fileName: "a.pdf",
      mimeType: "application/pdf",
      storagePath: "p",
      fileSize: 999,
      createdAt: "2020-01-01T00:00:00Z",
    });
    const values = runMock.mock.calls[0][1];
    expect(values).toEqual(["y", 2, "Test", "a.pdf", "application/pdf", "p", 999, "2020-01-01T00:00:00Z"]);
  });
});

describe("deleteAttachmentFromDb / deleteAttachmentsByEntryId", () => {
  it("löscht Einzelattachment per ID", async () => {
    runMock.mockResolvedValue(undefined);
    await deleteAttachmentFromDb("abc");
    expect(runMock).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM attachments WHERE id/i),
      ["abc"]
    );
  });

  it("löscht alle Attachments eines Eintrags", async () => {
    runMock.mockResolvedValue(undefined);
    await deleteAttachmentsByEntryId(7);
    expect(runMock).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM attachments WHERE entryId/i),
      [7]
    );
  });
});

describe("bulkReplaceAttachments", () => {
  it("wraps DELETE + INSERTs in einer Transaktion", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkReplaceAttachments([
      { id: "a", entryId: 1, label: "x", fileName: "a.pdf" },
    ]);
    const [set] = executeSetMock.mock.calls[0];
    expect(set).toHaveLength(2);
    expect(set[0].statement).toMatch(/DELETE FROM attachments/i);
  });

  it("behandelt null oder leeres Array korrekt", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkReplaceAttachments(null);
    expect(executeSetMock.mock.calls[0][0]).toHaveLength(1);
  });
});

describe("getAllLabelSuggestions", () => {
  it("extrahiert nur die label-Felder", async () => {
    queryMock.mockResolvedValue([
      { label: "Rechnung", position: 0 },
      { label: "Foto", position: 1 },
    ]);
    const labels = await getAllLabelSuggestions();
    expect(labels).toEqual(["Rechnung", "Foto"]);
  });
});

describe("bulkReplaceLabelSuggestions", () => {
  it("schreibt Labels mit aufsteigender Position", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkReplaceLabelSuggestions(["a", "b", "c"]);
    const [set] = executeSetMock.mock.calls[0];
    expect(set).toHaveLength(4); // DELETE + 3 INSERTs
    expect(set[1].values).toEqual(["a", 0]);
    expect(set[2].values).toEqual(["b", 1]);
    expect(set[3].values).toEqual(["c", 2]);
  });

  it("null → nur DELETE", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkReplaceLabelSuggestions(null);
    expect(executeSetMock.mock.calls[0][0]).toHaveLength(1);
  });
});

describe("pushLabelSuggestion", () => {
  it("ignoriert leere Strings", async () => {
    await pushLabelSuggestion("");
    await pushLabelSuggestion("   ");
    expect(runMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("trimmt Label und schreibt DELETE + UPDATE + INSERT + cap", async () => {
    runMock.mockResolvedValue(undefined);
    executeMock.mockResolvedValue(undefined);
    await pushLabelSuggestion("  Rechnung  ");

    // DELETE für altes Vorkommen
    expect(runMock.mock.calls[0][1]).toEqual(["Rechnung"]);
    // UPDATE position = position + 1
    expect(executeMock.mock.calls[0][0]).toMatch(/position = position \+ 1/i);
    // INSERT an Position 0
    expect(runMock.mock.calls[1][1]).toEqual(["Rechnung"]);
    // DELETE position >= 20 (Cap)
    expect(executeMock.mock.calls[1][0]).toMatch(/position >= 20/i);
  });
});
