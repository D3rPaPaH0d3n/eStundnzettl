import { describe, it, expect, vi, beforeEach } from "vitest";

const runMock = vi.fn();
const queryMock = vi.fn();
const executeSetMock = vi.fn();

vi.mock("../../database", () => ({
  run: (...args: unknown[]) => runMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  executeSet: (...args: unknown[]) => executeSetMock(...args),
}));

import {
  getSetting,
  setSetting,
  deleteSetting,
  getAllSettings,
  bulkWriteSettings,
} from "../settingsRepo";

beforeEach(() => {
  runMock.mockReset();
  queryMock.mockReset();
  executeSetMock.mockReset();
});

describe("getSetting", () => {
  it("gibt null zurück, wenn der Key nicht existiert", async () => {
    queryMock.mockResolvedValue([]);
    expect(await getSetting("unknown")).toBeNull();
  });

  it("parst JSON-Werte korrekt", async () => {
    queryMock.mockResolvedValue([{ value: JSON.stringify({ name: "Alice" }) }]);
    expect(await getSetting("user")).toEqual({ name: "Alice" });
  });

  it("liefert Rohwert bei invalidem JSON", async () => {
    queryMock.mockResolvedValue([{ value: "nicht-json" }]);
    expect(await getSetting("x")).toBe("nicht-json");
  });

  it("übergibt den Key als Parameter an query", async () => {
    queryMock.mockResolvedValue([]);
    await getSetting("theme");
    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/SELECT value FROM settings/i), ["theme"]);
  });
});

describe("setSetting", () => {
  it("serialisiert den Wert als JSON und schreibt ihn", async () => {
    runMock.mockResolvedValue(undefined);
    await setSetting("theme", "dark");
    expect(runMock).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO settings/i),
      ["theme", JSON.stringify("dark")]
    );
  });

  it("serialisiert komplexe Objekte", async () => {
    runMock.mockResolvedValue(undefined);
    const userObj = { name: "Bob", workDays: [0, 510, 510, 510, 510, 270, 0] };
    await setSetting("user", userObj);
    expect(runMock).toHaveBeenCalledWith(expect.any(String), ["user", JSON.stringify(userObj)]);
  });
});

describe("deleteSetting", () => {
  it("schickt ein DELETE mit dem Key als Parameter", async () => {
    runMock.mockResolvedValue(undefined);
    await deleteSetting("theme");
    expect(runMock).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM settings/i), ["theme"]);
  });
});

describe("getAllSettings", () => {
  it("parst alle Werte als JSON, wo möglich", async () => {
    queryMock.mockResolvedValue([
      { key: "theme", value: JSON.stringify("dark") },
      { key: "user", value: JSON.stringify({ name: "Alice" }) },
    ]);
    const result = await getAllSettings();
    expect(result.theme).toBe("dark");
    expect(result.user).toEqual({ name: "Alice" });
  });

  it("behandelt invaliden JSON als Rohwert", async () => {
    queryMock.mockResolvedValue([{ key: "raw", value: "roh-string" }]);
    expect(await getAllSettings()).toEqual({ raw: "roh-string" });
  });

  it("liefert leeres Objekt bei leerer Settings-Tabelle", async () => {
    queryMock.mockResolvedValue([]);
    expect(await getAllSettings()).toEqual({});
  });
});

describe("bulkWriteSettings", () => {
  it("macht ein No-Op bei leerem Input", async () => {
    await bulkWriteSettings(null as unknown as Record<string, unknown>);
    await bulkWriteSettings({});
    expect(executeSetMock).not.toHaveBeenCalled();
  });

  it("schreibt alle Einträge in einer Transaktion", async () => {
    executeSetMock.mockResolvedValue(undefined);
    await bulkWriteSettings({ theme: "dark", user: { name: "X" } });
    expect(executeSetMock).toHaveBeenCalledTimes(1);
    const [statements] = executeSetMock.mock.calls[0];
    expect(statements).toHaveLength(2);
    expect(statements[0].values[0]).toBe("theme");
    expect(statements[1].values[0]).toBe("user");
  });
});
