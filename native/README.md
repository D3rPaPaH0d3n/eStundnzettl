# eStundnzettl — Native Kotlin Rewrite

Nativer Android-Rewrite der Ionic/Capacitor-App in Kotlin (Jetpack Compose +
Room). Ziel: funktional identisches Verhalten zur bestehenden App bei
sauberer, nativer Optik.

## Module

| Modul   | Typ        | Inhalt |
|---------|------------|--------|
| `:core` | Kotlin/JVM | Domain-Modelle, Locale-System inkl. aller Feiertagsberechnungen (AT, 16×DE, 26×CH, orthodox/islamisch), komplette Berechnungslogik (`TimeCalculations`, `CalculationRules`). 1:1-Port von `src/utils/timeCalculations.ts` und `src/utils/calculationConfig.ts`. |
| `:app`  | Android    | Compose-UI, Room-Datenbank (Schema identisch zu `src/db/schema.ts`), Mapper, ID-Generator. |

Die Funktionsidentität des `:core`-Moduls wird durch die portierte
Vitest-Suite abgesichert (gleiche Eingaben, gleiche Erwartungswerte):

```
./gradlew :core:test
```

`:app` benötigt ein Android SDK und Zugriff auf Googles Maven-Repository —
ohne SDK wird das Modul beim Konfigurieren automatisch übersprungen
(`settings.gradle.kts`), damit `:core` überall baubar bleibt. Zum Bauen der
App das Verzeichnis `native/` in Android Studio öffnen.

## Design-Entscheidungen

- **DB-Schema 1:1 übernommen** (Tabellen `entries`, `settings`,
  `work_codes`, `attachments`, `attachment_labels`, `backup_metadata` mit
  identischen Spaltennamen), damit Daten aus der Capacitor-App zeilenweise
  importiert werden können. Settings-Values bleiben JSON-Strings wie in der
  TS-App.
- **`applicationId` = `com.estundnzettl.app`** (Release), damit die native
  App die bestehende Play-Store-App als In-Place-Update ersetzen kann.
  Debug-Builds nutzen den Suffix `.native` und sind parallel zur
  Produktiv-App installierbar (für den direkten Vergleich).
- **Datums-Semantik**: Datums-Strings (`YYYY-MM-DD`) und Zeit-Strings
  (`HH:MM`) werden wie in der TS-App als Strings verarbeitet; Vergleiche
  sind lexikografisch. `getDayOfWeek` behält die JS-Konvention (0=Sonntag).
- **Rundungsverhalten** (`Math.floor`-Split bei Nachtschichten,
  `Math.round` bei Halbtagen) ist exakt nachgebildet.

## Phasenplan

1. ✅ **Phase 1** — Projektgerüst, Domain-Modelle, Locale-/Feiertagssystem,
   Berechnungslogik + portierte Tests, Room-Schema.
2. ⬜ **Phase 2** — Repositories/ViewModels, Settings-Store,
   Backup-Import/-Export (JSON-Format kompatibel zu `schemas/backup.ts`),
   Datenübernahme aus der Capacitor-DB.
3. ⬜ **Phase 3** — UI Screen für Screen: Dashboard, EntryForm/Timer,
   Monatsansicht, Settings, Onboarding.
4. ⬜ **Phase 4** — PDF-Report (Layout nach `ReportPdfDocument.tsx`,
   `pdfDisplay`-Toggles), PDF-Archiv.
5. ⬜ **Phase 5** — Cloud-Backups (Google Drive, Nextcloud), Google-Login,
   Feinschliff, Release-Vorbereitung.
