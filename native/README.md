# eStundnzettl — Native Kotlin Rewrite

Nativer Android-Rewrite der Ionic/Capacitor-App in Kotlin (Jetpack Compose +
Room). Ziel: funktional identisches Verhalten zur bestehenden App bei
sauberer, nativer Optik.

## Module

| Modul   | Typ        | Inhalt |
|---------|------------|--------|
| `:core` | Kotlin/JVM | Domain-Modelle, Locale-System inkl. aller Feiertagsberechnungen (AT, 16×DE, 26×CH, orthodox/islamisch), komplette Berechnungslogik (`TimeCalculations`, `CalculationRules`), Backup-Format (SHA-256-Checksum, Compose/Analyze, Config-Koerzierung). 1:1-Port von `timeCalculations.ts`, `calculationConfig.ts` und `storageBackup.ts`. |
| `:app`  | Android    | Compose-UI, Room-Datenbank (Schema identisch zu `src/db/schema.ts`), Repositories, Settings-Store, atomarer Snapshot-Restore, Legacy-DB-Importer, ID-Generator. |

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
- **Backup-Kompatibilität bewiesen**: Die Referenz-Fixtures unter
  `core/src/test/resources/fixtures/` werden von der echten
  TS-Implementierung erzeugt (`src/utils/__tests__/generateKotlinFixture.test.ts`).
  Die Kotlin-Tests beweisen byte-identische SHA-256-Checksummen — Backups
  beider Apps verifizieren sich gegenseitig, inkl. `localeCompare`-
  Key-Sortierung (Collator) und JSON.stringify-Escaping.
- **Datenübernahme**: `LegacyDbImporter` kopiert die Capacitor-DB
  (`databases/estundnzettlSQLite.db`) beim ersten Start zeilenweise nach
  Room; die Alt-DB bleibt als Rollback-Sicherheit unangetastet.

## Phasenplan

1. ✅ **Phase 1** — Projektgerüst, Domain-Modelle, Locale-/Feiertagssystem,
   Berechnungslogik + portierte Tests, Room-Schema.
2. ✅ **Phase 2** — Repositories, Settings-Store, Backup-Import/-Export
   (JSON-Format + Checksum kompatibel zu `storageBackup.ts`, per Fixtures
   bewiesen), Datenübernahme aus der Capacitor-DB.
3. 🔶 **Phase 3 (in Arbeit)** — UI Screen für Screen:
   - ✅ App-Shell (Header, Navigation, Theme hell/dunkel, Toasts)
   - ✅ i18n: identische de/en-Sprachdateien der Web-App (Gradle-Sync aus
     `src/i18n/locales`, i18next-kompatibler Lookup inkl. Plurale)
   - ✅ Dashboard (Monats-Statistik-Karte, Monats-Picker, Wochen-Gruppen
     mit Tages-Karten, Swipe-zum-Löschen, Tag-Saldo)
   - ✅ Eintragsformular (Typ-Segmente, Fahrt-Untertypen, Auto/Manuell für
     Sondertypen, Material-Picker, Pause, Tätigkeits-Sheet mit Quick-Add,
     Projekt-Autocomplete, „Wie zuletzt")
   - ✅ Live-Timer (FAB: Tap = neuer Eintrag, Long-Press = Timer;
     Pause/Fortsetzen, Status-Pille, Auto-Checkout über Mitternacht)
   - ✅ Settings-Screen: Profil (inkl. Foto max. 1024px/JPEG wie die
     Web-App), Aufzeichnungsart, Arbeitszeitmodell (Presets, Lock,
     7-Tage-Grid), Tätigkeitscode-Manager, Stundenberechnung
     (Locale-Picker im Hausmasta-Modus, Überstunden-/Krank-Regeln,
     Feiertage/Halbtage inkl. Import aus AT/DE/CH/orthodox/islamisch,
     Auto-Pausen, Urlaub, Neuberechnung), Backup-Export/-Import über das
     Storage Access Framework mit Import-Konflikt-Dialog, Darstellung
     (Sprache/Theme/Material You dynamische Farben), Hausmasta-Modus,
     App-Info mit Danger-Zone
   - ✅ Onboarding-Wizard (Welcome mit Schnellstart/Neu/Restore,
     Profil, Stundenberechnung inkl. „Eigener Plan"-Zweig,
     Arbeitszeitmodell mit Tages-Feinanpassung, Tätigkeits-Presets,
     Backup-Restore aus Datei, Abschluss mit Original-Persistenz)
   - ⬜ AttachmentManager, Demo-Daten, App-Tour
4. 🔶 **Phase 4** — PDF-Report
   - ✅ Vektor-PDF-Generator (`pdf/ReportPdfGenerator.kt`, Layout-Port
     von `ReportPdfDocument.tsx` auf android.graphics.pdf: Kopf mit
     Foto, Tabelle mit Zebra/Feiertag/Nachtschicht, Zusammenfassung,
     Urlaubsbilanz, Notiz-Block, Seitenumbruch mit wiederholtem Kopf)
   - ✅ Bericht-Screen (`ui/ReportScreen.kt`): Live-Vorschau via
     PdfRenderer, Monats-/KW-Filter, Notiz-Dialog, `pdfDisplay`-Toggles
     (Hausmasta), Teilen via FileProvider, Speichern via SAF
   - ✅ Automatisches Monats-PDF-Archiv (`data/PdfArchiveManager.kt`:
     täglicher Lauf bei Start/Resume, Monatswechsel-Finalisierung,
     Content-Hash-Skip, lokales Ziel via MediaStore mit Fallback-Kette;
     Settings-Sektion mit Zielen + „Jetzt ausführen". Nextcloud/GDrive-
     Ziele folgen mit Phase 5)
5. 🔶 **Phase 5** — Cloud-Backups
   - ✅ Nextcloud: Login Flow v2 (Browser + Polling), WebDAV-Client
     (`data/NextcloudClient.kt`), App-Passwort in
     EncryptedSharedPreferences (`data/SecretStore.kt`, inkl.
     Entschlüsselung des Legacy-"enc:v1"-Werts aus der importierten DB),
     Verbinden/Testen/Trennen in den Backup-Einstellungen
   - ✅ Auto-Backup (`data/AutoBackupManager.kt`): debounced Auto-Save,
     Background-Trigger, manueller Lauf, Hash-Skip, exponentieller
     Backoff, Ziele lokal + Nextcloud + Google Drive
   - ✅ Google Drive (`data/GoogleDriveManager.kt`): AuthorizationClient
     (drive.appdata für Backups, drive.file für das PDF-Archiv),
     Drive-REST-Upload/-Update/-Download. **Hinweis:** funktioniert erst,
     wenn Paketname `com.estundnzettl.app` (+ `.native` Debug-Suffix)
     samt Signatur-SHA-1 als Android-OAuth-Client im Google-Cloud-Projekt
     registriert ist — bis dahin liefert der Verbinden-Dialog einen
     Play-Services-Fehler.
   - ✅ PDF-Archiv-Ziele Nextcloud + Google Drive freigeschaltet
   - ⬜ Cloud-Restore im Onboarding (Restore aus Datei existiert),
     Release-Vorbereitung
6. 🔶 **Phase 6** — Feinschliff
   - ✅ Optik & Animationen: View-Übergänge, Long-Press+Hochwisch-Geste
     am Timer-FAB mit Status-Pille, Skeleton-Loading, animierte
     Wochen-/Settings-Karten mit rotierenden Chevrons
   - ✅ Eingabe-Komfort: iOS-artige Wheel-Picker für Uhrzeit
     (TimePickerDrawer-Port) und Dauer (DecimalDurationPicker-Port)
     in Formular + Arbeitszeitmodell
   - ✅ Feedback: Haptik an den Kernaktionen, Snackbars statt
     Standard-Toasts, einmalige Hinweis-Boxen (Report),
     Einstellungen-Tour, nativer Play-Bewertungsfluss nach echter Nutzung
     und PDF-Export sowie getrennte Kaffee-Unterstützung in den Einstellungen
