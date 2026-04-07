import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants before import
vi.mock("../../hooks/constants.js", () => ({
  WORK_CODE_PRESETS: {
    kogler: {
      codes: [
        { code: 1, label: "Buero" },
        { code: 2, label: "Baustelle" },
      ],
    },
  },
  STORAGE_KEYS: {
    ENTRIES: "estundnzettl_entries",
    USER: "estundnzettl_user",
    WORK_CODES: "estundnzettl_work_codes",
  },
}));

import { migrateStorageKeys } from "../migration";

beforeEach(() => {
  localStorage.clear();
});

describe("migrateStorageKeys — Key migration (kogler_ -> estundnzettl_)", () => {
  it("migrates kogler_entries to estundnzettl_entries", () => {
    localStorage.setItem("kogler_entries", '[{"id":1}]');
    migrateStorageKeys();
    expect(localStorage.getItem("estundnzettl_entries")).toBe('[{"id":1}]');
    expect(localStorage.getItem("kogler_entries")).toBeNull();
  });

  it("migrates multiple keys at once", () => {
    localStorage.setItem("kogler_user", '{"name":"Max"}');
    localStorage.setItem("kogler_theme", '"dark"');
    localStorage.setItem("kogler_auto_backup", "true");
    migrateStorageKeys();
    expect(localStorage.getItem("estundnzettl_user")).toBe('{"name":"Max"}');
    expect(localStorage.getItem("estundnzettl_theme")).toBe('"dark"');
    expect(localStorage.getItem("estundnzettl_auto_backup")).toBe("true");
  });

  it("does not overwrite existing new keys", () => {
    localStorage.setItem("kogler_entries", '[{"id":1}]');
    localStorage.setItem("estundnzettl_entries", '[{"id":2}]');
    migrateStorageKeys();
    expect(localStorage.getItem("estundnzettl_entries")).toBe('[{"id":2}]');
  });

  it("sets migration flag after running", () => {
    migrateStorageKeys();
    expect(localStorage.getItem("estundnzettl_migrated")).toBe("true");
  });

  it("does not re-run migration when flag is already set", () => {
    localStorage.setItem("estundnzettl_migrated", "true");
    localStorage.setItem("kogler_entries", '[{"id":1}]');
    migrateStorageKeys();
    // kogler_entries should still be there (not migrated)
    expect(localStorage.getItem("kogler_entries")).toBe('[{"id":1}]');
    expect(localStorage.getItem("estundnzettl_entries")).toBeNull();
  });

  it("runs clean without any old keys present", () => {
    expect(() => migrateStorageKeys()).not.toThrow();
    expect(localStorage.getItem("estundnzettl_migrated")).toBe("true");
  });
});

describe("migrateStorageKeys — Work Codes migration", () => {
  it("assigns kogler preset to existing users without work codes", () => {
    localStorage.setItem("estundnzettl_entries", '[{"id":1}]');
    migrateStorageKeys();
    const codes = JSON.parse(localStorage.getItem("estundnzettl_work_codes")!);
    expect(codes).toEqual([
      { code: 1, label: "Buero" },
      { code: 2, label: "Baustelle" },
    ]);
  });

  it("does not assign work codes for new users (no entries)", () => {
    migrateStorageKeys();
    expect(localStorage.getItem("estundnzettl_work_codes")).toBeNull();
  });

  it("does not overwrite existing work codes", () => {
    localStorage.setItem("estundnzettl_entries", '[{"id":1}]');
    localStorage.setItem("estundnzettl_work_codes", '[{"code":99,"label":"Custom"}]');
    migrateStorageKeys();
    const codes = JSON.parse(localStorage.getItem("estundnzettl_work_codes")!);
    expect(codes).toEqual([{ code: 99, label: "Custom" }]);
  });

  it("sets work codes migration flag", () => {
    migrateStorageKeys();
    expect(localStorage.getItem("estundnzettl_workcodes_migrated")).toBe("true");
  });

  it("does not re-run work codes migration when flag is set", () => {
    localStorage.setItem("estundnzettl_workcodes_migrated", "true");
    localStorage.setItem("estundnzettl_entries", '[{"id":1}]');
    migrateStorageKeys();
    expect(localStorage.getItem("estundnzettl_work_codes")).toBeNull();
  });
});
