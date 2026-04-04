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
  getAllWorkCodes,
  insertWorkCode,
  updateWorkCodeInDb,
  deleteWorkCodeFromDb,
  deleteAllWorkCodes,
  bulkReplaceWorkCodes,
} from "../workCodesRepo";

beforeEach(() => {
  runMock.mockReset();
  queryMock.mockReset();
  executeMock.mockReset();
  executeSetMock.mockReset();
});

describe("getAllWorkCodes", () => {
  it("normalisiert Rohrows zu WorkCode-Objekten", async () => {
    queryMock.mockResolvedValue([
      { id: 70, label: "Büro" },
      { id: 19, label: "Fahrzeit" },
    ]);
    const codes = await getAllWorkCodes();
    expect(codes).toEqual([
      { id: 70, label: "Büro" },
      { id: 19, label: "Fahrzeit" },
    ]);
  });

  it("füllt fehlendes label als leeren String", async () => {
    queryMock.mockResolvedValue([{ id: 1, label: null }]);
    const codes = await getAllWorkCodes();
    expect(codes[0].label).toBe("");
  });
});

describe("insertWorkCode", () => {
  it("schickt INSERT OR REPLACE mit id und label", async () => {
    runMock.mockResolvedValue(undefined);
    await insertWorkCode({ id: 42, label: "Kaffeepause" });
    expect(runMock).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO work_codes/i),
      [42, "Kaffeepause"]
    );
  });
});

describe("updateWorkCodeInDb", () => {
  it("schickt UPDATE mit label zuerst, dann id", async () => {
    runMock.mockResolvedValue(undefined);
    await updateWorkCodeInDb(5, "Neu");
    expect(runMock).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE work_codes SET label/i),
      ["Neu", 5]
    );
  });
});

describe("deleteWorkCodeFromDb / deleteAllWorkCodes", () => {
  it("DELETE mit ID-Parameter für Einzellöschung", async () => {
    runMock.mockResolvedValue(undefined);
    await deleteWorkCodeFromDb(3);
    expect(runMock).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM work_codes/i), [3]);
  });

  it("bulk DELETE ohne Parameter", async () => {
    executeMock.mockResolvedValue(undefined);
    await deleteAllWorkCodes();
    expect(executeMock).toHaveBeenCalledWith("DELETE FROM work_codes;");
  });
});

describe("bulkReplaceWorkCodes", () => {
  it("kombiniert DELETE + INSERT-Statements in einer Transaktion", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkReplaceWorkCodes([
      { id: 1, label: "A" },
      { id: 2, label: "B" },
    ]);
    const [set] = executeSetMock.mock.calls[0];
    expect(set).toHaveLength(3);
    expect(set[0].statement).toMatch(/DELETE FROM work_codes/i);
    expect(set[1].values).toEqual([1, "A"]);
    expect(set[2].values).toEqual([2, "B"]);
  });

  it("schickt nur DELETE bei leerem Array", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkReplaceWorkCodes([]);
    const [set] = executeSetMock.mock.calls[0];
    expect(set).toHaveLength(1);
    expect(set[0].statement).toMatch(/DELETE FROM work_codes/i);
  });

  it("behandelt null als leeres Array", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkReplaceWorkCodes(null);
    const [set] = executeSetMock.mock.calls[0];
    expect(set).toHaveLength(1);
  });
});
