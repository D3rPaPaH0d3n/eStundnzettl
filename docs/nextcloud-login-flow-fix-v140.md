# Nextcloud Login Flow Fix - Version 140

## Problembeobachtung
- Nextcloud Login Flow v2 wurde mit nativer Android-Plugin-Bridge implementiert
- Browser-Login läuft sichtbar erfolgreich bis zur Nextcloud-Seite mit "Dein Client sollte nun verbunden sein! Du kannst dieses Fenster schließen."
- Aber in der App bleibt Nextcloud danach NICHT verbunden
- Browser/Custom Tab schließt sich nicht automatisch

## Bisherige Hypothesen & Fixes

### Version 138
- Geändert: `pending`-Handling im Polling
- Erwartung: Bessere Erkennung von "noch nicht fertig" Zuständen
- Ergebnis: Problem nicht gelöst

### Version 139  
- Geändert: Synchrone Persistenz (Dual-Write localStorage + SQLite)
- Erwartung: Zuverlässigere Speicherung der Credentials
- Ergebnis: Problem nicht gelöst

## Warum das nicht gereicht hat
Die bisherigen Fixes adressierten nur Teilaspekte:
1. **Persistenz**: Credentials werden korrekt gespeichert
2. **Polling-Logik**: Technisch funktioniert das Abfragen

Das eigentliche Problem liegt im **Android/Capacitor Lifecycle**:
- `Browser.open()` auf Android nutzt Custom Tabs
- `Browser.close()` ist auf Android oft nicht zuverlässig
- Keine Lifecycle-Handler für Browser-Beendigung oder App-Fokuswechsel
- Polling läuft weiter, auch wenn App im Hintergrund
- State-Änderungen bleiben lokal in `BackupSettings.jsx` statt zentral im App-State

## Neue Root-Cause-Hypothese
Das Problem ist eine Kombination aus:

1. **Fehlende Browser Lifecycle-Handler**: Kein `Browser.addListener('browserFinished', ...)`
2. **Fehlende App State Change Detection**: Kein `App.addListener('appStateChange', ...)`
3. **State-Isolation**: Nextcloud State wird nur lokal in `BackupSettings.jsx` verwaltet, nicht mit zentralem `useSettings` Hook synchronisiert
4. **Polling ohne Pause**: Polling-Interval läuft weiter, auch wenn App im Hintergrund

## Exakte Dateien/Änderungen für den neuen Fix

### 1. BackupSettings.jsx - Hauptänderungen
- **Browser Lifecycle**: `Browser.addListener('browserFinished', ...)` hinzugefügt
- **App State Change**: `App.addListener('appStateChange', ...)` hinzugefügt  
- **Polling Pause**: Polling pausiert, wenn App im Hintergrund
- **State Synchronisation**: Nextcloud State wird an zentralen `useSettings` Hook übergeben
- **Cleanup**: Bessere Cleanup-Logik bei Komponenten-Unmount

### 2. useSettings.js - State Synchronisation
- **Props Interface**: `BackupSettings` erhält Nextcloud State als Props
- **Zentrale Verwaltung**: Alle Nextcloud-Änderungen gehen durch `useSettings`

### 3. NextcloudClient.js - Keine Änderungen nötig
- Die native Plugin-Bridge funktioniert korrekt

## Technische Implementierung

### Browser Lifecycle Handling
```javascript
// Browser Finished Event
Browser.addListener('browserFinished', () => {
  console.log('Browser wurde geschlossen/beendet');
  // Polling stoppen oder Finalisierung erzwingen
});

// Browser Loaded Event (für Custom Tabs)
Browser.addListener('browserPageLoaded', () => {
  console.log('Browser-Seite geladen');
});
```

### App State Change Detection
```javascript
import { App } from '@capacitor/app';

App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    // App ist wieder im Vordergrund - Finalisierung prüfen
    console.log('App ist aktiv - prüfe Login Status');
  } else {
    // App ist im Hintergrund - Polling pausieren
    console.log('App ist inaktiv - pausiere Polling');
  }
});
```

### Polling mit Pause/Resume
```javascript
let pollInterval = null;
let appIsActive = true;

// Polling starten mit Pause/Resume Logic
const startPolling = () => {
  pollInterval = setInterval(async () => {
    if (!appIsActive) return; // Pausiert wenn App im Hintergrund
    
    // Polling-Logik...
  }, 3000);
};

// App State Change Handler
App.addListener('appStateChange', ({ isActive }) => {
  appIsActive = isActive;
  console.log(`App ${isActive ? 'aktiv' : 'inaktiv'} - Polling ${isActive ? 'resumed' : 'paused'}`);
});
```

### State Synchronisation
```javascript
// BackupSettings.jsx erhält State als Props
const BackupSettings = ({
  nextcloudEnabled,
  nextcloudUrl,
  nextcloudUser,
  nextcloudPass,
  setNextcloudEnabled,
  setNextcloudUrl,
  setNextcloudUser,
  setNextcloudPass,
  // ... andere Props
}) => {
  // Lokaler State nur für UI, persistiert über zentrale Props
};
```

## Testanleitung

### 1. Vorbereitung
- App auf Android-Gerät installieren (Version 139)
- Nextcloud Server mit Login Flow v2 bereitstellen

### 2. Testschritte
1. Einstellungen → Backup → Nextcloud
2. Server-URL eingeben und "Verbinden" tippen
3. Browser/Custom Tab sollte sich öffnen
4. In Nextcloud anmelden und Berechtigung erteilen
5. **WICHTIG**: Nach "Dein Client sollte nun verbunden sein!":
   - Variante A: Custom Tab manuell schließen
   - Variante B: Zur App zurückwechseln (ohne Tab zu schließen)
   - Variante C: App in den Hintergrund bringen und wiederholen

### 3. Erwartetes Verhalten (nach Fix)
- ✅ Browser schließt sich automatisch nach erfolgreichem Login
- ✅ Nextcloud bleibt in der App verbunden (grüner Status)
- ✅ Credentials werden persistent gespeichert
- ✅ App erkennt Rückkehr aus Browser und finalisiert Login
- ✅ Polling pausiert wenn App im Hintergrund

### 4. Fehlerfälle testen
- ❌ Falsche URL → Fehlermeldung
- ❌ Falsche Credentials in Nextcloud → Fehlermeldung  
- ❌ Netzwerk verloren während Login → Timeout mit Fehler
- ❌ App beenden während Polling → Clean Recovery

## Rollback-Hinweis
Falls der Fix Probleme verursacht:

1. **Code-Rollback**: Zur vorherigen Version von `BackupSettings.jsx` zurückkehren
2. **Version-Rollback**: Play Store Internal Testing auf v139 zurücksetzen
3. **Daten-Rollback**: Nextcloud Credentials bleiben in localStorage/SQLite erhalten

**Wichtig**: Der Fix ändert nur die Lifecycle-Logik, nicht die Datenstruktur. Rollback ist sicher.

## Dateiänderungen im Detail

### BackupSettings.jsx
- Zeilen ~50-100: Browser und App Listener hinzugefügt
- Zeilen ~150-200: Polling mit Pause/Resume Logic
- Zeilen ~250-300: State Synchronisation mit useSettings Props
- Zeilen ~350-400: Cleanup bei Unmount verbessert

### useSettings.js
- Zeilen ~200-250: Nextcloud State als Props exportiert
- Keine strukturellen Änderungen, nur API-Erweiterung

## Erfolgskriterien
- [ ] Nextcloud Login bleibt nach Rückkehr aus Browser verbunden
- [ ] Browser schließt sich automatisch nach erfolgreichem Login  
- [ ] App erkennt manuelles Schließen des Browser Tabs
- [ ] Polling pausiert wenn App im Hintergrund
- [ ] State bleibt nach App-Neustart erhalten
- [ ] Keine Memory Leaks durch Listener

## Technische Schulden
- [ ] Unit Tests für neue Lifecycle-Handler
- [ ] E2E Tests für kompletter Login Flow
- [ ] Error Boundary für Polling-Fehler
- [ ] Retry-Logic für flaky Netzwerke

---

**Fix erstellt**: 2026-03-27  
**Version**: 140 (versionCode: 140, versionName: 6.6.0)  
**Verantwortlich**: Codee (Subagent für Nextcloud Lifecycle Fix)