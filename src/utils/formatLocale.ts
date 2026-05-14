/**
 * formatLocale — Dynamischer Intl-Locale-Helper.
 *
 * Mappt die aktuelle UI-Sprache aus i18next auf die passenden
 * Locale-Tags für Intl (`toLocaleDateString` / `toLocaleString`).
 *
 * Wird als Runtime-Lookup verwendet, damit ein Language-Switch
 * (Settings → Sprache) sofort in allen Datums-Formatierungen sichtbar
 * wird, ohne dass Komponenten erneut mounten müssen.
 */

import i18n from "../i18n";

export type SupportedLanguage = "de" | "en";

/**
 * Liefert die Basis-Sprache (zweistelliger Tag wie "de" oder "en") aus
 * i18next. Fallback: "de".
 */
export function getCurrentLanguage(): SupportedLanguage {
  const raw = i18n.language?.split("-")[0]?.toLowerCase();
  return raw === "en" ? "en" : "de";
}

/**
 * BCP-47-Locale für `Intl.*`-APIs und `toLocaleString`-/`toLocaleDateString`-
 * Aufrufe. Gibt "de-DE" oder "en-US" zurück.
 */
export function getIntlLocale(): "de-DE" | "en-US" {
  return getCurrentLanguage() === "en" ? "en-US" : "de-DE";
}
