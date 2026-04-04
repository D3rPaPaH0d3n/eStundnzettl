/**
 * i18next-Initialisierung.
 *
 * Welle 3.1.0: Nur Infrastruktur. Default-Sprache ist Deutsch (so wie die App
 * sie heute überall nutzt). EN existiert als Fallback-Stub, ein Language-Picker
 * wird erst in einer späteren Welle freigeschaltet.
 *
 * Die Komponenten der App nutzen diese Initialisierung nur punktuell — vor
 * allem für ARIA-Labels und zukünftige Toast-Nachrichten. Eine vollständige
 * String-Migration ist bewusst nicht Teil dieser Welle.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./locales/de.json";
import en from "./locales/en.json";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    lng: "de",
    fallbackLng: "de",
    interpolation: {
      escapeValue: false, // React schützt bereits
    },
    returnEmptyString: false,
  });
}

export default i18n;
