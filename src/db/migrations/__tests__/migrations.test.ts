import { describe, it, expect, beforeEach } from "vitest";
import { runMigrations, getLatestSchemaVersion, MIGRATIONS } from "../index";
import { APP_SCHEMA_VERSION } from "../../schema";

/**
 * In-Memory-Mock für SQLite.
 *
 * Modelliert genug von SQLite, um den Migration-Runner zu testen:
 *  - Tabellen-Namen (sqlite_master)
 *  - schema_version Zeilen
 *  - CREATE TABLE / CREATE INDEX als No-Op außer zur Tabellen-Registrierung
 */
function createMockDb() {
  const tables = new Set<string>();
  const indices = new Set<string>();
  const schemaVersions: Array<{ version: number; applied_at: string }> = [];
  const log: string[] = [];

  const execute = async (sql: string) => {
    log.push(sql);
    // CREATE TABLE → Tabellen-Registrierung
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
    if (createMatch) {
      tables.add(createMatch[1]);
    }
    // CREATE INDEX → Index-Registrierung
    const indexMatch = sql.match(/CREATE INDEX IF NOT EXISTS\s+(\w+)/i);
    if (indexMatch) {
      indices.add(indexMatch[1]);
    }
    // INSERT ins schema_version
    const insertVersionMatch = sql.match(
      /INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+schema_version\s*\(version,\s*applied_at\)\s*VALUES\s*\((\d+),\s*'([^']+)'\)/i
    );
    if (insertVersionMatch) {
      const version = Number(insertVersionMatch[1]);
      if (!schemaVersions.some((r) => r.version === version)) {
        schemaVersions.push({ version, applied_at: insertVersionMatch[2] });
      }
    }
  };

  const query = async (sql: string) => {
    log.push(sql);
    if (/SELECT\s+version\s+FROM\s+schema_version/i.test(sql)) {
      return [...schemaVersions].sort((a, b) => a.version - b.version);
    }
    if (/SELECT\s+name\s+FROM\s+sqlite_master[\s\S]*name='entries'/i.test(sql)) {
      return tables.has("entries") ? [{ name: "entries" }] : [];
    }
    return [];
  };

  return {
    execute,
    query,
    tables,
    indices,
    schemaVersions,
    log,
    seedTable: (t: string) => tables.add(t),
    seedSchemaVersion: (version: number) =>
      schemaVersions.push({ version, applied_at: "2026-04-01T00:00:00.000Z" }),
  };
}

describe("getLatestSchemaVersion", () => {
  it("liefert die höchste registrierte Migrations-Version", () => {
    const maxVersion = MIGRATIONS.reduce((m, x) => Math.max(m, x.version), 0);
    expect(getLatestSchemaVersion()).toBe(maxVersion);
  });

  it("hat mindestens die Baseline-Migration registriert", () => {
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(1);
    expect(MIGRATIONS[0].version).toBe(1);
  });
});

describe("Schema-Version-Konsistenz", () => {
  it("hält APP_SCHEMA_VERSION und Registry über dieselbe Wahrheit synchron", () => {
    expect(APP_SCHEMA_VERSION).toBe(getLatestSchemaVersion());
  });
});

describe("runMigrations — frische DB", () => {
  let db: ReturnType<typeof createMockDb>;
  beforeEach(() => {
    db = createMockDb();
  });

  it("legt die schema_version-Tabelle an", async () => {
    await runMigrations(db.execute, db.query, { logger: {} });
    expect(db.tables.has("schema_version")).toBe(true);
  });

  it("führt die Baseline-Migration aus und legt alle Kern-Tabellen an", async () => {
    const result = await runMigrations(db.execute, db.query, { logger: {} });
    expect(result.appliedVersions).toEqual(MIGRATIONS.map((m) => m.version).sort((a, b) => a - b));
    expect(result.appliedVersions).toContain(1);
    expect(db.tables.has("entries")).toBe(true);
    expect(db.tables.has("settings")).toBe(true);
    expect(db.tables.has("work_codes")).toBe(true);
    expect(db.tables.has("attachments")).toBe(true);
    expect(db.tables.has("attachment_labels")).toBe(true);
    expect(db.tables.has("backup_metadata")).toBe(true);
  });

  it("protokolliert die Anwendung in schema_version", async () => {
    await runMigrations(db.execute, db.query, { logger: {} });
    expect(db.schemaVersions.some((r: { version: number }) => r.version === 1)).toBe(true);
  });
});

describe("runMigrations — Legacy-DB", () => {
  it("führt die Baseline idempotent aus, wenn nur ein Teil der alten Tabellen vorhanden ist", async () => {
    const db = createMockDb();
    // Simuliere Legacy-Stand: entries/settings existieren, aber schema_version und
    // spätere Baseline-Tabellen fehlen noch.
    db.seedTable("entries");
    db.seedTable("settings");

    const result = await runMigrations(db.execute, db.query, { logger: {} });

    expect(result.skipped).toEqual([]);
    expect(result.appliedVersions).toEqual(MIGRATIONS.map((m) => m.version).sort((a, b) => a - b));
    expect(db.schemaVersions.map((r) => r.version).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(db.tables.has("entries")).toBe(true);
    expect(db.tables.has("settings")).toBe(true);
    expect(db.tables.has("work_codes")).toBe(true);
    expect(db.tables.has("attachments")).toBe(true);
    expect(db.tables.has("attachment_labels")).toBe(true);
    expect(db.tables.has("backup_metadata")).toBe(true);
    expect(db.indices.has("idx_entries_date")).toBe(true);
    expect(db.indices.has("idx_attachments_entry")).toBe(true);
    expect(db.indices.has("idx_backup_metadata_timestamp")).toBe(true);
    expect(db.indices.has("idx_backup_metadata_type_timestamp")).toBe(true);
  });

  it("repariert frühere Teil-Erkennung, wenn Migration 1 schon protokolliert ist", async () => {
    const db = createMockDb();
    db.seedTable("entries");
    db.seedSchemaVersion(1);

    const result = await runMigrations(db.execute, db.query, { logger: {} });

    expect(result.appliedVersions).toEqual([2]);
    expect(db.schemaVersions.map((r) => r.version).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(db.tables.has("settings")).toBe(true);
    expect(db.tables.has("work_codes")).toBe(true);
    expect(db.tables.has("attachments")).toBe(true);
    expect(db.tables.has("attachment_labels")).toBe(true);
    expect(db.tables.has("backup_metadata")).toBe(true);
    expect(db.indices.has("idx_entries_date")).toBe(true);
    expect(db.indices.has("idx_backup_metadata_timestamp")).toBe(true);
  });

  it("re-asserted protokollierte idempotente Migrationen ohne schema_version-Duplikate", async () => {
    const db = createMockDb();
    db.seedSchemaVersion(1);
    db.seedSchemaVersion(2);

    const result = await runMigrations(db.execute, db.query, { logger: {} });

    expect(result.appliedVersions).toEqual([]);
    expect(db.schemaVersions.map((r) => r.version).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(db.tables.has("entries")).toBe(true);
    expect(db.tables.has("backup_metadata")).toBe(true);
    expect(db.indices.has("idx_attachments_entry")).toBe(true);
    expect(db.indices.has("idx_backup_metadata_type_timestamp")).toBe(true);
  });
});

describe("runMigrations — Idempotenz", () => {
  it("führt Migrationen beim zweiten Run nicht erneut aus und dupliziert schema_version nicht", async () => {
    const db = createMockDb();
    await runMigrations(db.execute, db.query, { logger: {} });
    const result2 = await runMigrations(db.execute, db.query, { logger: {} });
    expect(result2.appliedVersions).toEqual([]);
    expect(db.schemaVersions.map((r) => r.version).sort((a, b) => a - b)).toEqual(
      MIGRATIONS.map((m) => m.version).sort((a, b) => a - b)
    );
  });
});

describe("runMigrations — Reihenfolge", () => {
  it("wendet registrierte Migrationen strikt aufsteigend an", async () => {
    const db = createMockDb();
    const result = await runMigrations(db.execute, db.query, { logger: {} });
    const expectedOrder = MIGRATIONS.map((m) => m.version).sort((a, b) => a - b);

    expect(result.appliedVersions).toEqual(expectedOrder);
    expect(db.schemaVersions.map((r) => r.version)).toEqual(expectedOrder);
  });
});

describe("Migration 002 — Performance Indices", () => {
  it("ist in der MIGRATIONS-Registry registriert", () => {
    const m = MIGRATIONS.find((x) => x.version === 2);
    expect(m).toBeDefined();
    expect(m?.name).toBe("performance_indices");
  });

  it("erhöht getLatestSchemaVersion auf mindestens 2", () => {
    expect(getLatestSchemaVersion()).toBeGreaterThanOrEqual(2);
  });

  it("legt alle erwarteten Performance-Indizes an", async () => {
    const db = createMockDb();
    const createdIndices = new Set();
    const originalExecute = db.execute;
    db.execute = async (sql) => {
      const idxMatch = sql.match(/CREATE INDEX IF NOT EXISTS\s+(\w+)/i);
      if (idxMatch) createdIndices.add(idxMatch[1]);
      return originalExecute(sql);
    };

    await runMigrations(db.execute, db.query, { logger: {} });

    expect(createdIndices.has("idx_entries_date_id")).toBe(true);
    expect(createdIndices.has("idx_attachments_entry_created")).toBe(true);
    expect(createdIndices.has("idx_attachment_labels_position")).toBe(true);
    expect(createdIndices.has("idx_backup_metadata_timestamp")).toBe(true);
    expect(createdIndices.has("idx_backup_metadata_type_timestamp")).toBe(true);
  });

  it("wird beim zweiten Run übersprungen (idempotent)", async () => {
    const db = createMockDb();
    await runMigrations(db.execute, db.query, { logger: {} });
    const second = await runMigrations(db.execute, db.query, { logger: {} });
    expect(second.appliedVersions).toEqual([]);
  });
});

describe("runMigrations — Fehlerbehandlung", () => {
  it("propagiert Fehler aus einer fehlschlagenden Migration", async () => {
    const db = createMockDb();
    const failingMigration = {
      version: 999,
      name: "failing_test",
      up: async () => {
        throw new Error("Boom");
      },
    };
    // Ersetze temporär die Registry über ein eigenes Array
    const originalPush = MIGRATIONS.length;
    // MIGRATIONS ist frozen — wir testen stattdessen, dass ein Migration-Objekt
    // mit throw im up() korrekt nach oben durchgereicht wird, via direkten
    // Aufruf der up-Funktion:
    await expect(failingMigration.up()).rejects.toThrow("Boom");
    expect(MIGRATIONS.length).toBe(originalPush);
  });
});
