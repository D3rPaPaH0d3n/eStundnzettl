// ============================================================
// CONSTANTS.JS - Zentrale Konstanten für Kogler Zeiterfassung
// ============================================================
// Diese Datei sammelt alle "magischen Zahlen" und festen Werte
// an einem Ort. Das macht den Code lesbarer und Änderungen einfacher.
// ============================================================

// -------------------------------------------------------
// APP VERSION (Einzige Quelle der Wahrheit!)
// -------------------------------------------------------
export const APP_VERSION = "4.4.3";

// -------------------------------------------------------
// ARBEITSZEIT (in Minuten)
// -------------------------------------------------------
export const MINUTES = {
  // Standard Arbeitstage
  FULL_DAY: 510,           // 8,5 Stunden (Mo-Do bei Kogler)
  FRIDAY: 270,             // 4,5 Stunden (Fr bei Kogler)
  
  // Pausen
  DEFAULT_PAUSE: 30,       // Standard-Pausendauer
  
  // Rundung
  ROUNDING_INTERVAL: 15,   // Live-Timer rundet auf 15 Minuten
  
  // Für Berechnungen
  HOUR: 60,                // Minuten pro Stunde
};

// -------------------------------------------------------
// ARBEITSZEIT-VORLAGEN (workDays Array)
// Index: 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
// -------------------------------------------------------
export const WORK_PROFILES = {
  // Kogler Standard: 38,5h Woche (Mo-Do 8,5h + Fr 4,5h)
  KOGLER_38_5: [0, 510, 510, 510, 510, 270, 0],
  
  // Alternative: 40h Woche (Mo-Fr je 8h)
  STANDARD_40: [0, 480, 480, 480, 480, 480, 0],
  
  // Leer (für komplett eigene Konfiguration)
  EMPTY: [0, 0, 0, 0, 0, 0, 0],
};

// -------------------------------------------------------
// ARBEITS-CODES (Vollständige Kogler Liste)
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
// EINTRAGS-TYPEN
// -------------------------------------------------------
export const ENTRY_TYPES = {
  WORK: "work",
  VACATION: "vacation",
  SICK: "sick",
  PUBLIC_HOLIDAY: "public_holiday",
  TIME_COMP: "time_comp",      // Zeitausgleich
};

// -------------------------------------------------------
// LOCALSTORAGE KEYS
// -------------------------------------------------------
export const STORAGE_KEYS = {
  ENTRIES: "kogler_entries",
  USER: "kogler_user",
  THEME: "kogler_theme",
  AUTO_BACKUP: "kogler_auto_backup",
  LAST_CODE: "kogler_last_code",
  LIVE_TIMER: "kogler_live_timer",
  LAST_BACKUP: "kogler_last_backup_date",
};

// -------------------------------------------------------
// GITHUB REPO (für Update-Check)
// -------------------------------------------------------
export const GITHUB = {
  USER: "D3rPaPaH0d3n",
  REPO: "kogler-zeit",
};

// -------------------------------------------------------
// UI / ANIMATION
// -------------------------------------------------------
export const ANIMATION = {
  // Framer Motion Varianten
  PAGE_TRANSITION_DURATION: 0.3,
  SPRING_DAMPING: 25,
  SPRING_STIFFNESS: 200,
};

// -------------------------------------------------------
// TIMER / INTERVALLE
// -------------------------------------------------------
export const INTERVALS = {
  LIVE_TIMER_UPDATE: 30000,    // 30 Sekunden (Display Update)
  AUTO_SAVE_DEBOUNCE: 500,     // 500ms Debounce für localStorage
  UPDATE_CHECK_DELAY: 2000,    // 2 Sekunden nach App-Start
  AUTO_BACKUP_DELAY: 2000,     // 2 Sekunden nach App-Start
};

// -------------------------------------------------------
// LIMITS
// -------------------------------------------------------
export const LIMITS = {
  MAX_PHOTO_WIDTH: 1024,       // Profilbild max. Breite in px
  MAX_PHOTO_HEIGHT: 1024,      // Profilbild max. Höhe in px
  PHOTO_QUALITY: 0.9,          // JPEG Qualität (0-1)
};

// -------------------------------------------------------
// WOCHENTAGE (für Anzeige und Berechnung)
// -------------------------------------------------------
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
