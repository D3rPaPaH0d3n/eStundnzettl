// ============================================================
// MIGRATION.JS - Einmalige Migration von kogler_* zu estundnzettl_*
// ============================================================

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
export const migrateStorageKeys = () => {
  // Prüfen ob Migration bereits durchgeführt wurde
  const alreadyMigrated = localStorage.getItem("estundnzettl_migrated");
  if (alreadyMigrated) return;

  let migrationCount = 0;

  Object.keys(OLD_KEYS).forEach((key) => {
    const oldKey = OLD_KEYS[key];
    const newKey = NEW_KEYS[key];
    
    const oldValue = localStorage.getItem(oldKey);
    const newValue = localStorage.getItem(newKey);
    
    // Nur migrieren wenn alter Wert existiert UND neuer noch leer ist
    if (oldValue && !newValue) {
      localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
      migrationCount++;
      console.log(`✅ Migriert: ${oldKey} → ${newKey}`);
    }
  });

  // Migration als erledigt markieren
  localStorage.setItem("estundnzettl_migrated", "true");
  
  if (migrationCount > 0) {
    console.log(`🎉 Storage-Migration abgeschlossen! ${migrationCount} Keys migriert.`);
  }
};