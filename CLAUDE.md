# Claude Code Projektrichtlinien

## Sprache

- Kommunikation mit dem User: Deutsch
- Code und Commits: Englisch

## Projekt

- eStundnzettl: Elektronischer Stundenzettel (Ionic/Capacitor App)
- Tech Stack: TypeScript, Vite, Vitest

## PDF-Pipeline

- Vektor-PDF via `@react-pdf/renderer`. Komponente:
  `src/components/ReportPdfDocument.tsx` (Single Source of Truth fuer
  Vorschau und Export).
- In-App-Vorschau nutzt `pdfjs-dist` Canvas-Render
  (`src/components/PdfBlobPreview.tsx`), weil Capacitor-Android-WebView
  blob:-iframe-Sources blockiert.
- Anzeige-Toggles: `CalculationConfig.pdfDisplay` (8 Felder, alle
  default AN). Resolved via `getEffectivePdfDisplay()` in
  `src/utils/calculationConfig.ts`. UI: `PdfLayoutSettings` —
  sichtbar nur im Hausmasta-Modus (`userData.expertMode`).
