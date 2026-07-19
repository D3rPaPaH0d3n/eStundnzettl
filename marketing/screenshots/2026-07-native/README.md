# Marketing-Assets 2026-07

Dieses Paket basiert ausschließlich auf echten Aufnahmen der nativen Android-App im Emulator `Pixel_10_Pro_XL`. Als Demo-Profil wird `Thomas Berger / Musterbetrieb` verwendet; personenbezogene Echtdaten sind nicht enthalten.

## Play Store

Die acht fertigen Smartphone-Screenshots liegen unter `play-store/de-DE/` und zusätzlich im Fastlane-Pfad `fastlane/metadata/android/de-DE/images/phoneScreenshots/`.

- Format: PNG ohne Alphakanal
- Größe: 1080 × 1920 px
- Seitenverhältnis: 9:16
- Sprache: Deutsch
- Empfohlene Upload-Reihenfolge: alphabetisch nach Dateiname

| Reihenfolge | Datei | Kernaussage | Alternativtext |
| --- | --- | --- | --- |
| 1 | `01_dashboard.png` | Arbeitszeit auf einen Blick | Dashboard mit Monatsstunden, Soll, positivem Saldo und Wochenwerten |
| 2 | `02_neuer_eintrag.png` | In Sekunden eingetragen | Formular für Datum, Arbeitszeit, Pause, Tätigkeit und Projekt |
| 3 | `03_pdf_vorschau.png` | Saubere PDFs auf Knopfdruck | Vorschau eines professionellen monatlichen PDF-Stundenzettels |
| 4 | `04_pdf_versand.png` | Direkt senden oder speichern | Versanddialog zum Teilen per Gmail oder lokalen Speichern des PDFs |
| 5 | `05_taetigkeitscodes.png` | Tätigkeitscodes, die passen | Verwaltung eigener Tätigkeitscodes in den Einstellungen |
| 6 | `06_backup.png` | Deine Daten. Deine Wahl. | Backup-Auswahl für Google Drive, Nextcloud und lokale Sicherung |
| 7 | `07_material_you.png` | Material You. Ganz dein Stil. | Darstellungseinstellungen mit Systemtheme und aktiviertem Material You |
| 8 | `08_onboarding.png` | Servus! Schön, dass du da bist. | Native Willkommensseite mit Offline- und Datenschutzvorteilen |

Die zusätzlich benötigten Listing-Grafiken liegen unter `play-store/listing/`:

- `app_icon_512.png`: 512 × 512 px
- `feature_graphic_1024x500.png`: 1024 × 500 px

Optionale Kurzbeschreibung für den deutschen Store-Eintrag:

> Arbeitszeit erfassen, Saldo prüfen und PDF-Stundenzettel direkt senden.

## Vorstellungshomepage

Unter `homepage/` liegen neun aktuelle, unbeschnittene App-Ansichten sowie das breite Motiv `hero_app_overview.png` in 1600 × 900 px. Die vorhandenen Dateien unter `docs/screenshots/` wurden mit denselben nativen Aufnahmen aktualisiert, damit die Website ohne Änderungen an den Bildpfaden die neue App zeigt.

Die Zuordnung ist:

- `onboarding.png` → native Willkommensseite
- `neuer_eintrag.png` → Eintragsformular
- `dashboard.png` → abgeschlossener Monat mit positivem Saldo
- `dashboard_detail.png` → aufgeklappte Kalenderwoche
- `bericht.png` → PDF-Vorschau
- `backup_setup.png` → Google Drive, Nextcloud und lokale Sicherung
- `arbeitszeitmodell.png` → Wochenmodell mit 38,5 Stunden
- `einstellungen.png` → kompakte Einstellungsübersicht
- `hilfe.png` → verständliche Anleitung in steirisch-freundlichem Ton

## Quellen und Neubau

Die unveränderten Emulator-Aufnahmen liegen unter `raw/de-DE/`. Die Store- und Homepage-Grafiken lassen sich deterministisch mit `scripts/Build-MarketingScreenshots.ps1` neu erstellen.

Auf Windows PowerShell 5 wird die Datei explizit als UTF-8 geladen:

```powershell
$path = Resolve-Path .\marketing\screenshots\2026-07-native\scripts\Build-MarketingScreenshots.ps1
$root = Resolve-Path .\marketing\screenshots\2026-07-native
& ([ScriptBlock]::Create((Get-Content -Raw -Encoding UTF8 $path))) -AssetRoot $root
```

Für englische Store-Texte sollte später ein eigener `en-US`-Satz mit englischer App-Oberfläche aufgenommen werden; die deutschen Bilder sind bewusst nicht nur umbeschriftet.
