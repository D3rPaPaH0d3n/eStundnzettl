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
  getAllEntries,
  getEntryById,
  insertEntry,
  updateEntryInDb,
  deleteEntryFromDb,
  deleteAllEntriesFromDb,
  bulkInsertEntries,
} from "../entriesRepo";

beforeEach(() => {
  runMock.mockReset();
  queryMock.mockReset();
  executeMock.mockReset();
  executeSetMock.mockReset();
});

describe("getAllEntries", () => {
  it("normalisiert Rohrows zu Entry-Objekten", async () => {
    queryMock.mockResolvedValue([
      {
        id: 1,
        type: "work",
        date: "2026-04-04",
        start: "08:00",
        end: "16:00",
        pause: 30,
        project: "A",
        code: 70,
        netDuration: 450,
      },
    ]);
    const entries = await getAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 1,
      type: "work",
      date: "2026-04-04",
      netDuration: 450,
    });
  });

  it("füllt fehlende Felder mit sinnvollen Defaults", async () => {
    queryMock.mockResolvedValue([
      { id: 2, date: "2026-04-04" }, // minimal row
    ]);
    const entries = await getAllEntries();
    expect(entries[0].type).toBe("work");
    expect(entries[0].start).toBeNull();
    expect(entries[0].end).toBeNull();
    expect(entries[0].pause).toBe(0);
    expect(entries[0].netDuration).toBe(0);
  });
});

describe("getEntryById", () => {
  it("gibt null zurück, wenn die ID nicht existiert", async () => {
    queryMock.mockResolvedValue([]);
    expect(await getEntryById(999)).toBeNull();
  });

  it("liefert den normalisierten Entry bei Treffer", async () => {
    queryMock.mockResolvedValue([
      { id: 5, type: "vacation", date: "2026-04-04", netDuration: 510 },
    ]);
    const entry = await getEntryById(5);
    expect(entry?.id).toBe(5);
    expect(entry?.type).toBe("vacation");
  });
});

describe("insertEntry", () => {
  it("übergibt alle Felder in der erwarteten Reihenfolge", async () => {
    runMock.mockResolvedValue(undefined);
    const entry = {
      id: 1,
      type: "work",
      date: "2026-04-04",
      start: "08:00",
      end: "16:00",
      pause: 30,
      project: "A",
      code: 70,
      netDuration: 450,
    };
    await insertEntry(entry);
    expect(runMock).toHaveBeenCalledOnce();
    const values = runMock.mock.calls[0][1];
    expect(values).toEqual([1, "work", "2026-04-04", "08:00", "16:00", 30, "A", 70, 450]);
  });

  it("setzt Default-Werte für fehlende Felder", async () => {
    runMock.mockResolvedValue(undefined);
    await insertEntry({ id: 2, date: "2026-04-04" });
    const values = runMock.mock.calls[0][1];
    expect(values[1]).toBe("work"); // type default
    expect(values[3]).toBeNull(); // start
    expect(values[4]).toBeNull(); // end
    expect(values[5]).toBe(0); // pause
    expect(values[8]).toBe(0); // netDuration
  });
});

describe("updateEntryInDb", () => {
  it("schickt ein UPDATE mit der ID am Ende", async () => {
    runMock.mockResolvedValue(undefined);
    await updateEntryInDb({
      id: 3,
      type: "work",
      date: "2026-04-04",
      start: "08:00",
      end: "17:00",
      pause: 45,
      project: "B",
      code: 1,
      netDuration: 495,
    });
    const values = runMock.mock.calls[0][1];
    expect(values[values.length - 1]).toBe(3); // id ist letzter Parameter
    expect(runMock.mock.calls[0][0]).toMatch(/UPDATE entries/i);
  });
});

describe("deleteEntryFromDb / deleteAllEntriesFromDb", () => {
  it("schickt DELETE mit Parameter", async () => {
    runMock.mockResolvedValue(undefined);
    await deleteEntryFromDb(7);
    expect(runMock).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM entries/i), [7]);
  });

  it("schickt bulk DELETE ohne Parameter", async () => {
    executeMock.mockResolvedValue(undefined);
    await deleteAllEntriesFromDb();
    expect(executeMock).toHaveBeenCalledWith("DELETE FROM entries;");
  });
});

describe("bulkInsertEntries", () => {
  it("führt bei leerem Input nur DELETE aus (kein executeSet)", async () => {
    executeMock.mockResolvedValue(undefined);
    await bulkInsertEntries([]);
    expect(executeMock).toHaveBeenCalledWith("DELETE FROM entries;");
    expect(executeSetMock).not.toHaveBeenCalled();
  });

  it("wraps Delete + Inserts in einer Transaktion", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkInsertEntries([
      { id: 1, type: "work", date: "2026-04-04", start: "08:00", end: "16:00", pause: 30, netDuration: 450 },
      { id: 2, type: "vacation", date: "2026-04-05", netDuration: 510 },
    ]);
    const [set] = executeSetMock.mock.calls[0];
    expect(set).toHaveLength(3); // 1 DELETE + 2 INSERTs
    expect(set[0].statement).toMatch(/DELETE FROM entries/i);
    expect(set[1].values[0]).toBe(1);
    expect(set[2].values[0]).toBe(2);
  });
});
