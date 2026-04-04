import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks MÜSSEN vor dem Import stehen ──────────────────────

const setSettingMock = vi.fn();
const deleteSettingMock = vi.fn();
let sqliteActive = true;

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: () => sqliteActive,
}));
vi.mock("../../db/repositories/settingsRepo", () => ({
  setSetting: (...args) => setSettingMock(...args),
  deleteSetting: (...args) => deleteSettingMock(...args),
}));

import { dualWriteSync, dualRemoveSync } from "../dualWrite";

// Minimal localStorage Polyfill (jsdom liefert es bereits, wir resetten nur)
function resetStorage() {
  localStorage.clear();
}

describe("dualWriteSync", () => {
  beforeEach(() => {
    resetStorage();
    setSettingMock.mockReset();
    sqliteActive = true;
  });

  it("schreibt in localStorage und SQLite", async () => {
    setSettingMock.mockResolvedValue(undefined);
    await dualWriteSync("lsKey", "sqlKey", "foo");
    expect(localStorage.getItem("lsKey")).toBe("foo");
    expect(setSettingMock).toHaveBeenCalledWith("sqlKey", "foo");
  });

  it("rollback localStorage bei SQLite-Fehler (neuer Wert)", async () => {
    setSettingMock.mockRejectedValue(new Error("SQLite down"));
    await dualWriteSync("lsKey", "sqlKey", "neu");
    expect(localStorage.getItem("lsKey")).toBeNull();
  });

  it("rollback localStorage bei SQLite-Fehler zum vorherigen Wert", async () => {
    localStorage.setItem("lsKey", "alt");
    setSettingMock.mockRejectedValue(new Error("SQLite down"));
    await dualWriteSync("lsKey", "sqlKey", "neu");
    expect(localStorage.getItem("lsKey")).toBe("alt");
  });

  it("schreibt nur in localStorage wenn SQLite inaktiv ist", async () => {
    sqliteActive = false;
    await dualWriteSync("lsKey", "sqlKey", "foo");
    expect(localStorage.getItem("lsKey")).toBe("foo");
    expect(setSettingMock).not.toHaveBeenCalled();
  });
});

describe("dualRemoveSync", () => {
  beforeEach(() => {
    resetStorage();
    deleteSettingMock.mockReset();
    sqliteActive = true;
  });

  it("entfernt aus localStorage und SQLite", async () => {
    localStorage.setItem("lsKey", "vorhanden");
    deleteSettingMock.mockResolvedValue(undefined);
    await dualRemoveSync("lsKey", "sqlKey");
    expect(localStorage.getItem("lsKey")).toBeNull();
    expect(deleteSettingMock).toHaveBeenCalledWith("sqlKey");
  });

  it("rollback localStorage bei SQLite-Fehler", async () => {
    localStorage.setItem("lsKey", "vorhanden");
    deleteSettingMock.mockRejectedValue(new Error("SQLite down"));
    await dualRemoveSync("lsKey", "sqlKey");
    expect(localStorage.getItem("lsKey")).toBe("vorhanden");
  });
});
