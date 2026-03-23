// ============================================================
// MIGRATION.JS - Einmalige Migrationen für eStundnzettl
// ============================================================

import { WORK_CODE_PRESETS, STORAGE_KEYS } from '../hooks/constants.js';

// -------------------------------------------------------
// Migration 1: kogler_* → estundnzettl_* Keys
// -------------------------------------------------------
const OLD_KEYS = {
  ENTRIES: "kogler_entries",
  USER: "kogler_user",
  THEME: "kogler_theme",
  AUTO_BACKUP: "kogler_auto_backup",
  LAST_CODE: "kogler_last_code",
  LIVE_TIMER: "kogler_live_timer",
  LAST_BACKUP: "kogler_last_backup_date",
  BACKUP_TARGET: "kogler_backup_target",
  CLOUD_SYNC: "kogler_cloud_sync",
};

const NEW_KEYS = {
  ENTRIES: "estundnzettl_entries",
  USER: "estundnzettl_user",
  THEME: "estundnzettl_theme",
  AUTO_BACKUP: "estundnzettl_auto_backup",
  LAST_CODE: "estundnzettl_last_code",
  LIVE_TIMER: "estundnzettl_live_timer",
  LAST_BACKUP: "estundnzettl_last_backup_date",
  BACKUP_TARGET: "estundnzettl_backup_target",
  CLOUD_SYNC: "estundnzettl_cloud_sync",
};

/**
 * Migriert alle localStorage Keys von "kogler_*" zu "estundnzettl_*"
 * Läuft nur einmal und markiert sich dann als erledigt.
 */
const migrateKoglerKeys = () => {
  const alreadyMigrated = localStorage.getItem("estundnzettl_migrated");
  if (alreadyMigrated) return;

  let migrationCount = 0;

  Object.keys(OLD_KEYS).forEach((key) => {
    const oldKey = OLD_KEYS[key];
    const newKey = NEW_KEYS[key];
    
    const oldValue = localStorage.getItem(oldKey);
    const newValue = localStorage.getItem(newKey);
    
    if (oldValue && !newValue) {
      localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
      migrationCount++;

    }
  });

  localStorage.setItem("estundnzettl_migrated", "true");
  
  // Migration completed silently
};

// -------------------------------------------------------
// Migration 2: Work Codes für bestehende User
// -------------------------------------------------------
/**
 * Gibt bestehenden Usern (die schon Einträge haben) das Kogler-Preset,
 * damit ihre bisherigen Codes weiterhin funktionieren.
 * Neue User bekommen keine Codes voreingestellt.
 */
const migrateWorkCodes = () => {
  const alreadyMigrated = localStorage.getItem("estundnzettl_workcodes_migrated");
  if (alreadyMigrated) return;

  const existingEntries = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  const existingWorkCodes = localStorage.getItem(STORAGE_KEYS.WORK_CODES);

  // Nur migrieren wenn:
  // 1. User hat bereits Einträge (ist bestehender User)
  // 2. User hat noch keine eigenen Work Codes gespeichert
  if (existingEntries && !existingWorkCodes) {
    // Bestehender User → Kogler-Preset geben
    localStorage.setItem(
      STORAGE_KEYS.WORK_CODES, 
      JSON.stringify(WORK_CODE_PRESETS.kogler.codes)
    );

  }

  localStorage.setItem("estundnzettl_workcodes_migrated", "true");
};

// -------------------------------------------------------
// Haupt-Export: Alle Migrationen ausführen
// -------------------------------------------------------
export const migrateStorageKeys = () => {
  migrateKoglerKeys();
  migrateWorkCodes();
};