# Claude Code Projektrichtlinien

## Sprache

- Kommunikation mit dem User: Deutsch
- Code und Commits: Englisch

## Projekt

- eStundnzettl: Elektronischer Stundenzettel als native Android-App
- Einzige App auf `main`: `native/` — Kotlin, Jetpack Compose, Material 3, Room
  - `:core` — reines Kotlin/JVM (Modelle, Berechnung, Feiertage, Backup-Format)
  - `:app` — Android-UI, Room, Cloud-Backups, PDF
- `main` baut und veröffentlicht die Kotlin-App; Version nur in
  `native/app/build.gradle.kts` (`versionName`, `versionCode`)
- CI-Tests/Build (in `native/`): `./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug`

## Native PDF-Pipeline

- Vektor-PDF via `android.graphics.pdf.PdfDocument` in
  `native/app/src/main/kotlin/com/estundnzettl/app/pdf/ReportPdfGenerator.kt`.
- Vorschau via Android `PdfRenderer` in der nativen Compose-Oberfläche.
- Teilen erfolgt über `FileProvider`, Speichern über das Storage Access Framework.
- Optionaler Firmen-Briefkopf (Logo + Fußzeile) über `UserData.reportBranding`.
  `getEffectiveReportBranding()` liefert `null`, solange er aus oder leer ist —
  dann müssen Kopfzeile, Seitenrand und Umbruch exakt dem Standard-Layout entsprechen.
- Anzeige-Toggles: `CalculationConfig.pdfDisplay` (`PdfDisplayConfig`, alle Felder
  default AN), aufgelöst über `getEffectivePdfDisplay()` in
  `native/core/src/main/kotlin/com/estundnzettl/core/calc/CalculationRules.kt`.
  Im Bericht-Screen nur im Hausmasta-Modus (`userData.expertMode`) einstellbar.

## Legacy / Migration

- Die frühere Capacitor-App (React/TypeScript, 4.5.x) liegt nicht mehr auf `main`:
  Branch `legacy/capacitor-4.5.x` (nur Notfall-Hotfixes) und Tag
  `archive/capacitor-on-main` (letzter `main`-Stand mit `src/`, `android/` usw.;
  enthält auch den TS-Generator `src/utils/__tests__/generateKotlinFixture.test.ts`
  für die eingecheckten Fixtures unter `native/core/src/test/resources/fixtures/`).
- Der Migrationscode der nativen App bleibt erhalten, damit Updates von 4.5.x
  keine Daten verlieren: `LegacyDbImporter`, `LegacyWebStorageImporter`
  (inkl. ProGuard-Keep-Regel für `@JavascriptInterface`), `LegacyLocalStorageMapper`
  und die Capacitor-Secret-Migration in `SecretStore`. Nicht entfernen.
