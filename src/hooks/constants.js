// ============================================================
// CONSTANTS.JS - Zentrale Konstanten für eStundnzettl Zeiterfassung
// ============================================================

export const APP_VERSION = "v6.2.2";

// -------------------------------------------------------
// BACKUP & SYNC KONFIGURATION (NEU & WICHTIG)
// -------------------------------------------------------
export const BACKUP_CONFIG = {
  // Single Source of Truth für den Dateinamen
  FILENAME: "estundnzettl_backup.json", 
  // Falls wir Migrationen brauchen, wissen wir, wie die alte Datei hieß
  LEGACY_FILENAME: "kogler_backup.json", 
  MIME_TYPE: "application/json",
};

// -------------------------------------------------------
// STORAGE KEYS (LOCAL STORAGE)
// -------------------------------------------------------
export const STORAGE_KEYS = {
  // Kerndaten
  ENTRIES: "estundnzettl_entries",
  USER: "estundnzettl_user",
  THEME: "estundnzettl_theme",
  WORK_CODES: "estundnzettl_work_codes",
  
  // Backup & Sync Status (Eindeutige Benennung!)
  CLOUD_SYNC_ENABLED: "estundnzettl_cloud_sync_enabled", // Boolean: Ist Google Drive aktiv?
  LOCAL_BACKUP_ENABLED: "estundnzettl_local_backup_enabled", // Boolean: Ist lokaler Ordner aktiv?
  
  // Pfade & Metadaten
  BACKUP_TARGET: "estundnzettl_backup_target", // Pfad/ID für lokales Backup
  LAST_BACKUP: "estundnzettl_last_backup_date",
  
  // Temporäre/Status Keys
  LAST_CODE: "estundnzettl_last_code",
  LIVE_TIMER: "estundnzettl_live_timer",
  
  // @Deprecated - Wir nutzen jetzt CLOUD_SYNC_ENABLED für Präzision
  // AUTO_BACKUP: "estundnzettl_auto_backup", 
  // CLOUD_SYNC: "estundnzettl_cloud_sync", 
};

// -------------------------------------------------------
// ARBEITSZEIT (in Minuten)
// -------------------------------------------------------
export const MINUTES = {
  FULL_DAY: 510,           
  FRIDAY: 270,             
  DEFAULT_PAUSE: 30,       
  ROUNDING_INTERVAL: 15,   
  HOUR: 60,                
};

// -------------------------------------------------------
// ARBEITSZEIT-MODELLE (Presets für Modal)
// -------------------------------------------------------
export const WORK_MODELS = [
  {
    id: '38.5-classic',
    label: '38,5h Standard', 
    description: 'Mo-Do 8,5h / Fr 4,5h',
    days: [0, 510, 510, 510, 510, 270, 0] // So, Mo, Di, Mi, Do, Fr, Sa
  },
  {
    id: '38.5-even',
    label: '38,5h Gleichmäßig',
    description: 'Mo-Fr 7,7h (07:42)',
    days: [0, 462, 462, 462, 462, 462, 0]
  },
  {
    id: '38.5-4days',
    label: '4-Tage Woche (Gleich)',
    description: 'Mo-Do 9,6h (09:38)',
    days: [0, 578, 578, 578, 577, 0, 0]
  },
  {
    id: '38.5-4days-split',
    label: '4-Tage Woche (10/8,5)',
    description: 'Mo-Mi 10h / Do 8,5h',
    days: [0, 600, 600, 600, 510, 0, 0]
  },
  {
    id: '40-classic',
    label: '40h Woche',
    description: 'Mo-Fr 8h',
    days: [0, 480, 480, 480, 480, 480, 0]
  },
  {
    id: 'custom',
    label: 'Benutzerdefiniert',
    description: 'Manuelle Eingabe',
    days: [0, 0, 0, 0, 0, 0, 0]
  }
];

// -------------------------------------------------------
// TÄTIGKEITS-CODE PRESETS (zur Auswahl für User)
// -------------------------------------------------------
export const WORK_CODE_PRESETS = {
  kogler: {
    id: 'kogler',
    name: 'Aufzugsbau (Kogler)',
    description: 'Tätigkeitscodes für Aufzugsbau und -wartung',
    codes: [
      { id: 1, label: "01 - Schienen, Bunse" },
      { id: 2, label: "02 - Umlenkrollen, Rollenrost" },
      { id: 3, label: "03 - TWR mechanisch" },
      { id: 4, label: "04 - Heber, Joch, Seile" },
      { id: 5, label: "05 - GGW, Fangrahmen, Geschw. Regler" },
      { id: 6, label: "06 - TWR elektrisch, Steuerung" },
      { id: 7, label: "07 - Schachttüren, Schachtverblechung" },
      { id: 8, label: "08 - E-Installation, Schachtlicht" },
      { id: 9, label: "09 - Kabine mechanisch, Türantrieb, Auskleidung" },
      { id: 10, label: "10 - Kabine elektrisch, Lichtschranken, Dachsteuerung" },
      { id: 11, label: "11 - Einstellung, Fertigstellung, TÜV-Abnahme" },
      { id: 12, label: "12 - Transport" },
      { id: 13, label: "13 - Diverses, Besprechung, Vermessung" },
      { id: 14, label: "14 - Wartung" },
      { id: 15, label: "15 - Störung" },
      { id: 16, label: "16 - Garantie" },
      { id: 17, label: "17 - Regie" },
      { id: 18, label: "18 - Materialvorbereitung" },
      { id: 19, label: "19 - Fahrzeit" },
      { id: 20, label: "20 - Diverse Zusätze, Stahlschacht" },
      { id: 21, label: "21 - Reparaturen" },
      { id: 22, label: "22 - Umbau, Sanierungen" },
      { id: 23, label: "23 - TÜV-Mängel" },
      { id: 24, label: "24 - Demontage" },
      { id: 25, label: "25 - Gerüstbau" },
      { id: 190, label: "19 - An/Abreise" },
      { id: 70, label: "70 - Büro" },
    ]
  },
  allgemein: {
    id: 'allgemein',
    name: 'Allgemein',
    description: 'Einfache Basiscodes für alle Branchen',
    codes: [
      { id: 1, label: "01 - Arbeit" },
      { id: 2, label: "02 - Büro" },
      { id: 3, label: "03 - Besprechung" },
      { id: 4, label: "04 - Fahrzeit" },
      { id: 5, label: "05 - Sonstiges" },
    ]
  },
  leer: {
    id: 'leer',
    name: 'Leer starten',
    description: 'Keine Codes - komplett selbst erstellen',
    codes: []
  }
};

// Für Abwärtskompatibilität - Standard-Codes (Kogler)
// DEPRECATED: Nutze stattdessen useWorkCodes() Hook
export const WORK_CODES = WORK_CODE_PRESETS.kogler.codes;

// -------------------------------------------------------
// RESTLICHE KONSTANTEN
// -------------------------------------------------------
export const ENTRY_TYPES = {
  WORK: "work",
  VACATION: "vacation",
  SICK: "sick",
  PUBLIC_HOLIDAY: "public_holiday",
  TIME_COMP: "time_comp",
};

export const GITHUB = {
  USER: "D3rPaPaH0d3n",
  REPO: "eStundnzettl",
};

export const ANIMATION = {
  DURATION: 0.3,
};

export const LIMITS = {
  MAX_IMG_SIZE: 1024,
};

export const INTERVALS = {
  LIVE_TIMER_UPDATE: 30000, 
};