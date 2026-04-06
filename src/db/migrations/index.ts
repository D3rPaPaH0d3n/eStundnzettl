/**
 * SQLite-Migrationen für eStundnzettl.
 *
 * Architektur:
 *  - Jede Migration ist ein Objekt { version, name, up(execute) }.
 *  - Die Reihenfolge wird durch den `version`-Key bestimmt (aufsteigend).
 *  - Angewendete Migrationen werden in der Tabelle `schema_version` protokolliert.
 *
 * Abwärtskompatibilität:
 *  - Bestehende Installationen haben die Baseline-Tabellen bereits über den
 *    alten `CREATE TABLE IF NOT EXISTS`-Pfad angelegt. Der Runner erkennt
 *    das (`entries`-Tabelle existiert, `schema_version` ist leer) und
 *    markiert Migration 1 still als "angewendet", ohne sie erneut auszuführen.
 *
 * Neue Migrationen hinzufügen:
 *  1. Neue Datei `NNN_short_name.js` mit exportiertem Migrations-Objekt anlegen.
 *  2. Import + Array-Eintrag hier unten.
 *  3. Beim nächsten App-Start läuft die Migration automatisch.
 */

import { migration001InitialSchema } from "./001_initial_schema";
import { migration002PerformanceIndices } from "./002_performance_indices";

export interface Migration {
  version: number;
  name: string;
  up: (execute: (sql: string) => Promise<unknown>) => Promise<void>;
}

export const MIGRATIONS: readonly Migration[] = Object.freeze([
  migration001InitialSchema,
  migration002PerformanceIndices,
]);

const SCHEMA_VERSION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT    NOT NULL
  );
`;

interface MigrationResult {
  appliedVersions: number[];
  skipped: number[];
}

interface Logger {
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
}

interface MigrationOptions {
  logger?: Logger;
}

/**
 * Führt alle ausstehenden Migrationen gegen die übergebenen SQL-Funktionen aus.
 */
export async function runMigrations(
  execute: (sql: string) => Promise<unknown>,
  query: (sql: string) => Promise<Array<Record<string, unknown>>>,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const log = options.logger || console;

  // 1) schema_version Tabelle sicherstellen (idempotent).
  await execute(SCHEMA_VERSION_TABLE_SQL);

  // 2) Bereits angewendete Migrationen lesen.
  const appliedRows = await query("SELECT version FROM schema_version ORDER BY version");
  const appliedVersions = appliedRows.map((row) => Number(row.version));
  const maxApplied = appliedVersions.length > 0 ? Math.max(...appliedVersions) : 0;

  // 3) Legacy‑Detektion: Wenn entries‑Tabelle existiert, aber schema_version leer ist,
  //    handelt es sich um eine Installation, die vor Einführung des Migrations‑Frameworks
  //    angelegt wurde. In diesem Fall wird Migration 001 still als „angewendet“ markiert,
  //    ohne sie erneut auszuführen.
  const tables = await query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries'"
  );
  const hasEntriesTable = tables.length > 0;
  const isLegacyInstall = hasEntriesTable && appliedVersions.length === 0;

  const result: MigrationResult = {
    appliedVersions: [],
    skipped: [],
  };

  // 4) Alle definierten Migrationen durchgehen.
  for (const migration of MIGRATIONS) {
    if (migration.version <= maxApplied) {
      // Schon angewendet → überspringen.
      continue;
    }

    if (isLegacyInstall && migration.version === 1) {
      // Legacy‑Installation: Migration 001 wurde bereits durch die alte
      // CREATE‑TABLE‑IF‑NOT‑EXISTS‑Logik angewendet → nur protokollieren.
      log.info?.(
        `[migrations] Legacy‑Installation erkannt — ${migration.name} (v${migration.version}) als bereits angewendet markiert`
      );
      await execute(
        `INSERT INTO schema_version (version, applied_at) VALUES (${migration.version}, datetime('now'))`
      );
      result.skipped.push(migration.version);
      continue;
    }

    // 5) Migration ausführen.
    log.info?.(
      `[migrations] Wende ${migration.name} an (v${migration.version}) …`
    );
    try {
      await migration.up(execute);
      await execute(
        `INSERT INTO schema_version (version, applied_at) VALUES (${migration.version}, datetime('now'))`
      );
      result.appliedVersions.push(migration.version);
      log.info?.(
        `[migrations] ${migration.name} (v${migration.version}) erfolgreich angewendet`
      );
    } catch (err) {
      log.error?.(
        `[migrations] Fehler bei ${migration.name} (v${migration.version}):`,
        err
      );
      throw err;
    }
  }

  return result;
}
