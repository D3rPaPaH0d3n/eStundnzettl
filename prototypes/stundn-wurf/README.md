# Stundn-Wurf Prototyp

Standalone-Prototyp fuer ein eStundnzettl-Mini-Spiel.

Der Ordner ist bewusst nicht in `src/`, Routing, Vite-Config oder Capacitor eingebunden. Dadurch fliesst dieser Test nicht in die App ein, solange er nicht explizit integriert wird.

Lokaler Test:

```bash
python3 -m http.server 18810 --bind 0.0.0.0
```

Danach:

```text
http://192.168.178.73:18810/prototypes/stundn-wurf/
```

Aktueller Spielstand:
- Timing-Start mit Arbeiter (Idle-Atmung, 3-Phasen-Swing-Animation,
  Schlaeger-Trail).
- Stundn-Haufen wird weggeschlagen, Squash & Stretch beim Impact,
  Stink-Wellen im Flug, Tap-Boost in der Luft.
- 1 echte Sekunde Flugzeit zaehlt als 1 Stundn.
- Lokaler Highscore im Browser-Storage.
- Hindernisse:
  - Chef watschelt, droht mit erhobenem Finger bei Annaeherung.
  - WC mit Spuelungs-Animation und Wasserwellen beim Treffer.
  - Fliegendes Toilettenpapier mit Papier-Spur dahinter.
- Booster als Logo-Sterne mit Sparkle und Expanding Ring beim
  Einsammeln.
- Aim-Meter mit sichtbarer Sweet-Spot-Zone.
- Zufallsereignis Wind mit Emojis, Screen-Shake und Label.
- Procedurale Sounds (Web Audio API): Aufladen, Schlag, Treffer,
  Spuelung, Boost, Wind, Game-Over- und Highscore-Jingle.
- Sound an/aus per Button unten links, Mute-State persistiert per
  LocalStorage.
- Erstes Tippen initialisiert den AudioContext (Browser-Vorgabe).

Bewusst noch offen:
- Entry-Point in die Haupt-App (kommt erst, wenn das Spiel rund
  ist).
- Integration in Vite-/Capacitor-Build.
