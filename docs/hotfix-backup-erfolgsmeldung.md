# Hotfix: Backup-Erfolgsmeldung zeigt falschen Status

**Datum:** 2026-03-28
**versionCode:** 142
**versionName:** 6.6.0

## Problembeobachtung

Nach "Jetzt sichern" erscheint **immer** "Backup erstellt!", auch wenn der Nextcloud-Upload
(oder andere Ziele) fehlgeschlagen sind. Die Datei existiert nicht in Nextcloud, aber der
Nutzer bekommt Erfolgsmeldung.

## Root Cause

Zwei Bugs:

### 1. Truthy-Objekt in BackupSettings.jsx
`triggerManualBackup()` gibt ein Objekt zurück (`{ success: false, ... }`).
Die UI prüft aber:
```js
const success = await triggerManualBackup();
if (success) { toast.success("Backup erstellt!"); }
```
Da **jedes Objekt** in JavaScript truthy ist, wird immer Erfolg gemeldet — egal ob `success: false`.

### 2. Stille Fehler in triggerManualBackup()
Alle Backup-Ziele (Google Drive, Lokal, Nextcloud) fangen Fehler mit leeren `catch`-Blöcken ab.
Fehler verschwinden spurlos.

## Betroffene Dateien

| Datei | Funktion |
|---|---|
| `src/components/Settings/BackupSettings.jsx` | `handleManualBackup()` |
| `src/utils/storageBackup.js` | `triggerManualBackup()` |

## Fixes

### BackupSettings.jsx — `handleManualBackup()`
- `result` statt `success` als Variable
- Prüfung auf `result?.success` (Boolean, nicht truthy Objekt)
- Differenzierte Erfolgsmeldung: zeigt an welche Ziele erfolgreich waren
- Separate Fehlermeldung für fehlgeschlagene Ziele
- Beispiel: "Backup erstellt: Lokal, Nextcloud" + "Fehlgeschlagen: Google Drive"

### storageBackup.js — `triggerManualBackup()`
- Dreistufige Status pro Ziel: `null` (nicht aktiv), `true` (erfolgreich), `false` (fehlgeschlagen)
- `console.error()` statt leere catch-Blöcke für alle drei Ziele
- Warnung bei unvollständigen Nextcloud-Credentials
- Return-Objekt enthält immer alle drei Ziel-Status
- `success` = mindestens ein Ziel erfolgreich
- `message` bei Totalausfall: "Alle Backup-Ziele fehlgeschlagen"

## Erfolg prüfen

Nach dem Fix:
1. Nextcloud aktivieren, Backup auslösen → Toast zeigt "Backup erstellt: Nextcloud" oder "Fehlgeschlagen: Nextcloud"
2. Mehrere Ziele aktiv → Toast listet erfolgreiche auf, zweiter Toast für fehlgeschlagene
3. Kein Ziel aktiv → "Kein Backup-Ziel konfiguriert"
4. Alle fehlgeschlagen → "Alle Backup-Ziele fehlgeschlagen"

## Rollback

```bash
git revert HEAD  # Revert des Fix-Commits
git push origin main
```
Oder manuell versionCode auf 141 zurücksetzen und alten Code wiederherstellen.
