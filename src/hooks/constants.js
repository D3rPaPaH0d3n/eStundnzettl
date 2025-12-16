// ============================================================
// CONSTANTS.JS - Zentrale Konstanten für Kogler Zeiterfassung
// ============================================================

export const APP_VERSION = "5.1.0y";

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
    label: '38,5h Standard', // "(Kogler)" entfernt
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
    label: '38,5h - 4 Tage Woche',
    description: 'Mo-Mi 10,0h / Do 8,5h', // Beschreibung aktualisiert
    // Mo, Di, Mi = 600min (10h), Do = 510min (8,5h)
    days: [0, 600, 600, 600, 510, 0, 0] 
  },
  {
    id: '40-classic',
    label: '40h Klassisch',
    description: 'Mo-Do 8,5h / Fr 6,0h',
    days: [0, 510, 510, 510, 510, 360, 0]
  },
  {
    id: '40-even',
    label: '40h Gleichmäßig',
    description: 'Mo-Fr 8,0h',
    days: [0, 480, 480, 480, 480, 480, 0]
  },
  {
    id: '40-4days',
    label: '40h - 4 Tage Woche',
    description: 'Mo-Do 10,0h',
    days: [0, 600, 600, 600, 600, 0, 0]
  },
  {
    id: 'custom',
    label: 'Benutzerdefiniert',
    description: 'Manuelle Eingabe der Stunden',
    days: null // Spezieller Marker
  }
];

// Fallback / Legacy
export const WORK_PROFILES = {
  KOGLER_38_5: [0, 510, 510, 510, 510, 270, 0],
  STANDARD_40: [0, 480, 480, 480, 480, 480, 0],
  EMPTY: [0, 0, 0, 0, 0, 0, 0],
};

// -------------------------------------------------------
// ARBEITS-CODES
// -------------------------------------------------------
export const WORK_CODES = [
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
];

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

export const STORAGE_KEYS = {
  ENTRIES: "kogler_entries",
  USER: "kogler_user",
  THEME: "kogler_theme",
  AUTO_BACKUP: "kogler_auto_backup",
  LAST_CODE: "kogler_last_code",
  LIVE_TIMER: "kogler_live_timer",
  LAST_BACKUP: "kogler_last_backup_date",
};

export const GITHUB = {
  USER: "D3rPaPaH0d3n",
  REPO: "kogler-zeit",
};

export const ANIMATION = {
  PAGE_TRANSITION_DURATION: 0.3,
  SPRING_DAMPING: 25,
  SPRING_STIFFNESS: 200,
};

export const INTERVALS = {
  LIVE_TIMER_UPDATE: 30000,
  AUTO_SAVE_DEBOUNCE: 500, 
  UPDATE_CHECK_DELAY: 2000,
  AUTO_BACKUP_DELAY: 2000, 
};

export const LIMITS = {
  MAX_PHOTO_WIDTH: 1024,
  MAX_PHOTO_HEIGHT: 1024,
  PHOTO_QUALITY: 0.9,
};

export const WEEKDAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];