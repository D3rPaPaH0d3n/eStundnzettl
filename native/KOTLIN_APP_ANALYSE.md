# Kotlin-App: Bestandsaufnahme und Verbesserungsplan

Stand: 17. Juli 2026

Branch: `claude/kotlin-app-rewrite-kqzifi`

Bewerteter Commit: `da70020`

## Gesamtbewertung

**8 von 10**

Die native Kotlin-Version ist keine halbfertige technische Kopie mehr, sondern
eine ernsthaft nutzbare Android-App. Funktionsumfang, Datenmodell und
Berechnungen sind stark. Die größten offenen Risiken liegen bei Wartbarkeit,
automatisierten UI-Tests und einigen technischen Altlasten.

| Bereich | Bewertung | Einschätzung |
|---|---:|---|
| Funktionsumfang | 9/10 | Sehr vollständig portiert |
| Berechnungen und Datenlogik | 9/10 | Gut getrennt und umfangreich getestet |
| Bedienung und Gestaltung | 8,5/10 | Eigenständig, verständlich und deutlich nativer |
| Datenhaltung und Backups | 8,5/10 | Room, atomarer Restore und mehrere Backup-Ziele |
| Barrierefreiheit | 7/10 | Gute Ansätze, noch nicht systematisch abgesichert |
| Architektur | 6,5/10 | Funktioniert, enthält aber sehr große zentrale Klassen |
| Testabdeckung | 7/10 | Starker Core, schwache Screen- und Ablaufabdeckung |
| Wartbarkeit | 6,5/10 | Große Dateien und eng gekoppeltes ViewModel erhöhen das Risiko |

## Was gut ist

### Fachlicher Kern

- Reines Kotlin-Core-Modul ohne Android- oder Compose-Abhängigkeit
- Berechnungen, Feiertage, Überstunden, Backups und Modelle sind gut getrennt
- Schnelle JVM-Tests und gute Vergleichbarkeit mit der Capacitor-Version
- Beim Analyselauf: 156 Unit-Tests, 0 Fehler, 0 übersprungen

### Datenhaltung und Backups

- Room als lokale Datenbank
- Atomarer vollständiger Restore in einer Transaktion
- Backup-Integritätsprüfung und kompatibles Backupformat
- Lokales Backup, Nextcloud und Google Drive
- Verschlüsselte Ablage des Nextcloud-Passworts
- Import der alten Capacitor-Daten
- Anhänge und Einstellungen werden berücksichtigt
- Vorabprüfung der Google-Play-Dienste

### Oberfläche und Produktidentität

- Eigenständige Gestaltung mit steirischem Charme
- Verständliches Onboarding, Hilfetexte und Touren
- Einfacher Modus und Expertenmodus
- Einheitlichere Dialoge und Overlays
- Übersichtliche Profilkarte und kategorisierte Rückmeldungen
- Nativer Monatspicker und Lazy-Rendering im Dashboard
- Anfänger werden schrittweise an komplexe Funktionen herangeführt

## Was verbessert werden sollte

### 1. MainViewModel verkleinern

`MainViewModel.kt` hat rund 1.768 Zeilen und verwaltet unter anderem Einträge,
Timer, Auto-Checkout, Backups, Anhänge, Einstellungen, Onboarding, Cloud-Dienste,
PDF-Archiv, Updates und UI-Meldungen.

Schrittweise mögliche Aufteilung:

- `EntryService`
- `TimerManager`
- `BackupCoordinator`
- `AttachmentManager`
- `SettingsController`
- `OnboardingCoordinator`

Neue Funktionen sollten nicht mehr ohne Weiteres direkt ins große ViewModel
wandern.

### 2. Große Screen-Dateien zerlegen

Zum Zeitpunkt der Analyse:

- `OnboardingScreen.kt`: ca. 1.815 Zeilen
- `DashboardScreen.kt`: ca. 1.024 Zeilen
- `ReportScreen.kt`: ca. 1.017 Zeilen
- `SettingsScreen.kt`: ca. 993 Zeilen
- `ReportPdfGenerator.kt`: ca. 849 Zeilen

Fachlich eigenständige Bereiche sollten eigene Dateien und kleinere Composables
erhalten.

### 3. UI- und Ablauf-Tests ausbauen

Der Core ist gut getestet. Instrumentierte Nutzerabläufe fehlen dagegen fast
vollständig.

Besonders wichtig:

- Eintrag erstellen, bearbeiten und löschen
- Timer starten und beenden
- Auto-Checkout über Mitternacht
- Backup analysieren und wiederherstellen
- Einstellungen ändern und nach Neustart behalten
- Onboarding vollständig durchlaufen
- Profilkarte öffnen und speichern
- Monat wechseln
- Bericht erzeugen und teilen
- Dialoge und Fehlermeldungen
- Compose-Screenshot-Tests für zentrale Screens

### 4. Strukturierte UI-Meldungen

Der Meldungstyp wird teilweise anhand von Wörtern im Text erkannt. Das ist bei
Übersetzungen und neuen Formulierungen fehleranfällig.

Zielmodell:

```kotlin
UiMessage(
    text = "...",
    tone = UiMessageTone.ERROR,
    duration = UiMessageDuration.LONG,
)
```

Der auslösende Vorgang sollte Erfolg, Warnung, Information oder Fehler explizit
festlegen.

### 5. Fehlerbehandlung verbessern

- Viele `runCatching`- und `catch (_: Exception)`-Stellen erschweren Diagnosen
- Erwartbare Benutzer-, Netzwerk-, Daten-, Authentifizierungs- und
  Programmfehler sollten getrennt behandelt werden
- Ein appweiter Fehlerauffangschirm sollte „Erneut versuchen“ und
  „Diagnose kopieren“ anbieten

### 6. Lifecycle sauber anbinden

UI-State wird teilweise mit `collectAsState()` gelesen. Wo passend sollte
`collectAsStateWithLifecycle()` verwendet werden, damit nicht sichtbare Screens
keine unnötigen Flows sammeln.

### 7. Room-Migrationsstrategie vorbereiten

Die Datenbank steht derzeit auf Version 1. Vor der ersten Schemaänderung sind
notwendig:

- echte Room-Migration
- Schemaexport
- Migrationstest von Version 1 auf Version 2
- Test mit einer kopierten Produktionsdatenbank
- erneute Prüfung des Backupformats

Keine destruktive Migration für Produktivdaten verwenden.

### 8. Nextcloud-Client robuster machen

Der WebDAV-Client verwendet `HttpURLConnection` und teilweise Reflection für
zusätzliche HTTP-Methoden. Ein geeigneter HTTP-Client wie OkHttp wäre langfristig
robuster und leichter testbar.

### 9. Android-Backupregeln festlegen

`android:allowBackup="true"` ist aktiv. Es sollte explizit definiert werden:

- ob die Room-Datenbank automatisch gesichert werden darf
- ob verschlüsselte Preferences ausgeschlossen werden
- ob Anhänge enthalten sind
- wie Android-Systemrestore und App-eigene Backups zusammenspielen

### 10. Barrierefreiheit systematisch prüfen

Vollständiger Testdurchgang mit:

- TalkBack
- 200 Prozent Schriftgröße
- großer Display-Skalierung
- Schalterzugriff
- Hochkontrastprüfung
- Querformat
- kleinerem Android-Gerät

Besonders wichtig sind Onboarding, Berichtseinstellungen, Tour, Kalender und
komplexe Einstellungsfelder.

## Build- und Lint-Stand der Analyse

- 156 Tests
- 0 Fehler
- 0 übersprungen
- Android-Lint ohne Errors
- 53 Warnungen und 5 Hinweise

Die Warnungen bestanden überwiegend aus:

- 27 KTX-Vereinfachungen
- 15 Hinweisen auf neuere Dependencies
- 5 Compose-State-Optimierungen
- 4 API-Hinweisen zur Haptik
- fehlendem monochromen Launcher-Icon
- nicht aktueller Target-SDK-Version
- mehrfach geladenem Kotlin-Plugin in den Modulen

## Priorisierte Checkliste

### Paket 1: Qualität absichern

- [x] Instrumentierte UI-Smoke-Tests für fünf zentrale Nutzerabläufe
- [x] Restore- und Datenbank-Schema-/Migrationsbasistests
- [x] Strukturierte `UiMessage` statt Texterkennung
- [x] `collectAsStateWithLifecycle()` verwenden
- [x] Appweiten Fehlerauffangschirm ergänzen

### Paket 2: Architektur entschärfen

- [ ] Backup- und Cloudlogik aus dem MainViewModel lösen
- [ ] Timer und Auto-Checkout separat kapseln
- [ ] Onboarding in kleinere Screen-Dateien zerlegen
- [ ] PDF-Generator in Layout-, Seiten- und Zeichenkomponenten trennen

### Paket 3: Release-Härtung

- [ ] Android-Backupregeln definieren
- [ ] Room-Migrationsstrategie und Migrationstest vorbereiten
- [ ] TalkBack- und Schriftgrößentest durchführen
- [ ] Target-SDK aktualisieren
- [ ] Monochromes Launcher-Icon ergänzen
- [ ] Release-Build inklusive Minifizierung testen
- [ ] Echtes Update von der Capacitor-Produktion zur Kotlin-Version testen

## Fazit

Die App ist funktional stark, optisch eigenständig und als Beta produktiv
nutzbar. Für eine uneingeschränkte breite Veröffentlichung sollten vor allem
echte Nutzerabläufe automatisiert abgesichert werden. Der Berechnungskern ist
gut getestet; das größere Risiko liegt derzeit bei Screens, Dialogen, Restore-
Abläufen und der wachsenden zentralen Architektur.
