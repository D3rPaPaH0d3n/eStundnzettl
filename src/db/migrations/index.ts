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

import { migration001InitialSchema, Migration } from "./001_initial_schema";
import { migration002PerformanceIndices } from "./002_performance_indices";

export type { Migration };

export const MIGRATIONS: readonly Migration[] = Object.freeze([
  migration001InitialSchema,
  migration002PerformanceIndices,
]);

const SCHEMA_VERSION_TABLE_SQL: string = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT    NOT NULL
  );
`;

/**
 * Führt alle ausstehenden Migrationen gegen die übergebenen SQL-Funktionen aus.
 *
 * @param {(sql: string) => Promise<unknown>} execute  Führt ein DDL/DML-Statement aus.
 * @param {(sql: string) => Promise<Array<Record<string, unknown>>>} query  Liefert Zeilen.
 * @param {{ logger?: { info?: Function, warn?: Function, error?: Function } }} [options]
 * @returns {Promise<{ appliedVersions: number[], skipped: number[] }>}
 */
interface MigrationLogger {
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

interface MigrationOptions {
  logger?: MigrationLogger;
}

interface MigrationResult {
  appliedVersions: number[];
  skipped: number[];
}

export async function runMigrations(
  execute: (sql: string) => Promise<unknown>,
  query: (sql: string) => Promise<Array<Record<string, unknown>>>,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const log = options.logger || console;

  // 1) schema_version Tabelle sicherstellen (idempotent).
  await execute(SCHEMA_VERSION_TABLE_SQL);

  // 2) Bereits angewendete Migrationen lesen.
  const appliedRows = await query("SELECT version FROM schema_version ORDER BY version ASC;");
  const applied: Set<number> = new Set(
    (appliedRows || [])
      .map((row) => Number(row?.version))
      .filter((v) => Number.isInteger(v))
  );

  // 3) Legacy-Detection: wenn `entries` existiert aber schema_version leer ist,
  //    ist die DB aus dem alten Flow vorhanden → Migration 1 still als erledigt markieren.
  const skipped: number[] = [];
  if (applied.size === 0) {
    const existing = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='entries';"
    );
    if ((existing || []).length > 0) {
      const nowIso = new Date().toISOString();
      await execute(
        `INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (1, '${nowIso}');`
      );
      applied.add(1);
      skipped.push(1);
      log.info?.("[migrations] Legacy-DB erkannt — Migration 1 als bereits angewendet markiert");
    }
  }

  // 4) Ausstehende Migrationen in Reihenfolge ausführen.
  const sorted = [...MIGRATIONS].sort((a, b) => a.version - b.version);
  const appliedVersions: number[] = [];
  for (const migration of sorted) {
    if (applied.has(migration.version)) continue;

    log.info?.(`[migrations] Wende Migration ${migration.version} (${migration.name}) an...`);
    try {
      await migration.up(execute);
    } catch (err) {
      log.error?.(
        `[migrations] Migration ${migration.version} (${migration.name}) fehlgeschlagen:`,
        err
      );
      throw err;
    }

    const nowIso = new Date().toISOString();
    await execute(
      `INSERT INTO schema_version (version, applied_at) VALUES (${migration.version}, '${nowIso}');`
    );
    applied.add(migration.version);
    appliedVersions.push(migration.version);
  }

  return { appliedVersions, skipped };
}

/**
 * Liefert die höchste aktuell registrierte Migrations-Version.
 * Pendant zu `APP_SCHEMA_VERSION` in `schema.ts` (NICHT zu verwechseln mit
 * `PLUGIN_DB_VERSION` in `database.ts`, das ist der Capacitor-Plugin-Slot).
 */
export function getLatestSchemaVersion(): number {
  return MIGRATIONS.reduce((max, m) => (m.version > max ? m.version : max), 0);
}
