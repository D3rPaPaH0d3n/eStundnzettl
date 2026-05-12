/**
 * useLocaleSetting — persistiert die UI-Sprache in localStorage und hält sie
 * mit i18next sowie dem <html lang>-Attribut in Sync.
 *
 * Storage-Key: STORAGE_KEYS.LANGUAGE (estundnzettl_language).
 *
 * Hinweis: Die *Initialerkennung* passiert bereits in src/i18n/index.ts
 * (detectInitialLanguage). Dieser Hook kümmert sich nur um Änderungen
 * zur Laufzeit — typischerweise ausgelöst durch den Language-Picker in
 * den Settings.
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../i18n";

const isSupported = (value: string): value is SupportedLanguage =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

export function useLocaleSetting() {
  const { i18n } = useTranslation();

  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const current = i18n.language?.split("-")[0];
    return current && isSupported(current) ? current : "de";
  });

  // Auf externe Änderungen reagieren (z.B. i18n.changeLanguage von anderer Stelle).
  useEffect(() => {
    const handler = (lng: string) => {
      const short = lng.split("-")[0];
      if (isSupported(short)) {
        setLanguageState(short);
      }
    };
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  const setLanguage = useCallback(
    (next: SupportedLanguage) => {
      if (!isSupported(next)) return;
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      } catch {
        // ignore persistence errors
      }
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
      void i18n.changeLanguage(next);
      setLanguageState(next);
    },
    [i18n],
  );

  return { language, setLanguage, supportedLanguages: SUPPORTED_LANGUAGES };
}
