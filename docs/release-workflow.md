# Release-Workflow & Versionsgeschichte

Diese Datei ist die verbindliche Anleitung für Menschen, KI-Agenten und Chatbots, wenn an Version, Changelog oder Release-Texten gearbeitet wird.

## Ziel

- Die Versionslinie soll glaubwürdig und ruhig bleiben.
- Der Changelog soll menschlich, freundlich und verständlich klingen.
- `package.json` bleibt die Quelle der Wahrheit für die sichtbare App-Version.
- Android bekommt immer einen höheren `versionCode`, auch wenn die sichtbare Version einmal bewusst neu geordnet wurde.

## Quelle der Wahrheit

Diese Dateien sind wichtig:

- [package.json](/C:/GitHubRepo/eStundnzettl/package.json)
  Sichtbare App-Version für Web/App.
- [android/app/build.gradle](/C:/GitHubRepo/eStundnzettl/android/app/build.gradle)
  Android `versionName` und `versionCode`.
- [src/hooks/constants.js](/C:/GitHubRepo/eStundnzettl/src/hooks/constants.js)
  `APP_VERSION` wird zur Build-Zeit injiziert. Hier nicht händisch Versionsstrings eintragen.
- [src/data/changelog-data.js](/C:/GitHubRepo/eStundnzettl/src/data/changelog-data.js)
  User-Changelog in der App.
- [scripts/sync-version.js](/C:/GitHubRepo/eStundnzettl/scripts/sync-version.js)
  Synchronisiert Android auf die Version aus `package.json` und erhöht den `versionCode`.

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

Jeder neue Release-Eintrag kommt **ganz oben** in [src/data/changelog-data.js](/C:/GitHubRepo/eStundnzettl/src/data/changelog-data.js).

Empfohlene Struktur:

```js
{
  version: "3.1.0",
  date: "31.03.2026",
  title: "Kurzer freundlicher Titel",
  isMajor: false,
  sections: [
    {
      iconName: "Cloud",
      title: "Bereich",
      items: [
        "Kurze, verständliche Aussage.",
        "Noch eine Aussage mit echtem Nutzwert."
      ]
    }
  ]
}
```

## Exakter Release-Ablauf

Wenn ein Agent oder Mensch ein Release vorbereitet, ist die Reihenfolge:

1. Entscheiden, ob `patch`, `minor` oder `major` passt.
2. In [src/data/changelog-data.js](/C:/GitHubRepo/eStundnzettl/src/data/changelog-data.js) **einen** neuen obersten Eintrag schreiben.
3. Nur userrelevante Änderungen aufnehmen.
4. Version erhöhen:
   - `npm version patch`
   - oder `npm version minor`
   - oder `npm version major`
5. Danach `node scripts/sync-version.js` laufen lassen, falls der Hook nicht automatisch lief oder manuell geprüft werden soll.
6. Kontrollieren, dass diese Stellen zusammenpassen:
   - [package.json](/C:/GitHubRepo/eStundnzettl/package.json)
   - [package-lock.json](/C:/GitHubRepo/eStundnzettl/package-lock.json)
   - [android/app/build.gradle](/C:/GitHubRepo/eStundnzettl/android/app/build.gradle)
   - Footer-Anzeige über [src/hooks/constants.js](/C:/GitHubRepo/eStundnzettl/src/hooks/constants.js)
7. `npm run build`
8. Optional Android synchronisieren:
   - `npx cap sync android`
9. Erst dann committen, taggen und releasen.

## Pflichtprüfungen vor einem Release

Vor dem Release muss geprüft werden:

- stimmt die sichtbare Versionsnummer mit dem Changelog überein
- gibt es nur einen Changelog-Eintrag für die neue Version
- ist der Changelog lesbar und nicht technisch
- wurde kein alter Historieneintrag versehentlich doppelt angelegt
- ist `versionCode` in Android weiter gestiegen
- läuft `npm run build`

## Regeln für KI-Agenten

Wenn ein KI-Agent mit Version oder Changelog arbeitet, dann gilt:

- nicht mehrere Versionseinträge für denselben Release erzeugen
- keine Commit-Nachrichten direkt in den Changelog kopieren
- keine internen Release-Metadaten in User-Text übernehmen
- den bestehenden Stil der App beibehalten
- ältere Changelog-Historie nur dann umbauen, wenn der Auftrag ausdrücklich eine Bereinigung verlangt
- bei normalen Releases nur den obersten neuen Eintrag ergänzen

## Kurzfassung für künftige Agenten

- Version kommt aus `package.json`
- Android wird über `scripts/sync-version.js` synchronisiert
- `versionCode` muss immer steigen
- Changelog bleibt lokal in `src/data/changelog-data.js`
- pro Release genau ein neuer Eintrag ganz oben
- userfreundlich schreiben, nicht wie Git
- österreichisch/steirisch freundlich formulieren
