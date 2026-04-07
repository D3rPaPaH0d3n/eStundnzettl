# eStundnzettl - Berechnungslogik (Mathematik)

Dieses Dokument beschreibt die gesamte mathematische Logik hinter der Stundenberechnung in eStundnzettl.

---

## 1. Zeitformat

Alles wird intern in **Minuten** gerechnet.

```
parseTime("08:30") = 8 x 60 + 30 = 510 Minuten
```

---

## 2. Tages-Sollzeit (Target)

**Funktion:** `getTargetMinutesForDate()`

### Standard (38,5h/Woche)

| Tag | Soll (Minuten) | Soll (Stunden) |
|-----|---------------|----------------|
| Mo  | 510           | 8,5h           |
| Di  | 510           | 8,5h           |
| Mi  | 510           | 8,5h           |
| Do  | 510           | 8,5h           |
| Fr  | 270           | 4,5h           |
| Sa  | 0             | 0h             |
| So  | 0             | 0h             |
| **Summe** | **2310** | **38,5h** |

### Halbtage

Am 24.12. und 31.12. gilt:

```
Tagessoll = round(normales Tagessoll / 2)

Beispiel: Montag 24.12. --> round(510 / 2) = 255 min (4h 15m)
```

### Individuelle Arbeitszeitmodelle

Falls ein individuelles Modell definiert ist (`userData.workDays = [So, Mo, Di, Mi, Do, Fr, Sa]`),
wird direkt aus diesem Array gelesen statt der Default-Werte.

---

## 3. Monats-Soll

Es gibt keinen festen Monatswert. Das Monats-Soll wird durch **Aufsummierung aller Tage** berechnet:

```
Monats-Soll = Summe von getTargetMinutesForDate(tag) fuer jeden Tag im Monat
```

### Beispiel: Maerz 2026

22 Arbeitstage: 18x Mo-Do + 4x Freitag

```
18 x 510 + 4 x 270 = 9.180 + 1.080 = 10.260 min = 171h 00m
```

---

## 4. Netto-Arbeitszeit eines Eintrags

**Funktion:** `calculateEntryNetDuration()`

### Arbeit (work)

```
netDuration = Ende - Start - Pause

Beispiel: 16:30 - 08:00 - 30min Pause
  = 990 - 480 - 30
  = 480 min (8h)
```

### Fahrt (code 19)

```
netDuration = Ende - Start       (KEINE Pause abgezogen)

Beispiel: 09:00 - 07:00 = 120 min (2h)
```

### Krank / Urlaub / Zeitausgleich (automatisch)

```
netDuration = Tagessoll

Beispiel: Montag krank = 510 min (8,5h)
```

### Krank / Urlaub / Zeitausgleich (manuell)

```
netDuration = Ende - Start       (KEINE Pause abgezogen)

Beispiel: 12:00 - 08:00 = 240 min (4h)
```

---

## 5. Kranktag-Korrektur (Mischtage)

**Funktion:** `adjustSickDuration()`

Wenn jemand halbtags arbeitet und dann krank geht, wird die Krankzeit nur bis zum Tagessoll aufgefuellt.

### Formel

```
effektive Krankzeit = min(Krankzeit, max(0, Tagessoll - bereits gearbeitete Minuten))
```

### Beispiele (Tagessoll = 510 min)

**4h gearbeitet, 6h krank gemeldet:**
```
min(360, max(0, 510 - 240)) = min(360, 270) = 270 min
--> Nur 4h 30m krank (nicht die vollen 6h)
```

**9h gearbeitet, 2h krank gemeldet:**
```
min(120, max(0, 510 - 540)) = min(120, 0) = 0 min
--> Krank zaehlt nicht (schon ueber Soll gearbeitet)
```

**0h gearbeitet, ganzen Tag krank:**
```
Keine Korrektur noetig, bleibt beim vollen Tagessoll (510 min)
```

Die Korrektur wird einmal zentral via `applyEffectiveDurations()` auf alle Eintraege angewandt,
bevor irgendeine andere Berechnung stattfindet.

---

## 6. Ist-Stunden (totalIst)

```
totalIst = work + vacation + sick + holiday + timeComp
```

**Wichtig:** Fahrzeit (drive, Code 19) zaehlt NICHT zum Ist.
Sie wird separat ausgewiesen.

---

## 7. Normalstunden

Normalstunden sind die Stunden, die weder Mehrarbeit noch Ueberstunden sind:

```
Normalstunden = IST - Mehrarbeit - Ueberstunden
```

So gilt immer:

```
Normal + Mehrarbeit + Ueberstunden = IST
```

### Beispiel Maerz 2026

```
194h IST - 4h30m MA - 20h UeS = 169h 30m Normal
169h30m + 4h30m + 20h = 194h  (stimmt!)
```

---

## 8. Saldo (Ueberstunden / Fehlstunden)

```
totalSaldo = totalIst - totalTarget

Positiv = Ueberstunden
Negativ = Fehlstunden (Minusstunden)
```

---

## 9. Mehrarbeit vs. Ueberstunden (oesterr. Arbeitsrecht)

**Funktion:** `calculateOvertimeSplit()`

Die Aufteilung erfolgt auf **Wochenbasis**:

### Definitionen

- **Mehrarbeit (MA):** Stunden zwischen Vertragssoll (z.B. 38,5h) und 40h/Woche. Kein Zuschlag.
- **Ueberstunden (UeS):** Stunden ueber 40h/Woche. Zuschlagspflichtig.

### Formeln

```
Grenze             = 40h/Woche = 2.400 min
Mehrarbeit-Puffer  = max(0, 2.400 - Wochen-Soll)
Wochen-Saldo       = Wochen-Ist - Wochen-Soll

Mehrarbeit   = min(Wochen-Saldo, Mehrarbeit-Puffer)
Ueberstunden = max(0, Wochen-Saldo - Mehrarbeit)
```

Bei negativem Saldo: Beides = 0 (keine negative Mehrarbeit).

### Beispiel 1: 42h gearbeitet, 38,5h Soll

```
Puffer       = 2.400 - 2.310 = 90 min (1h 30m)
Saldo        = 42h - 38,5h = 3,5h = 210 min

Mehrarbeit   = min(210, 90)  = 90 min  (1h 30m)
Ueberstunden = 210 - 90      = 120 min (2h)
```

### Beispiel 2: 39,5h gearbeitet, 38,5h Soll

```
Saldo        = 60 min (1h)
Mehrarbeit   = min(60, 90) = 60 min (1h)
Ueberstunden = 60 - 60     = 0
```

### Beispiel 3: 37h gearbeitet, 38,5h Soll

```
Saldo = -1,5h --> negativ
Mehrarbeit   = 0
Ueberstunden = 0
```

---

## 10. Donnerstag-Regel (Wochen-Zuordnung zum Monat)

Entscheidet, wie eine Uebergangswoche zwischen zwei Monaten behandelt wird.

### Regel

```
Liegt der Donnerstag der Woche IM aktuellen Monat?

  JA:   Volle Wochenberechnung (Mehrarbeit + Ueberstunden auf 40h-Basis)
  NEIN: Nur taegliche Ueberstunden fuer die Tage dieses Monats
        (Ist > Soll pro Tag = Ueberstunden, KEINE Mehrarbeit)
```

### Beispiel: KW 14 (Mo 30.03. - So 05.04.)

```
Donnerstag = 02.04. --> liegt im APRIL

Fuer Maerz:  Nur Mo 30.03 + Di 31.03 tageweise pruefen
             Falls Tages-Ist > Tages-Soll --> Ueberstunden

Fuer April:  Volle Wochenberechnung (Donnerstag liegt im April)
             inkl. aller 7 Tage fuer MA/UeS-Berechnung
```

---

## 11. Tages-Saldo (fuer Report)

**Funktion:** `buildDayBalanceMetaMap()`

```
Tages-Ist   = Summe netDuration aller Eintraege (exkl. Fahrzeit)
Tages-Saldo = Tages-Ist - Tagessoll
```

Wird nur angezeigt wenn der Tag ein Soll > 0 hat (kein Wochenende).

---

## 12. Zusammenfassung aller Formeln

| Was                  | Formel                                      |
|----------------------|---------------------------------------------|
| Netto Arbeit         | `Ende - Start - Pause`                      |
| Netto Fahrt          | `Ende - Start`                              |
| Krank (auto)         | `Tagessoll`                                 |
| Krank (Mischtag)     | `min(Krankzeit, Tagessoll - Arbeitszeit)`   |
| Monats-Soll          | `Summe Tagessoll aller Tage`                |
| Monats-Ist           | `work + vacation + sick + holiday + timeComp` |
| Saldo                | `Ist - Soll`                                |
| Normalstunden        | `IST - Mehrarbeit - Ueberstunden`           |
| Mehrarbeit           | `min(Wochen-Saldo, 2400 - Wochen-Soll)`    |
| Ueberstunden         | `Wochen-Saldo - Mehrarbeit`                 |

---

## 13. Berechnungsfluss (Gesamtbild)

```
Eintrag erstellen/bearbeiten
    |
    v
calculateEntryNetDuration()      --> netDuration pro Eintrag
    |
    v
applyEffectiveDurations()        --> Kranktag-Korrekturen zentral anwenden
    |
    v
calculatePeriodStats()           --> Monat/Woche aggregieren
    |                               (Ist, Soll, Saldo, Aufschluesselung)
    |
    +---> calculateOvertimeSplit()  --> Mehrarbeit vs. Ueberstunden
    |
    v
Dashboard / Report / PDF         --> Anzeige & Export
```

---

*Stand: April 2026 - eStundnzettl Berechnungslogik v1.0*
