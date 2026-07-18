# Claude Code Projektrichtlinien

## Sprache

- Kommunikation mit dem User: Deutsch
- Code und Commits: Englisch

## Projekt

- eStundnzettl: Elektronischer Stundenzettel als native Android-App
- Haupt-App: `native/` — Kotlin, Jetpack Compose, Material 3, Room
- Legacy-/Migrationsreferenz: React/TypeScript und Capacitor unter `src/` und `android/`
- `main` baut und veröffentlicht standardmäßig die Kotlin-App

## Native PDF-Pipeline

- Vektor-PDF via `android.graphics.pdf.PdfDocument` in
  `native/app/src/main/kotlin/com/estundnzettl/app/pdf/ReportPdfGenerator.kt`.
- Vorschau via Android `PdfRenderer` in der nativen Compose-Oberfläche.
- Teilen erfolgt über `FileProvider`, Speichern über das Storage Access Framework.

## Legacy-PDF-Pipeline

- Die frühere Capacitor-Implementierung bleibt für Migration und
  Vergleichstests erhalten. Vektor-PDF via `@react-pdf/renderer`. Komponente:
  `src/components/ReportPdfDocument.tsx` (Single Source of Truth fuer
  Vorschau und Export).
- In-App-Vorschau nutzt `pdfjs-dist` Canvas-Render
  (`src/components/PdfBlobPreview.tsx`), weil Capacitor-Android-WebView
  blob:-iframe-Sources blockiert.
- Anzeige-Toggles: `CalculationConfig.pdfDisplay` (8 Felder, alle
  default AN). Resolved via `getEffectivePdfDisplay()` in
  `src/utils/calculationConfig.ts`. UI: `PdfLayoutSettings` —
  sichtbar nur im Hausmasta-Modus (`userData.expertMode`).
