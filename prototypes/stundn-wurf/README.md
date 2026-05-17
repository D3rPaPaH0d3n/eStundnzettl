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
- Timing-Start mit Arbeiter und Schlaeger.
- Ein Haufen wird weggeschlagen und per Tap in der Luft gehalten.
- 1 echte Sekunde Flugzeit zaehlt als 1 Minute.
- Lokaler Highscore im Browser-Storage.
- Hindernisse: Chef, WC, fliegendes Toilettenpapier.
- Zufallsereignis: Windstoss.
