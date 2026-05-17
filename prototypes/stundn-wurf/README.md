# Stundn-Wurf Prototyp

Standalone-Prototyp fuer ein eStundnzettl-Mini-Spiel im Stil von
Yeti Sports. Setting: ein WC-Raum mit hellen Fliesen.

Der Ordner ist bewusst nicht in `src/`, Routing, Vite-Config oder
Capacitor eingebunden, damit dieser Test nicht in die App fliesst,
solange er nicht explizit integriert wird.

Lokaler Test:

```bash
python3 -m http.server 18810 --bind 0.0.0.0
```

Danach:

```text
http://192.168.178.73:18810/prototypes/stundn-wurf/
```

Spielablauf:

1. Tap 1 - Arbeiter wirft den Stundn-Haufen senkrecht hoch.
2. Tap 2 - Wenn der Haufen wieder runterkommt, im richtigen Moment
   tippen. Die Bohrmaschine schiesst zu, das Timing bestimmt
   Geschwindigkeit und Hoehe.
3. Im Flug - jeder weitere Tap gibt einen Boost-Schub, aber jeder
   Boost wird kleiner. Geschwindigkeit nimmt zusaetzlich
   kontinuierlich ab. Ziel: durch gutes Timing so weit wie moeglich
   kommen.

Hindernisse:

- Klopapier-Rolle: sofortiges Game Over - "Runtergespuelt!"
- Schwamm: Bremse, kein Game Over.
- Seife: zusaetzlicher Boost.
- Wassertropfen: Knock-back, leichte Bremse.

Hintergrund:

- WC-Schuessel hinter dem Arbeiter.
- Waschbecken und Klorollenhalter an der Wand.
- Chef steht im hinteren Bereich und klopft zufaellige Sprueche
  ("Wieder Pause?", "Stundnliste leer!"). Er ist nur Atmosphaere,
  blockiert den Flug nicht.

Sound:

- Procedurale Web-Audio-Effekte: Wurf, Bohrmaschinen-Rrrrr mit
  Timing-abhaengigem Wumms, Klopapier-Spuelung, Schwamm-Bremse,
  Seifen-Boost, Wassertropfen, Chef-Spruch sowie Game-Over- und
  Highscore-Jingle.
- Sound an/aus per Button unten links, Mute-State persistiert per
  LocalStorage.
- Erstes Tippen initialisiert den AudioContext (Browser-Vorgabe).

Bewusst noch offen:

- Entry-Point in die Haupt-App (kommt erst, wenn das Spiel rund ist).
- Integration in Vite-/Capacitor-Build.
