/**
 * i18next-Initialisierung.
 *
 * Auflösung der Startsprache (Priorität):
 *   1. Explizit gespeicherte Wahl in localStorage (Key: estundnzettl_language)
 *   2. Gerätesprache aus navigator.language (erstes Tag, z.B. "en-US" -> "en")
 *   3. Fallback auf Deutsch
 *
 * Nur unterstützte Sprachen werden akzeptiert; alles andere kippt auf "de".
 *
 * Die Persistenz (Schreibzugriff) erfolgt über den Hook useLocaleSetting.
 * Hier wird nur gelesen, damit i18n ohne React-Kontext initialisieren kann.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./locales/de.json";
import en from "./locales/en.json";

const SUPPORTED_LANGUAGES = ["de", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** localStorage-Key für die persistierte UI-Sprache. */
export const LANGUAGE_STORAGE_KEY = "estundnzettl_language";

const isSupported = (value: string | null | undefined): value is SupportedLanguage =>
  !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/**
 * Ermittelt die initiale Sprache aus localStorage oder Gerätesprache.
 * Muss synchron laufen, damit i18next beim ersten Render die richtige
 * Sprache hat.
 */
export function detectInitialLanguage(): SupportedLanguage {
  try {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
    if (isSupported(stored)) return stored;
  } catch {
    // localStorage nicht verfügbar (SSR, Private Mode) -> Fallback
  }

  try {
    const nav = typeof navigator !== "undefined" ? navigator.language : undefined;
    const short = nav?.split("-")[0]?.toLowerCase();
    if (isSupported(short)) return short;
  } catch {
    // ignore
  }

  return "de";
}

if (!i18n.isInitialized) {
  const initial = detectInitialLanguage();

  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    lng: initial,
    fallbackLng: "de",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: {
      escapeValue: false, // React schützt bereits
    },
    returnEmptyString: false,
  });

  // <html lang> mit initialer Sprache synchronisieren, damit
  // Screen-Reader und Browser die richtige Sprache sehen.
  if (typeof document !== "undefined") {
    document.documentElement.lang = initial;
  }
}

export { SUPPORTED_LANGUAGES };
export default i18n;
