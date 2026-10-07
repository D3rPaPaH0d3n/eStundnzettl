# Release-Workflow & Versionsgeschichte

Diese Datei ist die verbindliche Anleitung für Menschen, KI-Agenten und Chatbots, wenn an Version, Changelog oder Release-Texten gearbeitet wird.

## Ziel

- Die Versionslinie soll glaubwürdig und ruhig bleiben.
- Der Changelog soll menschlich, freundlich und verständlich klingen.
- `native/app/build.gradle.kts` ist die Quelle der Wahrheit für die sichtbare App-Version.
- Android bekommt immer einen höheren `versionCode`, auch wenn die sichtbare Version einmal bewusst neu geordnet wurde.

## Quelle der Wahrheit

Diese Dateien sind wichtig:

- [native/app/build.gradle.kts](../native/app/build.gradle.kts)
  `versionName` (sichtbare App-Version) und `versionCode`. Das ist die einzige Stelle, an der die Version steht — kein Sync-Script, keine zweite Kopie. Die App liest sie zur Laufzeit über `BuildConfig.VERSION_NAME` bzw. `BuildConfig.VERSION_CODE`.
- [native/app/src/main/assets/changelog/changelog.de.json](../native/app/src/main/assets/changelog/changelog.de.json) und [changelog.en.json](../native/app/src/main/assets/changelog/changelog.en.json)
  User-Changelog in der App (Deutsch/Englisch). Daraus entstehen auch die Play-Store- und GitHub-Release-Texte.
- [scripts/render_release_notes.py](../scripts/render_release_notes.py)
  Erzeugt aus dem Changelog die Play-Store-Versionshinweise (`--format play`, max. 500 Zeichen) und die GitHub-Release-Notes (`--format github`).
- `fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt`
  Play-Store-Versionshinweise pro `versionCode` (`de-DE`, `en-US`). Werden beim Deploy aus dem Changelog erzeugt und mitcommittet.
- [.github/workflows/deploy-play-store.yml](../.github/workflows/deploy-play-store.yml)
  Baut, signiert und lädt in den Play Store hoch und setzt dabei den `versionCode`.

Hotfixes für die frühere Capacitor-App 4.5.x laufen im Branch `legacy/capacitor-4.5.x`; dort gilt die eigene Fassung dieser Datei.

## Versionierungsregeln

Wir verwenden ruhige SemVer-Regeln:

- `major` nur bei wirklich großen, sichtbaren Sprüngen
  Beispiele: neue Datenbasis, große Cloud-/Backup-Architektur, massiver Umbau der Kernlogik
- `minor` für neue Features oder spürbare Verbesserungen
  Beispiele: neue Backup-Option, neuer Wizard-Schritt, neue Berichtsfunktion
- `patch` für Bugfixes, Polishing und kleine Korrekturen
  Beispiele: Picker-Fix, Farblogik, Textkorrekturen, kleine Stabilitätsverbesserungen

## Regeln für den Changelog

Der Changelog ist **kein Commit-Log**.

Er darf nicht enthalten:

- `release metadata`
- `skip ci`
- rohe Commit-Nachrichten
- technische Zwischenstände ohne Nutzwert
- doppelte Versionseinträge
- interne Branch-/CI-/Merge-Hinweise

Er soll enthalten:

- genau einen Eintrag pro Release-Version
- 2 bis 4 sinnvolle Bereiche
- kurze, verständliche Aussagen aus Sicht der Nutzerinnen und Nutzer
- österreichisch/steirisch freundlichen Ton

## Sprachstil für den Changelog

Der Stil soll wirken wie:

- menschlich
- freundlich
- bodenständig
- leicht österreichisch/steirisch
- klar statt technisch

Erlaubt:

- ein lockerer, warmer Titel
- kleine Emojis, wenn sie wirklich passen
- Formulierungen wie `läuft runder`, `sauberer`, `gschmeidiger`, `gemütlich`

Nicht erwünscht:

- künstlich-marketinghafte Superlative
- zu viele Emojis
- rohe Technik-Begriffe ohne Einordnung

## Aufbau eines Changelog-Eintrags

Jeder neue Release-Eintrag kommt **ganz oben** in [changelog.de.json](../native/app/src/main/assets/changelog/changelog.de.json) und — mit derselben `version` — ganz oben in [changelog.en.json](../native/app/src/main/assets/changelog/changelog.en.json).

Empfohlene Struktur:

```json
{
  "version": "3.1.0",
  "date": "31.03.2026",
  "title": "Kurzer freundlicher Titel",
  "isMajor": false,
  "playStoreText": "Kurzer freundlicher Titel\n\n• Kurze Aussage mit Nutzwert\n• Noch eine Aussage",
  "sections": [
    {
      "iconName": "Cloud",
      "title": "Bereich",
      "items": [
        "Kurze, verständliche Aussage.",
        "Noch eine Aussage mit echtem Nutzwert."
      ]
    }
  ]
}
```

Hinweise dazu:

- `date` wie in den bestehenden Einträgen: deutsch `TT.MM.JJJJ`, englisch `JJJJ-MM-TT`.
- `playStoreText` ist der kuratierte Text für die Play-Store-Versionshinweise, max. 500 Zeichen (längere Texte kürzt das Script mit `…`). Immer setzen: Fehlt er, nimmt `render_release_notes.py` die vorhandene Fastlane-Datei zum bisherigen lokalen `versionCode` — das kann der Text vom letzten Release sein — und erst zuletzt Titel + Bereichstitel.
- Die erste Zeile des deutschen `playStoreText` landet im Play-Release-Namen (`v<versionName> — <erste Zeile>`, max. 50 Zeichen, sonst `v<versionName> (<versionCode>)`).
- Die GitHub-Release-Notes werden aus `title`, `date` und allen `sections` gebaut.

## Exakter Release-Ablauf

Wenn ein Agent oder Mensch ein Release vorbereitet, ist die Reihenfolge:

1. Entscheiden, ob `patch`, `minor` oder `major` passt.
2. In [changelog.de.json](../native/app/src/main/assets/changelog/changelog.de.json) und [changelog.en.json](../native/app/src/main/assets/changelog/changelog.en.json) jeweils **einen** neuen obersten Eintrag mit derselben `version` und mit `playStoreText` schreiben.
3. Nur userrelevante Änderungen aufnehmen.
4. Version erhöhen:
   - `versionName` in [native/app/build.gradle.kts](../native/app/build.gradle.kts) händisch auf die neue Version setzen
   - oder beim Deploy auf `internal` per `version_bump` (`patch`, `minor`, `major`) hochzählen lassen — bei `beta` wird nie hochgezählt; der Changelog-Eintrag muss in jedem Fall schon die Zielversion tragen
   - nie beides kombinieren: Wer `versionName` händisch erhöht, deployt mit `version_bump` = `none`, sonst wird doppelt hochgezählt
   - `versionCode` muss nicht händisch angehoben werden: Der Deploy-Workflow nimmt max(lokal, höchster `versionCode` in der Play Console) + 1. Händisch nie senken.
5. Kontrollieren, dass diese Stellen zusammenpassen (bei `version_bump` steht in `build.gradle.kts` bis zum Deploy noch die alte Version — dann muss der Changelog-Eintrag der Version entsprechen, die der Bump ergibt):
   - `versionName` in [native/app/build.gradle.kts](../native/app/build.gradle.kts)
   - oberster Eintrag in `changelog.de.json` und `changelog.en.json`
   - Versionsanzeige in den Einstellungen (kommt über `BuildConfig.VERSION_NAME` automatisch aus `build.gradle.kts`)
6. Tests und Build wie in der CI:
   - `python3 -m unittest discover -s scripts/tests -p 'test_*.py'`
   - in `native/`: `./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug`
7. Optional die Play-Store-Hinweise vorab ansehen:
   - `python3 scripts/render_release_notes.py --version <versionName> --language de-DE --format play`
   - dasselbe mit `--language en-US`
   - Die Ausgabe muss genau dem `playStoreText` entsprechen. Erscheint stattdessen Titel + Bereichs-Aufzählung, fehlt `playStoreText` — der Deploy würde dann den Text des vorherigen Releases verwenden (siehe oben).
8. Committen und auf `main` bringen.
9. Erst dann releasen:
   - GitHub Actions → **Deploy to Play Store** ([deploy-play-store.yml](../.github/workflows/deploy-play-store.yml)), Track `internal` oder `beta`. Der Workflow fragt den höchsten `versionCode` in der Play Console ab, nimmt max(lokal, Play) + 1, zählt bei `internal` optional per `version_bump` hoch, schreibt die Versionshinweise nach `fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt`, baut das AAB inkl. Tests, signiert es, lädt es hoch und committet den Bump mit `[skip ci]` zurück auf den Branch. Danach lokal `git pull`.
   - `release_notes_override` nur im Notfall verwenden: Dann geht nur dieser Text (als `de-DE`) an Play, ohne englische Hinweise.
   - Optional danach GitHub Actions → **Release to GitHub** ([release-github.yml](../.github/workflows/release-github.yml)). Kein Versionsbump: Der Workflow nimmt `versionName`/`versionCode` aus `native/app/build.gradle.kts`, legt Tag `v<versionName>` und ein GitHub Release (standardmäßig als Entwurf) mit signierter APK + SHA-256 an und baut die ausführlichen Notes (DE + EN) aus dem Changelog. Existiert der Tag schon, bricht er ab.
10. Nachträglich korrigieren:
    - Name oder Versionshinweise eines bestehenden Play-Releases: Changelog-Eintrag korrigieren, committen und pushen, dann GitHub Actions → **Update Play Store release notes** ([update-play-release-notes.yml](../.github/workflows/update-play-release-notes.yml)) mit Track und optional `version_code`/`version_name` (leer = aktuelle Werte aus `build.gradle.kts`).
    - Store-Einträge (Titel, Beschreibungen, Bilder) laufen getrennt über **Update Play Store Listings** ([update-store-listings.yml](../.github/workflows/update-store-listings.yml)) aus `fastlane/metadata/android/` — ohne Versionen und ohne Versionshinweise.

## Pflichtprüfungen vor einem Release

Vor dem Release muss geprüft werden:

- stimmt die sichtbare Versionsnummer (`versionName`, bzw. bei `version_bump` die Version nach dem Bump) mit dem Changelog überein, in beiden Sprachdateien
- gibt es pro Sprachdatei nur einen Changelog-Eintrag für die neue Version
- ist der Changelog lesbar und nicht technisch
- wurde kein alter Historieneintrag versehentlich doppelt angelegt
- ist `versionCode` in Android weiter gestiegen (beim Deploy automatisch max(lokal, Play Console) + 1)
- passt der `playStoreText` in 500 Zeichen
- laufen `python3 -m unittest discover -s scripts/tests -p 'test_*.py'` und in `native/` `./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug`

## Regeln für KI-Agenten

Wenn ein KI-Agent mit Version oder Changelog arbeitet, dann gilt:

- nicht mehrere Versionseinträge für denselben Release erzeugen
- jeden neuen Eintrag in `changelog.de.json` und `changelog.en.json` mit derselben `version` anlegen
- keine Commit-Nachrichten direkt in den Changelog kopieren
- keine internen Release-Metadaten in User-Text übernehmen
- den bestehenden Stil der App beibehalten
- ältere Changelog-Historie nur dann umbauen, wenn der Auftrag ausdrücklich eine Bereinigung verlangt
- bei normalen Releases nur den obersten neuen Eintrag ergänzen

## Kurzfassung für künftige Agenten

- Version kommt aus `native/app/build.gradle.kts` (`versionName`, `versionCode`) — sonst nirgends
- `versionCode` setzt der Deploy-Workflow auf max(lokal, Play Console) + 1
- `versionCode` muss immer steigen
- Changelog bleibt lokal in `native/app/src/main/assets/changelog/changelog.de.json` + `changelog.en.json`
- Play- und GitHub-Texte entstehen per `scripts/render_release_notes.py` aus dem Changelog (`playStoreText` max. 500 Zeichen)
- pro Release genau ein neuer Eintrag ganz oben (je Sprachdatei)
- userfreundlich schreiben, nicht wie Git
- österreichisch/steirisch freundlich formulieren
