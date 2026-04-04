/**
 * database.js — Singleton SQLite-Verbindung via @capacitor-community/sqlite
 *
 * Kapselt die gesamte Plugin-Interaktion.
 * Consumer nutzen nur getDb() und closeDb().
 *
 * eStundnzettl ist eine reine Android-App — SQLite ist IMMER verfügbar.
 */

import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite } from "@capacitor-community/sqlite";
import { DB_NAME, SCHEMA_VERSION, getInitSQL } from "./schema";

let _ready = null; // Promise<boolean> — true = SQLite verfügbar, false = Fallback
let _dbOpen = false;

/**
 * Prüft ob wir auf einer nativen Plattform laufen, auf der SQLite funktioniert.
 * eStundnzettl ist eine reine Android-App — Web-Fallback wird nicht mehr unterstützt.
 */
function isNative() {
  const platform = Capacitor.getPlatform();
  if (platform !== "android" && platform !== "ios") {
    throw new Error("eStundnzettl ist eine reine Android-App — Web-Fallback wird nicht mehr unterstützt");
  }
  return true;
}

/**
 * Initialisiert die DB-Verbindung (einmalig).
 * Gibt true zurück wenn SQLite genutzt werden kann, false sonst.
 */
async function init() {
  try {
    // Konsistenzcheck (empfohlen vom Plugin)
    await CapacitorSQLite.checkConnectionsConsistency({
      dbNames: [DB_NAME],
      openModes: ["RW"],
    }).catch(() => {
      // Erster Start — keine bestehende Connection, ignorieren
    });

    // Connection erstellen
    await CapacitorSQLite.createConnection({
      database: DB_NAME,
      version: SCHEMA_VERSION,
      encrypted: false,
      mode: "no-encryption",
      readonly: false,
    });

    // Öffnen
    await CapacitorSQLite.open({ database: DB_NAME, readonly: false });
    _dbOpen = true;

    // Schema anlegen (IF NOT EXISTS → idempotent)
    for (const sql of getInitSQL()) {
      await CapacitorSQLite.execute({ database: DB_NAME, statements: sql });
    }

    console.info("[db] SQLite-Verbindung hergestellt und Schema geprüft");
    return true;
  } catch (err) {
    console.error("[db] SQLite-Initialisierung fehlgeschlagen", err);
    _dbOpen = false;
    throw new Error("SQLite-Initialisierung fehlgeschlagen — App kann nicht starten");
  }
}

/**
 * Gibt den DB-Namen zurück (immer verfügbar).
 * Lazy-Init beim ersten Aufruf.
 *
 * Nutzung:
 *   const db = await getDb(); // db ist immer DB_NAME
 */
export async function getDb() {
  if (_ready === null) {
    _ready = init();
  }
  const ok = await _ready;
  return ok ? DB_NAME : null;
}

/**
 * Prüft ob SQLite bereits als verfügbar initialisiert wurde (synchron).
 * Gibt true/false/null zurück (null = noch nicht initialisiert).
 */
export function isSQLiteReady() {
  if (_ready === null) return null;
  // _ready ist resolved wenn init() durch war
  return _dbOpen;
}

/**
 * DB-Connection sauber schließen (z.B. bei App-Pause).
 */
export async function closeDb() {
  if (!_dbOpen) return;
  try {
    await CapacitorSQLite.close({ database: DB_NAME });
    _dbOpen = false;
    console.info("[db] Verbindung geschlossen");
  } catch (err) {
    console.error("[db] Fehler beim Schließen", err);
  }
}

/**
 * Raw execute — führt beliebiges SQL aus (DDL, multi-statement).
 */
export async function execute(sql) {
  const db = await getDb();
  return CapacitorSQLite.execute({ database: db, statements: sql });
}

/**
 * Raw run — einzelnes Statement mit Parametern (INSERT/UPDATE/DELETE).
 */
export async function run(sql, values = []) {
  const db = await getDb();
  return CapacitorSQLite.run({ database: db, statement: sql, values });
}

/**
 * Batch-Execute — führt mehrere parameterisierte Statements in einer Transaktion aus.
 * @param {Array<{statement: string, values: Array}>} set
 * @param {boolean} [transaction=true] — in Transaktion wrappen
 */
export async function executeSet(set, transaction = true) {
  if (!set || set.length === 0) return;
  const db = await getDb();
  return CapacitorSQLite.executeSet({ database: db, set, transaction });
}

/**
 * Raw query — SELECT mit Parametern.
 */
export async function query(sql, values = []) {
  const db = await getDb();
  const result = await CapacitorSQLite.query({ database: db, statement: sql, values });
  return result.values || [];
}
