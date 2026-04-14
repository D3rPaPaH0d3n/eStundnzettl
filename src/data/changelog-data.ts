/**
 * Changelog-Facade.
 *
 * Gibt je nach aktuell aktiver UI-Sprache die deutschen oder englischen
 * Changelog-Einträge zurück. Konsumenten (ChangelogModal) sollten die
 * Funktion bei Sprachwechsel neu aufrufen — typischerweise via
 * `useMemo` mit `i18n.language` als Dependency.
 *
 * Re-exportiert zusätzlich `CHANGELOG_DATA` als synchronen Default für
 * Altcode, damit bestehende Imports nicht bricht. Der Default nutzt
 * die aktuelle Sprache zum Zeitpunkt des ersten Imports.
 */
import i18n from "../i18n";
import { CHANGELOG_DATA_DE } from "./changelog-data.de";
import { CHANGELOG_DATA_EN } from "./changelog-data.en";

export function getChangelogData() {
  const lang = i18n.language?.split("-")[0]?.toLowerCase();
  return lang === "en" ? CHANGELOG_DATA_EN : CHANGELOG_DATA_DE;
}

/** Default-Export für Altcode. Reagiert NICHT live auf Sprachwechsel. */
export const CHANGELOG_DATA = getChangelogData();
