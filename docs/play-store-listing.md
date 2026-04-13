# Play Store Listing — eStundnzettl

This document is the **single source of truth** for all Google Play Store
texts. Copy-paste from here into the Play Console (or use the
`fastlane/metadata/android/` layout for automated uploads — see
session P3).

Every field lists the Play Store character limit next to it so you can
verify lengths at a glance. Use `wc -c < path/to/text.txt` to double
check, or in the snippet below each section.

> **Important:** The German (`de-DE`) text below is my best derivation
> from the current `README.de.md` and changelog. It may differ from
> what you already have in Play Console. Before copying to Play
> Console, diff it against your existing listing and reconcile.
> The English (`en-US`) version is brand-new — nothing to reconcile.

---

## Deutsch (de-DE)

### Titel (≤ 30 Zeichen)

```
eStundnzettl – Zeiterfassung
```

*28 Zeichen ✓*

### Kurzbeschreibung (≤ 80 Zeichen)

```
Einfache Zeiterfassung. Stundenzettel automatisch als PDF. Alles am Handy.
```

*74 Zeichen ✓*

### Langbeschreibung (≤ 4000 Zeichen)

```
eStundnzettl – die smarte Zeiterfassung aus der Steiermark.

Schluss mit Zettelwirtschaft! Erfasse deine Arbeitsstunden, Fahrten,
Urlaub und Krankenstand direkt am Handy — und am Monatsende landet ein
sauberer Stundenzettel als PDF auf deinem Gerät. Einfach, übersichtlich,
ohne Schnickschnack.

■ Für wen?
Handwerker, Monteure, Pflegekräfte, Kellner, Büroangestellte, Reinigungs-
kräfte — alle, die eine flexible, ehrliche Stundenerfassung ohne unnötige
Gadgets brauchen.

■ Features auf einen Blick
• Live-Timer: lang drücken, nach oben wischen — Timer läuft.
• Manueller Eintrag mit Start-, Endzeit, Pause und Projekt.
• Echtzeit-Saldo: Überstunden, Mehrarbeit und Gleitzeit immer sichtbar.
• Flexible Arbeitszeitmodelle: 38,5h, 40h, 4-Tage-Woche oder frei.
• Urlaub, Krank, Zeitausgleich — automatisch richtig verrechnet.
• Dokumente anhängen: Regiescheine, Lieferscheine, Fotos direkt zum Eintrag.
• PDF-Export per Monat oder Kalenderwoche, zum Teilen oder Speichern.
• Dark Mode für die Augen am Abend.

■ Stundenberechnung nach deiner Region
Österreich mit 13 Feiertagen, halbem 24./31.12. und AZG-Regeln.
Deutschland mit allen 16 Bundesländern und regionalen Feiertagen.
Schweiz mit allen 26 Kantonen und ArG (45h-Woche).
Oder "Neutral" — komplett ohne automatische Regeln.
Bastler schalten den "Eigenen Plan" ein und stellen jede Regel selbst ein.

■ Backup & Datensicherung
• Google Drive mit täglichem Auto-Backup
• Nextcloud (im Hausmasta-Modus) — volle Datenhoheit
• Lokaler Ordner deiner Wahl
• JSON-Import/Export für manuelle Sicherung
Optional: monatliches PDF-Archiv, das automatisch in dein Backup-Ziel
wandert. Jahre später noch durchsuchbar.

■ Zweisprachig
Volle deutsche und englische Oberfläche — Sprachwechsel jederzeit in
den Einstellungen, beim ersten Start wird die Gerätesprache erkannt.

■ Hausmasta-Modus
Für Profis, die mehr wollen: Nextcloud-Integration, Minuten-genaue
Zeiteingabe, eigene Tätigkeits-Codes, automatisches PDF-Archiv. Einmal
aktivieren, bei Bedarf wieder ausblenden.

■ Datenschutz
• Alle Daten bleiben lokal auf deinem Gerät.
• Keine Werbung. Keine Analytics. Kein Tracking. Kein Account-Zwang.
• Backups nur wenn du sie willst — und dann in deine Cloud, nicht unsere.

■ Gratis. Komplett.
Keine Werbung, kein Abo, kein Premium-Lock. Wenn dir die App wos wert
is, freut sich der Entwickler über ein kleines Dankeschön via Revolut
— ist aber rein optional.

Fragen, Bug-Reports, Lizenzanfragen: project@kainer.co.at

"Damit ka Stund verloren geht!"
```

*2496 Zeichen ✓ (Limit 4000)*

### Release Notes

#### v4.2.0 (≤ 500 Zeichen)

```
English zieht ein 🌐
• Komplette englische Oberfläche — Dashboard, Einstellungen, PDF-Bericht
• Sprachwechsel live in den Einstellungen unter "Sprache"
• Beim ersten Start wird die Gerätesprache automatisch erkannt
• Datum, Kalender und Zeit-Picker folgen der gewählten Sprache
• Changelog und Play-Store-Eintrag zweisprachig
• Für bestehende User ändert sich nix — Deutsch bleibt Standard
```

*Wird per `fastlane/metadata/android/de-DE/changelogs/252.txt`
gespiegelt. Länge wird nach dem Release-Build verifiziert.*

#### v4.1.0 (≤ 500 Zeichen)

```
Berechnungslogik-Baukasten & Schweiz 🧰
• Neuer "Eigener Plan"-Modus: Überstunden, Krank, Feiertage frei konfigurierbar
• Schweiz mit allen 26 Kantonen und ArG-Regeln (45h-Woche)
• Feiertags-Import: Orthodoxe & islamische Feiertage
• Urlaubstage-Tracking mit Anspruch + Resturlaub, auch im PDF-Footer
• Englische UI-Übersetzung: Picker in den Einstellungen (DE/EN)
• 48 neue Unit-Tests — Stabilität wie gewohnt
```

*409 Zeichen ✓*

#### v4.0.0 (≤ 500 Zeichen)

```
Neutraler Kurs — für alle Berufe 🌍
• Stundenberechnung: Neutral, Österreich oder Deutschland (alle 16 Bundesländer)
• Einrichtungs-Wizard mit individuellen Tages-Slidern statt fixer Presets
• Neuer Schritt: Tätigkeits-Codes gleich beim Start wählen
• Demo-Daten und Beispiel-Projekte neutraler formuliert
• Kleinere UI-Politur und Bugfixes
```

*339 Zeichen ✓*

---

## English (en-US)

### Title (≤ 30 characters)

```
eStundnzettl – Time tracker
```

*27 characters ✓*

### Short description (≤ 80 characters)

```
Simple time tracking. Monthly timesheet as PDF. Everything on your phone.
```

*73 characters ✓*

### Full description (≤ 4000 characters)

```
eStundnzettl – smart time tracking from Styria, Austria.

No more paper slips! Log your work hours, drives, vacation and sick days
straight from your phone — and at the end of the month a clean timesheet
lands on your device as a PDF. Simple, clear, no fuss.

■ Who is it for?
Tradespeople, technicians, nurses, waiters, office workers, cleaners —
anyone who needs flexible, honest time tracking without unnecessary
gadgets.

■ Features at a glance
• Live timer: long-press, swipe up — timer running.
• Manual entry with start time, end time, break and project.
• Real-time balance: overtime, extra hours and flex-time always visible.
• Flexible work schedules: 38.5h, 40h, 4-day week or fully custom.
• Vacation, sick leave, time off — calculated automatically.
• Attach documents: delivery notes, receipts, photos straight on entries.
• PDF export per month or calendar week, ready to share or save.
• Dark mode for the eyes at night.

■ Hours calculation for your region
Austria with 13 public holidays, half-day Dec 24/31 and AZG rules.
Germany with all 16 federal states and regional holidays.
Switzerland with all 26 cantons and ArG (45h week).
Or "Neutral" — no automatic rules at all.
Tinkerers toggle the "Custom plan" and configure every rule themselves.

■ Backup & data safety
• Google Drive with daily auto-backup
• Nextcloud (in power-user mode) — full data sovereignty
• A local folder of your choice
• JSON import/export for manual backups
Optional: a monthly PDF archive that automatically ends up in your
backup target. Still searchable years later.

■ Bilingual
Full German and English UI — switch any time in settings, device
language auto-detected on first launch.

■ Power-user mode
For pros who want more: Nextcloud integration, minute-precise time
entry, custom activity codes, automatic PDF archive. Enable once, hide
again when you're done.

■ Privacy
• All data stays local on your device.
• No ads. No analytics. No tracking. No account required.
• Backups only when you want them — and then to your cloud, not ours.

■ Free. Completely.
No ads, no subscription, no premium lock. If you find the app useful,
the developer happily accepts a small thank-you via Revolut — but it's
purely optional.

Questions, bug reports, licensing: project@kainer.co.at

"So that no hour gets lost!"
```

*2310 characters ✓ (limit 4000)*

### Release notes

#### v4.2.0 (≤ 500 characters)

```
English support arrives 🌐
• Full English UI — dashboard, settings, PDF report
• Switch live in Settings → Language
• First launch auto-detects your device language
• Date, calendar and time picker follow the chosen language
• Changelog and Play Store listing available in both languages
• Nothing changes for existing users — German stays the default
```

*Mirrored in `fastlane/metadata/android/en-US/changelogs/252.txt`.
Length verified after the release build.*

#### v4.1.0 (≤ 500 characters)

```
Calculation logic toolkit & Switzerland 🧰
• New "Custom plan" mode: overtime, sick rules, holidays freely configurable
• Switzerland with all 26 cantons and ArG rules (45h week)
• Holiday import: Orthodox & Islamic holidays
• Vacation day tracking with allowance + remaining, also in the PDF footer
• English UI translation: picker in settings (DE/EN)
• 48 new unit tests — stability as usual
```

*392 characters ✓*

#### v4.0.0 (≤ 500 characters)

```
Neutral course — for every profession 🌍
• Hours calculation: Neutral, Austria or Germany (all 16 states)
• Setup wizard with per-day sliders instead of fixed presets
• New step: pick activity codes right at setup
• Demo data and example projects phrased more neutrally
• Small UI polish and bug fixes
```

*300 characters ✓*

---

## Character-count cross-check

Run this in the repo root to verify every text still fits its Play
Store limit after edits:

```bash
# DE
echo -n "Titel (≤30)        : "; echo -n "eStundnzettl – Zeiterfassung" | wc -c
echo -n "Kurzbeschr. (≤80)  : "; echo -n "Einfache Zeiterfassung. Stundenzettel automatisch als PDF. Alles am Handy." | wc -c
```

For the long blocks just extract them into a temp file and run
`wc -c < /tmp/long.txt`. The Fastlane files in session P3 will be
suitable for this out of the box.

---

## Usage checklist

Copy-paste into Play Console (Grow → Store presence → Main store
listing → Manage translations):

- [ ] **German (default)** — update with the reconciled Deutsch
      section above
- [ ] **English (United States)** — new translation, add from
      English section above
- [ ] Release notes per version in Release → Production → (release) →
      "What's new"

Screenshots are **not** covered here — they need device captures with
the app set to the respective language. Feature graphic and icon
stay the same across languages unless they contain text.
