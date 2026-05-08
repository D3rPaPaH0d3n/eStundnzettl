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
import { logger } from "../utils/logger";

const readJsonSetting = (key: string): unknown => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored || stored === "undefined") return undefined;
    return JSON.parse(stored);
  } catch {
    return undefined;
  }
};

const readBoolSetting = (key: string): boolean | undefined => {
  const value = localStorage.getItem(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const readStringSetting = (key: string): string | undefined => {
  const value = localStorage.getItem(key);
  return value ? value : undefined;
};

// ─── Migration Result Types ─────────────────────────────────

interface MigrationResult {
  migrated: number;
  skipped: boolean;
}

interface AttachmentMigrationResult {
  migrated: number;
  labels: number;
  skipped: boolean;
}

interface MigrationError {
  error: string;
}

interface AllMigrationResults {
  entries: MigrationResult | MigrationError | null;
  settings: MigrationResult | MigrationError | null;
  workCodes: MigrationResult | MigrationError | null;
  attachments: AttachmentMigrationResult | MigrationError | null;
  backupMeta: MigrationResult | MigrationError | null;
  finalSettingsBackfill: MigrationResult | MigrationError | null;
  finalBackupMetaBackfill: MigrationResult | MigrationError | null;
}

// ─── Migration Flags ─────────────────────────────────────────

const MIGRATION_FLAGS: Record<string, string> = {
  ENTRIES:     "estundnzettl_sqlite_migration_done",
  SETTINGS:    "estundnzettl_sqlite_settings_migration_done",
  WORK_CODES:  "estundnzettl_sqlite_workcodes_migration_done",
  ATTACHMENTS: "estundnzettl_sqlite_attachments_migration_done",
  BACKUP_META: "estundnzettl_sqlite_backup_meta_migration_done",
  FINAL_SETTINGS_BACKFILL: "estundnzettl_sqlite_final_settings_backfill_done",
  FINAL_BACKUP_META_BACKFILL: "estundnzettl_sqlite_final_backup_meta_backfill_done",
};

/**
 * Prüft ob die Entries-Migration bereits durchgeführt wurde.
 * @returns {boolean}
 */
export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_FLAGS.ENTRIES) === "true";
}

function collectFinalSettingsBackfill(): Record<string, unknown> {
  const settings: Record<string, unknown> = {};

  const locale = readStringSetting(STORAGE_KEYS.LOCALE);
  if (locale) settings.locale = locale;

  const calculationConfig = readJsonSetting("estundnzettl_calculation_config");
  if (calculationConfig && typeof calculationConfig === "object") {
    settings.calculationConfig = calculationConfig;
  }

  // Nextcloud password is intentionally not copied in plain text. It remains
  // handled by nextcloudSecret/useSettings.
  const nextcloudEnabled = readBoolSetting(STORAGE_KEYS.NEXTCLOUD_ENABLED);
  if (nextcloudEnabled !== undefined) settings.nextcloud_enabled = nextcloudEnabled;
  const nextcloudUrl = readStringSetting(STORAGE_KEYS.NEXTCLOUD_URL);
  if (nextcloudUrl) settings.nextcloud_url = nextcloudUrl;
  const nextcloudUser = readStringSetting(STORAGE_KEYS.NEXTCLOUD_USER);
  if (nextcloudUser) settings.nextcloud_user = nextcloudUser;

  return settings;
}

function collectBackupMetaBackfill(): Record<string, unknown> {
  const settings: Record<string, unknown> = {};

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

  const backupLastError = readStringSetting(STORAGE_KEYS.BACKUP_LAST_ERROR);
  if (backupLastError) settings.backup_last_error = backupLastError;
  const backupBackoffUntil = readStringSetting(STORAGE_KEYS.BACKUP_BACKOFF_UNTIL);
  if (backupBackoffUntil) settings.backup_backoff_until = backupBackoffUntil;

  const nextcloudFailRaw = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT);
  if (nextcloudFailRaw) {
    const failNum = parseInt(nextcloudFailRaw, 10);
    if (!isNaN(failNum)) settings.nextcloud_backup_fail_count = failNum;
  }
  const nextcloudLastError = readStringSetting(STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR);
  if (nextcloudLastError) settings.nextcloud_backup_last_error = nextcloudLastError;
  const nextcloudBackoffUntil = readStringSetting(STORAGE_KEYS.NEXTCLOUD_BACKOFF_UNTIL);
  if (nextcloudBackoffUntil) settings.nextcloud_backoff_until = nextcloudBackoffUntil;

  const pdfArchiveBoolKeys: Array<[string, string]> = [
    [STORAGE_KEYS.PDF_ARCHIVE_ENABLED, "pdf_archive_enabled"],
    [STORAGE_KEYS.PDF_ARCHIVE_LOCAL, "pdf_archive_local"],
    [STORAGE_KEYS.PDF_ARCHIVE_NEXTCLOUD, "pdf_archive_nextcloud"],
    [STORAGE_KEYS.PDF_ARCHIVE_GDRIVE, "pdf_archive_gdrive"],
  ];
  for (const [lsKey, sqlKey] of pdfArchiveBoolKeys) {
    const value = readBoolSetting(lsKey);
    if (value !== undefined) settings[sqlKey] = value;
  }

  const pdfArchiveStringKeys: Array<[string, string]> = [
    [STORAGE_KEYS.PDF_ARCHIVE_LAST_RUN, "pdf_archive_last_run"],
    [STORAGE_KEYS.PDF_ARCHIVE_LAST_MONTH, "pdf_archive_last_month"],
    [STORAGE_KEYS.PDF_ARCHIVE_FAIL_COUNT, "pdf_archive_fail_count"],
    [STORAGE_KEYS.PDF_ARCHIVE_LAST_ERROR, "pdf_archive_last_error"],
  ];
  for (const [lsKey, sqlKey] of pdfArchiveStringKeys) {
    const value = readStringSetting(lsKey);
    if (value) settings[sqlKey] = value;
  }

  // Monatsbezogene Hash-Keys behalten ihren vollständigen Key-Namen.
  const pdfHashPrefix = `${STORAGE_KEYS.PDF_ARCHIVE_LAST_HASH}_`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(pdfHashPrefix)) continue;
    const value = readStringSetting(key);
    if (value) settings[key] = value;
  }

  return settings;
}

// ─── Welle 1: Entries ────────────────────────────────────────

/**
 * Migriert Entries von localStorage nach SQLite (Welle 1).
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateEntriesToSQLite(): Promise<MigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAGS.ENTRIES) === "true") {
    return { migrated: 0, skipped: true };
  }

  let entries: unknown[] = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) entries = parsed;
    }
  } catch (err) {
    logger.error("[migration] Fehler beim Lesen der Entries:", err);
  }

  if (entries.length === 0) {
    localStorage.setItem(MIGRATION_FLAGS.ENTRIES, "true");
    logger.info("[migration] Keine Entries in localStorage — Migration übersprungen");
    return { migrated: 0, skipped: false };
  }

  try {
    await bulkInsertEntries(entries);
    localStorage.setItem(MIGRATION_FLAGS.ENTRIES, "true");
    logger.info(`[migration] ${entries.length} Entries erfolgreich nach SQLite migriert`);
    return { migrated: entries.length, skipped: false };
  } catch (err) {
    logger.error("[migration] Entries-Insert fehlgeschlagen:", err);
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
export async function migrateSettingsToSQLite(): Promise<MigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAGS.SETTINGS) === "true") {
    return { migrated: 0, skipped: true };
  }

  const settings: Record<string, unknown> = {};

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
  } catch { /* corrupt */ }

  // Theme
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (theme) settings.theme = theme;

  // Locale, Calculation config and Nextcloud connection settings.
  Object.assign(settings, collectFinalSettingsBackfill());

  // Cloud Sync
  const cloudSync = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
  if (cloudSync === "true") settings.cloud_sync_enabled = true;

  // Local Backup
  const localBackup = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
  if (localBackup === "true") settings.local_backup_enabled = true;

  const count = Object.keys(settings).length;

  if (count === 0) {
    localStorage.setItem(MIGRATION_FLAGS.SETTINGS, "true");
    logger.info("[migration] Keine Settings in localStorage — Migration übersprungen");
    return { migrated: 0, skipped: false };
  }

  try {
    await bulkWriteSettings(settings);
    localStorage.setItem(MIGRATION_FLAGS.SETTINGS, "true");
    logger.info(`[migration] ${count} Settings erfolgreich nach SQLite migriert`);
    return { migrated: count, skipped: false };
  } catch (err) {
    logger.error("[migration] Settings-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Welle 2: Work Codes ────────────────────────────────────

/**
 * Migriert WorkCodes von localStorage nach SQLite (Welle 2).
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateWorkCodesToSQLite(): Promise<MigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAGS.WORK_CODES) === "true") {
    return { migrated: 0, skipped: true };
  }

  let codes: unknown[] = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) codes = parsed;
    }
  } catch { /* corrupt */ }

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
    logger.info(`[migration] ${codes.length} WorkCodes erfolgreich nach SQLite migriert`);
    return { migrated: codes.length, skipped: false };
  } catch (err) {
    logger.error("[migration] WorkCodes-Insert fehlgeschlagen:", err);
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
export async function migrateAttachmentsToSQLite(): Promise<AttachmentMigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAGS.ATTACHMENTS) === "true") {
    return { migrated: 0, labels: 0, skipped: true };
  }

  // Attachments lesen
  let attachments: unknown[] = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ATTACHMENTS);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) attachments = parsed;
    }
  } catch (err) {
    logger.error("[migration] Fehler beim Lesen der Attachments:", err);
  }

  // Label-Suggestions lesen
  let labels: string[] = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ATTACHMENT_LABELS);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) labels = parsed;
    }
  } catch (err) {
    logger.error("[migration] Fehler beim Lesen der Attachment-Labels:", err);
  }

  if (attachments.length === 0 && labels.length === 0) {
    localStorage.setItem(MIGRATION_FLAGS.ATTACHMENTS, "true");
    logger.info("[migration] Keine Attachments/Labels in localStorage — Migration übersprungen");
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
    logger.info(`[migration] ${attachments.length} Attachments + ${labels.length} Labels erfolgreich nach SQLite migriert`);
    return { migrated: attachments.length, labels: labels.length, skipped: false };
  } catch (err) {
    logger.error("[migration] Attachments-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Welle 4: Backup-Metadaten & LAST_CODE ──────────────────

/**
 * Migriert Backup-Meta-Keys von localStorage nach SQLite (Welle 4).
 *
 * Betrifft: LAST_CODE, Backup-/PDF-Archiv-Metadaten und Status-Keys.
 * Idempotent — schreibt nur vorhandene Werte, löscht nichts aus localStorage.
 *
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateBackupMetaToSQLite(): Promise<MigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAGS.BACKUP_META) === "true") {
    return { migrated: 0, skipped: true };
  }

  const settings = collectBackupMetaBackfill();

  const count = Object.keys(settings).length;

  if (count === 0) {
    localStorage.setItem(MIGRATION_FLAGS.BACKUP_META, "true");
    logger.info("[migration] Keine Backup-Meta in localStorage — Migration übersprungen");
    return { migrated: 0, skipped: false };
  }

  try {
    await bulkWriteSettings(settings);
    localStorage.setItem(MIGRATION_FLAGS.BACKUP_META, "true");
    logger.info(`[migration] ${count} Backup-Meta-Keys erfolgreich nach SQLite migriert`);
    return { migrated: count, skipped: false };
  } catch (err) {
    logger.error("[migration] Backup-Meta-Insert fehlgeschlagen:", err);
    throw err;
  }
}

// ─── Finale Backfills für direkte Upgrades ──────────────────

/**
 * Kopiert Settings-Keys, die in späteren Versionen ergänzt wurden, einmalig
 * aus legacy localStorage nach SQLite. Unabhängig vom alten Settings-Flag.
 */
export async function finalBackfillSettingsToSQLite(): Promise<MigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAGS.FINAL_SETTINGS_BACKFILL) === "true") {
    return { migrated: 0, skipped: true };
  }

  const settings = collectFinalSettingsBackfill();
  const count = Object.keys(settings).length;

  if (count > 0) {
    try {
      await bulkWriteSettings(settings);
    } catch (err) {
      logger.error("[migration] Finaler Settings-Backfill fehlgeschlagen:", err);
      throw err;
    }
  }

  localStorage.setItem(MIGRATION_FLAGS.FINAL_SETTINGS_BACKFILL, "true");
  logger.info(`[migration] Finaler Settings-Backfill abgeschlossen (${count} Keys)`);
  return { migrated: count, skipped: false };
}

/**
 * Kopiert Backup-/PDF-Archiv-Meta-Keys einmalig aus legacy localStorage nach
 * SQLite. Unabhängig vom alten Backup-Meta-Flag.
 */
export async function finalBackfillBackupMetaToSQLite(): Promise<MigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAGS.FINAL_BACKUP_META_BACKFILL) === "true") {
    return { migrated: 0, skipped: true };
  }

  const settings = collectBackupMetaBackfill();
  const count = Object.keys(settings).length;

  if (count > 0) {
    try {
      await bulkWriteSettings(settings);
    } catch (err) {
      logger.error("[migration] Finaler Backup-Meta-Backfill fehlgeschlagen:", err);
      throw err;
    }
  }

  localStorage.setItem(MIGRATION_FLAGS.FINAL_BACKUP_META_BACKFILL, "true");
  logger.info(`[migration] Finaler Backup-Meta-Backfill abgeschlossen (${count} Keys)`);
  return { migrated: count, skipped: false };
}

// ─── Welle 2+3+4: Alles migrieren ───────────────────────────

/**
 * Führt alle Migrationen aus (Entries + Settings + WorkCodes + Attachments).
 * Jede Migration ist unabhängig — Fehler in einer blockieren die anderen nicht.
 *
 * @returns {Promise<{entries: Object, settings: Object, workCodes: Object, attachments: Object}>}
 */
export async function migrateAllToSQLite(): Promise<AllMigrationResults> {
  const results: AllMigrationResults = {
    entries: null,
    settings: null,
    workCodes: null,
    attachments: null,
    backupMeta: null,
    finalSettingsBackfill: null,
    finalBackupMetaBackfill: null,
  };

  try {
    results.entries = await migrateEntriesToSQLite();
  } catch (err) {
    results.entries = { error: (err as Error).message };
  }

  try {
    results.settings = await migrateSettingsToSQLite();
  } catch (err) {
    results.settings = { error: (err as Error).message };
  }

  try {
    results.workCodes = await migrateWorkCodesToSQLite();
  } catch (err) {
    results.workCodes = { error: (err as Error).message };
  }

  try {
    results.attachments = await migrateAttachmentsToSQLite();
  } catch (err) {
    results.attachments = { error: (err as Error).message };
  }

  try {
    results.backupMeta = await migrateBackupMetaToSQLite();
  } catch (err) {
    results.backupMeta = { error: (err as Error).message };
  }

  try {
    results.finalSettingsBackfill = await finalBackfillSettingsToSQLite();
  } catch (err) {
    results.finalSettingsBackfill = { error: (err as Error).message };
  }

  try {
    results.finalBackupMetaBackfill = await finalBackfillBackupMetaToSQLite();
  } catch (err) {
    results.finalBackupMetaBackfill = { error: (err as Error).message };
  }

  logger.info("[migration] Ergebnisse:", results);
  return results;
}

// ─── Debug/Testing ───────────────────────────────────────────

/**
 * Setzt das Entries-Migrations-Flag zurück (für Debug/Testing).
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAGS.ENTRIES);
}

/**
 * Setzt alle Migrations-Flags zurück (für Debug/Testing).
 */
export function resetAllMigrationFlags(): void {
  for (const flag of Object.values(MIGRATION_FLAGS)) {
    localStorage.removeItem(flag);
  }
}
