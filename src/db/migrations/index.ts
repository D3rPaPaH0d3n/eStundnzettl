/**
 * SQLite-Migrationen für eStundnzettl.
 *
 * Architektur:
 *  - Jede Migration ist ein Objekt { version, name, up(execute) }.
 *  - Die Reihenfolge wird durch den `version`-Key bestimmt (aufsteigend).
 *  - Angewendete Migrationen werden in der Tabelle `schema_version` protokolliert.
 *
 * Abwärtskompatibilität:
 *  - Bestehende Installationen können einzelne Baseline-Tabellen bereits über
 *    den alten `CREATE TABLE IF NOT EXISTS`-Pfad angelegt haben. Migration 1
 *    läuft deshalb bewusst idempotent weiter, damit teilweise vorhandene Legacy-
 *    DBs fehlende Baseline-Tabellen sicher nachziehen, ohne Daten anzufassen.
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

// Diese Migrationen bestehen ausschließlich aus `CREATE ... IF NOT EXISTS`-
// Statements. Wenn sie bereits in schema_version stehen, dürfen wir sie trotzdem
// erneut als Safety-Net ausführen, um durch frühere Legacy-Detection übersprungene
// Baseline-Objekte nachzuziehen, ohne schema_version zu duplizieren.
const IDEMPOTENT_SCHEMA_REPAIR_MIGRATIONS = new Set<number>([1, 2]);

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

  // 3) Migrationen in Reihenfolge prüfen/ausführen.
  //    Wichtig: Migration 1 wird auch bei Legacy-DBs mit vorhandener `entries`-
  //    Tabelle ausgeführt. Bereits protokollierte idempotente Migrationen werden
  //    als stiller Schema-Repair erneut re-asserted, damit frühere Teil-Erkennung
  //    keine fehlenden Baseline-Tabellen/Indizes zurücklassen kann.
  const skipped: number[] = [];
  const sorted = [...MIGRATIONS].sort((a, b) => a.version - b.version);
  const appliedVersions: number[] = [];
  for (const migration of sorted) {
    if (applied.has(migration.version)) {
      if (IDEMPOTENT_SCHEMA_REPAIR_MIGRATIONS.has(migration.version)) {
        await migration.up(execute);
      }
      continue;
    }

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
