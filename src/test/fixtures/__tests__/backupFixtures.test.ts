import { describe, it, expect } from "vitest";
import { parseBackupPayloadSafe } from "../../../schemas/backup";

import backupV1 from "../backups/localstorage-backup-v1.json";
import backupV2 from "../backups/localstorage-backup-v2.json";
import backupV3 from "../backups/localstorage-backup-v3.json";
import backupV6 from "../backups/backup-v6.json";
import sqliteSample from "../sqlite/schema-with-sample-data.json";

const backupFixtures = [backupV1, backupV2, backupV3, backupV6];

function collectSensitiveValues(value: unknown, path: string[] = []): Array<{ path: string; value: string }> {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectSensitiveValues(item, [...path, String(index)]));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const currentPath = [...path, key];
    const isSensitiveKey = /(pass|password|token|secret)/i.test(key);
    const own = isSensitiveKey && typeof nested === "string"
      ? [{ path: currentPath.join("."), value: nested }]
      : [];
    return [...own, ...collectSensitiveValues(nested, currentPath)];
  });
}

describe("backup and SQLite safety fixtures", () => {
  it("includes legacy localStorage backups v1-v3 and current backup v6 that parse safely", () => {
    for (const fixture of backupFixtures) {
      const result = parseBackupPayloadSafe(fixture);
      expect(result.success, `fixture ${String((fixture as { version?: unknown }).version)} should parse`).toBe(true);
    }

    expect(backupFixtures.map((fixture) => (fixture as { version?: string }).version)).toEqual([
      "v1",
      "v2",
      "v3",
      "v6",
    ]);
  });

  it("documents a SQLite sample with all safety-relevant tables", () => {
    const tables = Object.keys((sqliteSample as { tables: Record<string, unknown[]> }).tables);

    expect(tables).toEqual(expect.arrayContaining([
      "entries",
      "settings",
      "work_codes",
      "attachments",
      "attachment_labels",
      "backup_metadata",
    ]));
    expect((sqliteSample as { schemaVersionRows: Array<{ version: number }> }).schemaVersionRows.map((row) => row.version)).toEqual([1, 2]);
  });

  it("keeps fixtures demo-only and free of real-looking credentials", () => {
    const allFixtures = { backupFixtures, sqliteSample };
    const text = JSON.stringify(allFixtures);

    expect(text).not.toMatch(/AIza[0-9A-Za-z_-]+/);
    expect(text).not.toMatch(/ya29\.[0-9A-Za-z_-]+/);
    expect(text).not.toMatch(/gh[pousr]_[0-9A-Za-z_]+/);
    expect(text).not.toMatch(/sk-[0-9A-Za-z_-]+/);
    expect(text).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(text).not.toMatch(/https:\/\/(?!cloud\.invalid)/);

    const sensitiveValues = collectSensitiveValues(allFixtures);
    expect(sensitiveValues).toEqual([
      { path: "backupFixtures.2.legacySettings.nextcloudPass", value: "obf:REVNTy1PTkxZ" },
    ]);
    expect(text).toContain("obf:REVNTy1PTkxZ");
  });
});
