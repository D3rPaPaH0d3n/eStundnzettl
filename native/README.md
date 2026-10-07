# eStundnzettl — Native Android-App

Die eStundnzettl-App in Kotlin (Jetpack Compose, Material 3, Room). Sie
löst die frühere Ionic/Capacitor-App ab und ist die einzige App in `main`;
die Freigabe erfolgt über die Play-Store-Tracks. Die alte Capacitor-App
4.5.x liegt nur noch im Branch `legacy/capacitor-4.5.x` (für
Notfall-Hotfixes); der letzte `main`-Stand mit `src/`, `android/` & Co. ist
als Tag `archive/capacitor-on-main` erhalten.

Code-Kommentare wie „Port von `XYZ.tsx`" oder Pfade wie `src/utils/...`
beziehen sich auf Dateien der früheren Capacitor-App im Branch
`legacy/capacitor-4.5.x` (bzw. im Tag `archive/capacitor-on-main`).

## Module

| Modul   | Typ        | Inhalt |
|---------|------------|--------|
| `:core` | Kotlin/JVM | Domain-Modelle, Locale-System inkl. aller Feiertagsberechnungen (AT, 16×DE, 26×CH, orthodox/islamisch), komplette Berechnungslogik (`TimeCalculations`, `CalculationRules`, Zeitausgleichskonto `OvertimeAccount`), Backup-Format (SHA-256-Checksum, Compose/Analyze, Config-Koerzierung). Ursprünglich 1:1 aus `timeCalculations.ts`, `calculationConfig.ts` und `storageBackup.ts` der Capacitor-App portiert. Keine Android-Abhängigkeiten. |
| `:app`  | Android    | Compose-UI, Room-Datenbank (Schema kompatibel zur SQLite-DB der Capacitor-App), Repositories, Settings-Store, atomarer Snapshot-Restore, Legacy-Datenübernahme, Cloud-Backups (Nextcloud, Google Drive, lokaler Ordner), PDF-Bericht und -Archiv. |

## Bauen & Testen

Die `:core`-Tests laufen als reine JUnit-Tests auf der JVM (die
Kernfälle stammen aus der früheren Vitest-Suite — gleiche Eingaben,
gleiche Erwartungswerte):

```
./gradlew :core:test
```

Line-Coverage des `:core`-Moduls per Kover (HTML-Bericht unter
`core/build/reports/kover/html/`; das Coverage-Badge im Repo wird in CI
aus `:core:koverXmlReport` erzeugt):

```
./gradlew :core:koverHtmlReport
```

App-Unit-Tests und Debug-APK (wie in CI):

```
./gradlew :app:testDebugUnitTest :app:assembleDebug
```

Instrumentierte Tests (`app/src/androidTest`, u. a. Smoke-Tests der
Kernabläufe, Legacy-DB-Import, Restore-Integrität) brauchen ein Gerät
oder einen Emulator:

```
./gradlew :app:connectedDebugAndroidTest
```

`:app` benötigt ein Android SDK und Zugriff auf Googles Maven-Repository —
ohne SDK wird das Modul beim Konfigurieren automatisch übersprungen
(`settings.gradle.kts`), damit `:core` überall baubar bleibt. Zum Bauen der
App das Verzeichnis `native/` in Android Studio öffnen.

Version (`versionName`, `versionCode`) steht ausschließlich in
`app/build.gradle.kts`; Release-Builds, Versions-Bump und Play-Upload
übernimmt der Workflow `.github/workflows/deploy-play-store.yml`.

## Design-Entscheidungen

- **DB-Schema von der Capacitor-App übernommen** (Tabellen `entries`,
  `settings`, `work_codes`, `attachments`, `attachment_labels`,
  `backup_metadata` mit identischen Spaltennamen, Vorlage:
  `src/db/schema.ts` in `legacy/capacitor-4.5.x`), damit Daten aus der
  Capacitor-App zeilenweise importiert werden können. Settings-Values
  bleiben JSON-Strings wie in der TS-App.
- **`applicationId` = `com.estundnzettl.app`** (Release), damit die native
  App die bestehende Play-Store-App als In-Place-Update ersetzt.
  Debug-Builds nutzen den Suffix `.native` (parallel zur Play-Store-App
  installierbar). Der Suffix bleibt, weil der Google-Drive-OAuth-Client
  im Google-Cloud-Projekt für dieses Debug-Paket samt SHA-1 des
  gemeinsamen Debug-Keystores registriert ist — ohne ihn schlägt die
  Drive-Anmeldung in Debug-Builds fehl.
- **Datums-Semantik**: Datums-Strings (`YYYY-MM-DD`) und Zeit-Strings
  (`HH:MM`) werden wie in der TS-App als Strings verarbeitet; Vergleiche
  sind lexikografisch. `getDayOfWeek` behält die JS-Konvention (0=Sonntag).
- **Rundungsverhalten** (`Math.floor`-Split bei Nachtschichten,
  `Math.round` bei Halbtagen) ist exakt nachgebildet.
- **Backup-Kompatibilität bewiesen**: Die Referenz-Fixtures unter
  `core/src/test/resources/fixtures/` wurden von der echten
  TS-Implementierung erzeugt (Generator
  `src/utils/__tests__/generateKotlinFixture.test.ts`, nur im Tag
  `archive/capacitor-on-main`) und bleiben eingecheckt. Die Kotlin-Tests
  beweisen byte-identische SHA-256-Checksummen — Backups beider Apps
  verifizieren sich gegenseitig, inkl. `localeCompare`-Key-Sortierung
  (Collator) und JSON.stringify-Escaping.
- **Datenübernahme aus 4.5.x** (bleibt bewusst im Code, für Nutzer, die
  von der Capacitor-App updaten):
  - `LegacyDbImporter` kopiert die Capacitor-DB
    (`databases/estundnzettlSQLite.db`) beim ersten Start zeilenweise nach
    Room; die Alt-DB wird nur gelesen und bleibt als Rollback-Sicherheit
    unangetastet.
  - `LegacyWebStorageImporter` + `LegacyLocalStorageMapper` übernehmen
    noch im WebView-localStorage liegende Daten (ProGuard-Keep-Regel für
    `@JavascriptInterface` in `app/proguard-rules.pro`).
  - `SecretStore` migriert das Nextcloud-App-Passwort aus dem
    Capacitor-Secure-Storage bzw. dem Legacy-`enc:v1`-Wert.

## Aktueller Stand

Der Port der Capacitor-App ist abgeschlossen (der frühere Phasenplan
entfällt). Enthalten sind:

- **Erfassung**: Dashboard (Monats-Statistik, Wochen-Gruppen, Tag-Saldo),
  Eintragsformular inkl. Dokument-Anhängen, Live-Timer mit
  Auto-Checkout über Mitternacht.
- **Einrichtung & Hilfe**: Onboarding-Wizard (neu einrichten,
  Schnellstart nur mit Arbeitszeiten, Demo-Daten, Wiederherstellung aus
  Datei, Ordner, Google Drive oder Nextcloud), App- und
  Einstellungen-Tour, Hilfe, In-App-Changelog („Was ist neu",
  `app/src/main/assets/changelog`).
- **Berechnung**: Regionen AT/DE/CH bzw. „Eigener Plan",
  Arbeitszeitmodell, Tätigkeitscodes, Zeitausgleichskonto.
- **PDF**: Vektor-PDF (`pdf/ReportPdfGenerator.kt`) mit Vorschau via
  `PdfRenderer`, Teilen via `FileProvider`, Speichern via Storage Access
  Framework, optionaler Firmen-Briefkopf (Logo + Fußzeile) und
  automatisches Monats-PDF-Archiv (`data/PdfArchiveManager.kt`) mit den
  Zielen lokal, Nextcloud und Google Drive.
- **Backup**: Export/Import als JSON, Auto-Backup
  (`AutoBackupManager` in `data/CloudBackup.kt`) in einen lokalen Ordner,
  nach Nextcloud (`data/NextcloudClient.kt`, App-Passwort in
  `data/SecretStore.kt`) und Google Drive (`data/GoogleDriveManager.kt`).
- **Sonstiges**: Material You, Deutsch/Englisch
  (`app/src/main/assets/i18n`), Hausmasta-Modus mit Diagnose-Ansicht,
  Absturz-Wiederherstellung, Play-Bewertungsfluss und Update-Hinweis
  für Sideload-Installationen.
