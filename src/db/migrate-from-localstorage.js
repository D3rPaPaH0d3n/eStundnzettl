/**
 * migrate-from-localstorage.js — Einmalige Migration bestehender Daten
 *
 * Welle 1: Entries
 * Welle 2: Settings + WorkCodes
 * Welle 3: Attachments + Label-Suggestions
 *
 * Strategie:
 * - Jede Domäne hat ein eigenes Flag → unabhängige, idempotente Migrations
 * - Bei Fehler: kein Flag setzen → nächster Start versucht erneut
 * - localStorage-Daten werden NICHT gelöscht (Sicherheitsnetz)
 */

import { STORAGE_KEYS, WORK_MODELS, WORK_CODE_PRESETS } from "../hooks/constants";
import { bulkInsertEntries } from "./repositories/entriesRepo";
import { bulkWriteSettings } from "./repositories/settingsRepo";
import { bulkReplaceWorkCodes } from "./repositories/workCodesRepo";
import { bulkReplaceAttachments, bulkReplaceLabelSuggestions } from "./repositories/attachmentsRepo";

// ─── Migration Flags ─────────────────────────────────────────

const MIGRATION_FLAGS = {
  ENTRIES:     "estundnzettl_sqlite_migration_done",
  SETTINGS:    "estundnzettl_sqlite_settings_migration_done",
  WORK_CODES:  "estundnzettl_sqlite_workcodes_migration_done",
  ATTACHMENTS: "estundnzettl_sqlite_attachments_migration_done",
  BACKUP_META: "estundnzettl_sqlite_backup_meta_migration_done",
};

/**
 * Prüft ob die Entries-Migration bereits durchgeführt wurde.
 * @returns {boolean}
 */
export function isMigrationDone() {
  return localStorage.getItem(MIGRATION_FLAGS.ENTRIES) === "true";
}

// ─── Welle 1: Entries ────────────────────────────────────────

/**
 * Migriert Entries von localStorage nach SQLite (Welle 1).
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateEntriesToSQLite() {
  if (localStorage.getItem(MIGRATION_FLAGS.ENTRIES) === "true") {
    return { migrated: 0, skipped: true };
  }

  let entries = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) entries = parsed;
    }
  } catch (err) {
    console.error("[migration] Fehler beim Lesen der Entries:", err);
  }

  if (entries.length === 0) {
    localStorage.setItem(MIGRATION_FLAGS.ENTRIES, "true");
    console.info("[migration] Keine Entries in localStorage — Migration übersprungen");
    return { migrated: 0, skipped: false };
  }

  try {
    await bulkInsertEntries(entries);
    localStorage.setItem(MIGRATION_FLAGS.ENTRIES, "true");
    console.info(`[migration] ${entries.length} Entries erfolgreich nach SQLite migriert`);
    return { migrated: entries.length, skipped: false };
  } catch (err) {
    console.error("[migration] Entries-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Welle 2: Settings ──────────────────────────────────────

/**
 * Migriert Settings von localStorage nach SQLite (Welle 2).
 *
 * Liest die einzelnen Settings-Keys aus localStorage und schreibt
 * sie als Key-Value-Paare in die settings-Tabelle.
 *
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateSettingsToSQLite() {
  if (localStorage.getItem(MIGRATION_FLAGS.SETTINGS) === "true") {
    return { migrated: 0, skipped: true };
  }

  const settings = {};

  // User-Daten
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        // WorkDays-Fallback (wie in useSettings)
        if (!Array.isArray(parsed.workDays) || parsed.workDays.length !== 7) {
          parsed.workDays = [...WORK_MODELS[0].days];
        }
        settings.user = parsed;
      }
    }
  } catch (e) { /* corrupt */ }

  // Theme
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (theme) settings.theme = theme;

  // Cloud Sync
  const cloudSync = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
  if (cloudSync === "true") settings.cloud_sync_enabled = true;

  // Local Backup
  const localBackup = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
  if (localBackup === "true") settings.local_backup_enabled = true;

  const count = Object.keys(settings).length;

  if (count === 0) {
    localStorage.setItem(MIGRATION_FLAGS.SETTINGS, "true");
    console.info("[migration] Keine Settings in localStorage — Migration übersprungen");
    return { migrated: 0, skipped: false };
  }

  try {
    await bulkWriteSettings(settings);
    localStorage.setItem(MIGRATION_FLAGS.SETTINGS, "true");
    console.info(`[migration] ${count} Settings erfolgreich nach SQLite migriert`);
    return { migrated: count, skipped: false };
  } catch (err) {
    console.error("[migration] Settings-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Welle 2: Work Codes ────────────────────────────────────

/**
 * Migriert WorkCodes von localStorage nach SQLite (Welle 2).
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateWorkCodesToSQLite() {
  if (localStorage.getItem(MIGRATION_FLAGS.WORK_CODES) === "true") {
    return { migrated: 0, skipped: true };
  }

  let codes = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) codes = parsed;
    }
  } catch (e) { /* corrupt */ }

  // Keine Codes in localStorage → Default-Preset anwenden (wie im Hook)
  if (codes.length === 0) {
    const defaultPreset = WORK_CODE_PRESETS.allgemein;
    if (defaultPreset) {
      codes = JSON.parse(JSON.stringify(defaultPreset.codes));
    }
  }

  try {
    await bulkReplaceWorkCodes(codes);
    localStorage.setItem(MIGRATION_FLAGS.WORK_CODES, "true");
    console.info(`[migration] ${codes.length} WorkCodes erfolgreich nach SQLite migriert`);
    return { migrated: codes.length, skipped: false };
  } catch (err) {
    console.error("[migration] WorkCodes-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Welle 3: Attachments + Labels ──────────────────────────

/**
 * Migriert Attachments und Label-Suggestions von localStorage nach SQLite (Welle 3).
 *
 * Liest STORAGE_KEYS.ATTACHMENTS und STORAGE_KEYS.ATTACHMENT_LABELS
 * und schreibt sie in die attachments/attachment_labels-Tabellen.
 *
 * @returns {Promise<{migrated: number, labels: number, skipped: boolean}>}
 */
export async function migrateAttachmentsToSQLite() {
  if (localStorage.getItem(MIGRATION_FLAGS.ATTACHMENTS) === "true") {
    return { migrated: 0, labels: 0, skipped: true };
  }

  // Attachments lesen
  let attachments = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ATTACHMENTS);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) attachments = parsed;
    }
  } catch (err) {
    console.error("[migration] Fehler beim Lesen der Attachments:", err);
  }

  // Label-Suggestions lesen
  let labels = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ATTACHMENT_LABELS);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) labels = parsed;
    }
  } catch (err) {
    console.error("[migration] Fehler beim Lesen der Attachment-Labels:", err);
  }

  if (attachments.length === 0 && labels.length === 0) {
    localStorage.setItem(MIGRATION_FLAGS.ATTACHMENTS, "true");
    console.info("[migration] Keine Attachments/Labels in localStorage — Migration übersprungen");
    return { migrated: 0, labels: 0, skipped: false };
  }

  try {
    if (attachments.length > 0) {
      await bulkReplaceAttachments(attachments);
    }
    if (labels.length > 0) {
      await bulkReplaceLabelSuggestions(labels);
    }
    localStorage.setItem(MIGRATION_FLAGS.ATTACHMENTS, "true");
    console.info(`[migration] ${attachments.length} Attachments + ${labels.length} Labels erfolgreich nach SQLite migriert`);
    return { migrated: attachments.length, labels: labels.length, skipped: false };
  } catch (err) {
    console.error("[migration] Attachments-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Welle 4: Backup-Metadaten & LAST_CODE ──────────────────

/**
 * Migriert Backup-Meta-Keys von localStorage nach SQLite (Welle 4).
 *
 * Betrifft: LAST_CODE, LAST_BACKUP, BACKUP_TARGET, BACKUP_FAIL_COUNT.
 * Idempotent — schreibt nur vorhandene Werte, löscht nichts aus localStorage.
 *
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateBackupMetaToSQLite() {
  if (localStorage.getItem(MIGRATION_FLAGS.BACKUP_META) === "true") {
    return { migrated: 0, skipped: true };
  }

  const settings = {};

  // LAST_CODE (number)
  const lastCode = localStorage.getItem(STORAGE_KEYS.LAST_CODE);
  if (lastCode) {
    const num = Number(lastCode);
    if (!isNaN(num)) settings.last_code = num;
  }

  // LAST_BACKUP (ISO-String)
  const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
  if (lastBackup) settings.last_backup = lastBackup;

  // BACKUP_TARGET ("documents" | null)
  const backupTarget = localStorage.getItem(STORAGE_KEYS.BACKUP_TARGET);
  if (backupTarget) settings.backup_target = backupTarget;

  // BACKUP_FAIL_COUNT (number-as-string)
  const failRaw = localStorage.getItem(STORAGE_KEYS.BACKUP_FAIL_COUNT);
  if (failRaw) {
    const failNum = parseInt(failRaw, 10);
    if (!isNaN(failNum)) settings.backup_fail_count = failNum;
  }

  const count = Object.keys(settings).length;

  if (count === 0) {
    localStorage.setItem(MIGRATION_FLAGS.BACKUP_META, "true");
    console.info("[migration] Keine Backup-Meta in localStorage — Migration übersprungen");
    return { migrated: 0, skipped: false };
  }

  try {
    await bulkWriteSettings(settings);
    localStorage.setItem(MIGRATION_FLAGS.BACKUP_META, "true");
    console.info(`[migration] ${count} Backup-Meta-Keys erfolgreich nach SQLite migriert`);
    return { migrated: count, skipped: false };
  } catch (err) {
    console.error("[migration] Backup-Meta-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Welle 2+3+4: Alles migrieren ───────────────────────────

/**
 * Führt alle Migrationen aus (Entries + Settings + WorkCodes + Attachments).
 * Jede Migration ist unabhängig — Fehler in einer blockieren die anderen nicht.
 *
 * @returns {Promise<{entries: Object, settings: Object, workCodes: Object, attachments: Object}>}
 */
export async function migrateAllToSQLite() {
  const results = { entries: null, settings: null, workCodes: null, attachments: null, backupMeta: null };

  try {
    results.entries = await migrateEntriesToSQLite();
  } catch (err) {
    results.entries = { error: err.message };
  }

  try {
    results.settings = await migrateSettingsToSQLite();
  } catch (err) {
    results.settings = { error: err.message };
  }

  try {
    results.workCodes = await migrateWorkCodesToSQLite();
  } catch (err) {
    results.workCodes = { error: err.message };
  }

  try {
    results.attachments = await migrateAttachmentsToSQLite();
  } catch (err) {
    results.attachments = { error: err.message };
  }

  try {
    results.backupMeta = await migrateBackupMetaToSQLite();
  } catch (err) {
    results.backupMeta = { error: err.message };
  }

  console.info("[migration] Ergebnisse:", results);
  return results;
}

// ─── Debug/Testing ───────────────────────────────────────────

/**
 * Setzt das Entries-Migrations-Flag zurück (für Debug/Testing).
 */
export function resetMigrationFlag() {
  localStorage.removeItem(MIGRATION_FLAGS.ENTRIES);
}

/**
 * Setzt alle Migrations-Flags zurück (für Debug/Testing).
 */
export function resetAllMigrationFlags() {
  for (const flag of Object.values(MIGRATION_FLAGS)) {
    localStorage.removeItem(flag);
  }
}
