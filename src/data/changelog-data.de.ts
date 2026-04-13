export const CHANGELOG_DATA_DE = [

  {
    version: "4.1.0",
    date: "12.04.2026",
    title: "Berechnungslogik-Baukasten & Schweiz 🧰",
    isMajor: true,
    sections: [
      {
        iconName: "Calculator",
        title: "Eigener Plan — Rechenregeln selbst bestimmen",
        items: [
          "Neue vierte Option beim ersten Start: \"Eigener Plan\". Damit baust du dir deine Zeitberechnung komplett selbst zusammen — Überstunden-Modus, Krank-Regeln, Feiertage, Halbtage, alles individuell einstellbar.",
          "Wer Österreich, Deutschland oder Schweiz wählt, bekommt die Regeln wie bisher automatisch und überspringt den Baukasten komplett. Kein Extra-Aufwand für Standard-User.",
          "Neue Überstunden-Modi: \"Keine Unterscheidung\" (nur Saldo), \"Mehrarbeit & Überstunden trennen\" (mit frei wählbarer Schwelle) oder \"Alles ist Überstunden\".",
          "Krank am Arbeitstag: Drei Modi — \"Füllt bis Tagessoll auf\" (AT/DE), \"Zählt zusätzlich\" oder \"Wird ignoriert\".",
          "Feiertag + Arbeit am selben Tag: Drei Modi — \"Zählt zusätzlich\", \"Zählt als Überstunde\" oder \"Füllt nur bis Tagessoll auf\"."
        ]
      },
      {
        iconName: "Globe",
        title: "Schweiz: 26 Kantone mit Feiertagen",
        items: [
          "Die Schweiz ist jetzt als vollwertige Locale verfügbar — mit allen 26 Kantonen und ihren individuellen Feiertagen (katholisch/reformiert, Genfer Jeûne genevois, Glarus Näfelser Fahrt, Berchtoldstag und mehr).",
          "ArG-Arbeitsregeln: Überstunden ab 45h/Woche, Halbtage am 24. und 31.12., Krank-Cap auf Tagessoll.",
          "Kantons-Picker im Onboarding und in den Einstellungen — gleiche UX wie der deutsche Bundesland-Picker."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Feiertags-Import: Orthodox & Islamisch",
        items: [
          "Im \"Eigener Plan\"-Baukasten kannst du jetzt neben AT/DE/CH auch orthodoxe Feiertage (mit korrektem julianischen Oster-Kalender) und islamische Feiertage (Ramadan, Eid al-Fitr, Eid al-Adha und mehr) importieren.",
          "Islamische Daten sind für 2024–2035 hinterlegt, darüber hinaus astronomisch approximiert (±1–2 Tage Disclaimer)."
        ]
      },
      {
        iconName: "Palmtree",
        title: "Urlaubstage-Tracking",
        items: [
          "Urlaubsanspruch wird jetzt automatisch ans Land angepasst: AT = 25 Tage, DE = 20 Tage, CH = 20 Tage.",
          "Neues Feld \"Resturlaub / Übertrag\" für Tage vom Vorjahr oder bereits verbrauchte Tage bei Ersteinrichtung.",
          "Der PDF-Report zeigt jetzt eine Urlaubstage-Bilanz im Footer: Anspruch, Übertrag, Genommen und Verbleibend — in Grün wenn positiv, Rot wenn aufgebraucht."
        ]
      },
      {
        iconName: "Sliders",
        title: "Settings & UI-Verbesserungen",
        items: [
          "Neuer Settings-Bereich \"Berechnung\" — sichtbar für alle User, einklappbar. Dort lassen sich Überstunden-Regel, Krank-Modus, Feiertage, Halbtage, Auto-Pausen und Urlaubsanspruch nachträglich ändern.",
          "Pausen-Eingabe: Der 30-Min-Button öffnet jetzt einen echten Time-Picker (gleiche Optik wie Start/Ende) mit 15-Minuten-Schritten oder minutengenau im Hausmasta-Modus.",
          "Feiertage und Halbtage werden in der UI jetzt im deutschen Format DD.MM. angezeigt (intern bleibt MM-DD).",
          "\"Normalstunden\" aus dem PDF entfernt — war redundant zu IST minus MA/ÜS.",
          "Locale-Wechsel in den Settings fragt jetzt per Dialog, ob die Berechnungsregeln zurückgesetzt werden sollen."
        ]
      },
      {
        iconName: "Shield",
        title: "Stabilität & Abwärtskompatibilität",
        items: [
          "Bestehende User bekommen bei der Migration eine CalculationConfig, die exakt dem bisherigen Locale-Verhalten entspricht — keine einzige Zahl ändert sich im Dashboard.",
          "Backup/Restore enthält jetzt die CalculationConfig. Ältere Backups ohne Config werden beim Import automatisch aus dem Locale abgeleitet.",
          "Automatisches PDF-Archiv nutzt jetzt ebenfalls die User-Rechenregeln statt AT-Fallback.",
          "Demo-Modus setzt jetzt AT-Locale und CalculationConfig mit 25 Urlaubstagen + 3 Resttagen.",
          "48 neue Unit-Tests (insgesamt 630), alle bestehenden Tests unverändert grün."
        ]
      }
    ]
  },

  {
    version: "4.0.1",
    date: "11.04.2026",
    title: "Nextcloud Login Fix",
    sections: [
      {
        iconName: "Bug",
        title: "Bugfix",
        items: [
          "Nextcloud Login URL Key Mismatch behoben (url → serverUrl)."
        ]
      }
    ]
  },

  {
    version: "4.0.0",
    date: "10.04.2026",
    title: "Neutraler Kurs — für alle Berufe 🌍",
    isMajor: true,
    sections: [
      {
        iconName: "Globe",
        title: "Stundenberechnung: Neutral, Österreich oder Deutschland",
        items: [
          "eStundnzettl ist jetzt nicht mehr nur für Österreich! Beim ersten Start wählst du einmal, welche Regeln deine App verwenden soll: Neutral (keine automatischen Feiertage, keine Halbtage, kein Mehrarbeit/Überstunden-Split), Österreich (wie bisher, mit gesetzlichen Feiertagen, 24./31.12. halbiert und Mehrarbeit/Überstunden nach AZG) oder Deutschland mit allen 16 Bundesländern inklusive regionaler Feiertage.",
          "Bestehende User bekommen beim ersten Start nach dem Update ein einmaliges Popup und können Österreich mit einem Klick wie bisher beibehalten — deine Einträge bleiben unverändert.",
          "Wechseln geht später jederzeit im Hausmasta-Modus unter \"Stundenberechnung\". Zukünftige Berechnungen folgen der neuen Auswahl, vergangene Einträge bleiben."
        ]
      },
      {
        iconName: "Sliders",
        title: "Benutzerdefinierte Stunden stehen jetzt vorne",
        items: [
          "Im Einrichtungs-Assistenten sind die Tages-Slider ab sofort der aktive Modus — du stellst deine Stunden direkt selbst ein. Die Vorbelegung kommt automatisch aus deiner gewählten Region (38,5h für Österreich, 40h für Deutschland, 40h für Neutral).",
          "Die klassischen Presets (38,5h, 40h, 4-Tage-Woche …) findest du jetzt unterhalb der Slider — ein Klick übernimmt sie, wenn du willst.",
          "Wochentage werden endlich in der richtigen Reihenfolge angezeigt: Montag bis Sonntag, nicht mehr Sonntag bis Samstag."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Neuer Schritt: Tätigkeits-Codes im Wizard",
        items: [
          "Neue User können jetzt schon beim ersten Einrichten entscheiden, mit welchen Tätigkeits-Codes sie starten wollen: \"Allgemein\" (5 neutrale Basis-Codes, vorausgewählt), \"Keine Codes\" (du legst selbst an) oder ein Branchen-Preset wie der Kogler-Aufzugsbau-Katalog unter \"Erweiterte Presets\".",
          "Bestehende User behalten ihre gewohnten Codes — keine Änderung."
        ]
      },
      {
        iconName: "FileText",
        title: "Kleine Politur",
        items: [
          "Der Spruch unterm App-Namen heißt jetzt stolz \"Damit ka Stund verlorn geht\" statt \"Mobile Zeiterfassung\".",
          "Demo-Daten und Beispiel-Projekte sind neutraler formuliert, damit sich auch Kellner, Pfleger, Monteure & Co. wiederfinden.",
          "Interne Aufräumarbeiten: Feiertagsliste wird nicht mehr doppelt gepflegt, sondern kommt aus einer zentralen Stelle pro Region."
        ]
      }
    ]
  },

  {
    version: "3.6.0",
    date: "09.04.2026",
    title: "Hausmasta-Modus & schlankere Settings 🔧",
    isMajor: true,
    sections: [
      {
        iconName: "Wrench",
        title: "Hausmasta-Modus — für Profis, die mehr wollen",
        items: [
          "Die Einstellungen sind jetzt aufgeräumt und übersichtlich: Nur das Wichtigste ist sichtbar. Wer Nextcloud, Import/Export, PDF-Archiv, Minutenmodus, Tätigkeitscodes oder den Nur-Aufzeichnung-Modus braucht, aktiviert einfach den neuen Hausmasta-Modus ganz unten in den Einstellungen.",
          "Der Hausmasta-Modus ist rein kosmetisch — er blendet nur zusätzliche Einstellungen ein, ohne bestehende Funktionen zu verändern. Einmal eingerichtet läuft alles wie gewohnt weiter."
        ]
      },
      {
        iconName: "Layout",
        title: "Einstellungen neu organisiert",
        items: [
          "Die Backup & Export-Karte hat jetzt einen einheitlichen Header im selben Stil wie die PDF-Archiv-Karte.",
          "Der \"Nur Aufzeichnung\"-Toggle ist von den Benutzerdaten in die Arbeitszeitmodell-Karte gewandert — dort gehört er logisch hin. Wenn er aktiv ist, wird die Modellauswahl automatisch ausgeblendet.",
          "Kein Überscrolling mehr am Ende der Einstellungen-Seite."
        ]
      },
      {
        iconName: "Bug",
        title: "Bugfixes",
        items: [
          "PDF-Archiv: Feiertage werden jetzt korrekt in die Soll-Berechnung einbezogen. Bisher wurde das Soll für Feiertage voll berechnet, ohne dass sie als Ist-Stunden gezählt wurden — der Saldo im PDF war dadurch zu negativ.",
          "Google Drive: Die verbundene E-Mail-Adresse wird nach einem App-Neustart jetzt dauerhaft angezeigt, statt nur \"Google Drive App-Daten\".",
          "Backup-Import: Importierte Daten erscheinen jetzt sofort in der App, ohne dass ein Neustart nötig ist."
        ]
      },
      {
        iconName: "BookOpen",
        title: "Neue Anleitung & Hilfe",
        items: [
          "Die Hilfe wurde komplett überarbeitet und an alle aktuellen Features angepasst: Live-Timer, Dokumente anhängen, Backup-Optionen und der Hausmasta-Modus sind jetzt erklärt.",
          "Neue README auf GitHub mit Screenshots und Play Store Link."
        ]
      }
    ]
  },

  {
    version: "3.5.0",
    date: "07.04.2026",
    title: "Nur Aufzeichnung & bessere Monatsübergänge",
    sections: [
      {
        iconName: "Sliders",
        title: "Neues Arbeitszeitmodell: Nur Aufzeichnung",
        items: [
          "Du kannst die App jetzt auch als reines Zeiterfassungs-Tool nutzen — ohne Soll/Ist-Berechnung, ohne Überstunden, ohne Mehrarbeit. Einfach nur aufschreiben, wann du gearbeitet hast.",
          "Die Option findest du sowohl im Einrichtungs-Assistenten als auch nachträglich in den Einstellungen unter deinem Profil. Ein Schalter genügt — alles andere blendet sich automatisch aus."
        ]
      },
      {
        iconName: "Bug",
        title: "Korrektur: MA/ÜS bei Monatsübergängen",
        items: [
          "Bei Wochen, die über einen Monatswechsel hinausgehen (z.B. KW 14 mit Mo–Di im März und Mi–Fr im April), wurde bisher die Mehrarbeit (MA) falsch berechnet. Die App hat die Plus-Stunden der Randtage gegen das tägliche Soll verglichen und daraus direkt MA abgeleitet — obwohl du mit nur 2–3 Tagen gar nicht über die 38,5h-Wochengrenze kommen kannst.",
          "Jetzt gilt: Mehrarbeit entsteht erst, wenn das IST der sichtbaren Tage das volle Wochen-Soll (z.B. 38,5h) übersteigt. Solange du darunter bleibst, werden nur die täglichen Überstunden (IST > Tages-Soll) gezählt — ohne MA. Das gilt symmetrisch für Monatsanfang und Monatsende."
        ]
      }
    ]
  },

  {
    version: "3.4.0",
    date: "05.04.2026",
    title: "Freundlicher Start & sauberer Stundenzettel 🎉",
    isMajor: true,
    sections: [
      {
        iconName: "Sparkles",
        title: "Neuer Willkommensflow & interaktive App-Tour",
        items: [
          "Der Einrichtungs-Assistent wurde von Grund auf überarbeitet — freundlicher im Ton, klarer in den Erklärungen. Du siehst jetzt gleich auf der ersten Seite, wofür eStundnzettl steht: alles am Handy, offline nutzbar, deine Daten bleiben bei dir. Jeder Schritt erklärt kurz und ehrlich, was passiert und warum.",
          "Der Backup-Schritt ist jetzt transparent als komplett optional ausgezeichnet. Und du erfährst dort auch gleich den netten Nebeneffekt: sobald du ein Backup aktivierst, legt die App dir jeden Monat automatisch einen fertigen PDF-Stundenzettel dazu.",
          "Frisch nach dem Setup bekommst du eine kurze interaktive App-Tour, die dir in 7 Schritten zeigt, wo was sitzt: Dashboard, Live-Timer (inkl. Lang-Drücken + nach oben wischen), manueller Eintrag, Bericht und Einstellungen. Kleine pulsierende Marker weisen exakt auf die echten Buttons."
        ]
      },
      {
        iconName: "FileText",
        title: "Automatisches PDF sieht jetzt wie dein geteilter Bericht aus",
        items: [
          "Das automatisch archivierte Monats-PDF hatte bisher ein schlichtes, tabellarisches Layout — ganz anders als der schöne Stundenzettel, den du aus dem Bericht teilen kannst. Ab jetzt verwenden beide Pfade exakt dieselbe Vorlage: Firma, Foto, Zebra-Streifen, Zusammenfassungs-Box. Dein Archiv-PDF zeigt also 1:1 dasselbe Design wie der geteilte Bericht.",
          "Als Nebeneffekt wird die App-Installation auch spürbar kleiner — wir konnten eine große interne PDF-Bibliothek ersatzlos streichen."
        ]
      },
      {
        iconName: "Bug",
        title: "Korrektur: Mehrarbeit an Monatsübergängen",
        items: [
          "Bei Wochen, die über einen Monatswechsel hinausgehen (z.B. KW 14 mit Montag noch im März und Mittwoch schon im April), konnte die App zu viel Mehrarbeit anzeigen — sowohl im Dashboard als auch im PDF. Der Fehler lag darin, dass die Woche am Monatsrand abgeschnitten wurde und Plus-Stunden aus der Monats-Hälfte gegen ein halbiertes Soll verglichen wurden.",
          "Mehrarbeit und Überstunden werden jetzt immer über die volle Woche (Mo–So) berechnet. Zur Zuordnung gilt die ISO-Regel: Eine Woche zählt zu dem Monat, in dem ihr Donnerstag liegt. Damit wird jede Woche genau einmal korrekt gezählt — kein Doppelzählen, keine Lücken."
        ]
      }
    ]
  },

  {
    version: "3.3.0",
    date: "05.04.2026",
    title: "Dein Monats-PDF landet von selbst im Archiv 📁",
    sections: [
      {
        iconName: "FileText",
        title: "Automatisches PDF-Archiv",
        items: [
          "Die App legt dir ab jetzt jeden Monat automatisch ein sauberes PDF deines Stundenzettels an — einmal pro Tag, ganz ohne dein Zutun. So hast du auch Jahre später einen ordentlichen, durchsuchbaren Monatsbericht parat, selbst wenn die App dann gar nicht mehr installiert sein sollte.",
          "In den Einstellungen kannst du aussuchen, wohin das Archiv gehen soll: lokal auf dein Gerät in den Dokumente-Ordner, in deine Nextcloud oder zu Google Drive in einen eigenen Ordner \"eStundnzettl Archiv\". Jedes Ziel lässt sich einzeln ein- und ausschalten, und mit \"Jetzt ausführen\" kannst du jederzeit selbst einen Lauf starten.",
          "Beim Monatswechsel wird der alte Monat als finaler Bericht stehengelassen und ein neuer begonnen. Und solange sich an deinen Einträgen nichts geändert hat, passiert auch nichts — kein unnötiger Upload, kein zusätzlicher Datenverbrauch."
        ]
      },
      {
        iconName: "ShieldCheck",
        title: "Drive-Verbindung gschmeidiger",
        items: [
          "Die Google-Drive-Verbindung vom bestehenden JSON-Backup und vom neuen PDF-Archiv laufen jetzt sauber nebeneinander. Die gelbe Warnung \"Drive-Verbindung prüfen\", die bei manchen nach dem Verbinden des PDF-Archivs kurz auftauchen konnte, ist damit auch weg."
        ]
      }
    ]
  },

  {
    version: "3.2.1",
    date: "05.04.2026",
    title: "Flexiblere Sonderzeiten ⏱️",
    sections: [
      {
        iconName: "Clock",
        title: "Krank · Urlaub · Zeitausgleich",
        items: [
          "Bei Krank-, Urlaubs- und ZA-Einträgen gibt es jetzt unter dem Info-Hinweis einen Umschalter zwischen \"Automatisch\" und \"Manuell\". Automatisch bleibt der Standard — die tägliche Sollzeit aus deinem Arbeitsmodell wird wie gewohnt gutgeschrieben. Im Manuell-Modus kannst du Start- und Endzeit wie bei einem normalen Eintrag eintragen, wenn du z.B. nur einen halben Tag krank warst oder unterschiedliche Stunden brauchst.",
          "Die automatische Sollzeit-Berechnung bleibt unangetastet — wer nichts ändert, bekommt exakt das gewohnte Verhalten."
        ]
      }
    ]
  },

  {
    version: "3.2.0",
    date: "05.04.2026",
    title: "Struktur & Vertrauen 🧱",
    isMajor: true,
    sections: [
      {
        iconName: "Database",
        title: "Datenbank",
        items: [
          "Neues Migrations-Framework: Schema-Änderungen laufen jetzt über eine eigene Versionstabelle und können Schritt für Schritt aufeinander aufbauen. Zukünftige Updates können deine Datenbank sauber und ohne Datenverlust mit neuen Feldern erweitern."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Qualität & Stabilität",
        items: [
          "Die beiden größten internen Bausteine (Aktions-Zentrale und Einrichtungs-Assistent) wurden in kleinere, fokussierte Module zerlegt. Für dich unsichtbar, aber die App wird damit robuster und zukünftige Änderungen lassen sich gezielter testen.",
          "Beim vollständigen Zurücksetzen der App wird vorher automatisch ein Sicherheits-Backup ins Cache-Verzeichnis geschrieben — für den Fall, dass du es dir in letzter Sekunde anders überlegst.",
          "Import-Dateien werden jetzt gegen ein strenges Schema geprüft (Zod). Ungültige Einträge werden gezielt übersprungen statt den ganzen Import scheitern zu lassen, und du bekommst klare Rückmeldung, wie viele übersprungen wurden."
        ]
      },
      {
        iconName: "TestTube",
        title: "Tests",
        items: [
          "Die Test-Suite ist von 38 auf 158 Tests gewachsen. Alle Datenbank-Repositories (Einträge, Einstellungen, Arbeitscodes, Anhänge, Backup-Metadaten) und alle neuen Aktions-Hooks werden jetzt automatisiert getestet.",
          "Test-Abdeckung auf den getesteten Bereichen: Repositories 100 %, Schemas 100 %, Aktions-Hooks 76 %. Kritische Logik-Regressionen werden so vor dem Release im CI abgefangen."
        ]
      }
    ]
  },

  {
    version: "3.1.1",
    date: "04.04.2026",
    title: "Härtung & Politur 🛡️",
    isMajor: true,
    sections: [
      {
        iconName: "ShieldCheck",
        title: "Sicherheit",
        items: [
          "Dein Nextcloud-App-Passwort wird jetzt echt verschlüsselt (AES-GCM über die Web-Crypto-Schnittstelle). Alte, nur base64-kodierte Passwörter werden beim ersten Start automatisch und transparent in das neue Format überführt.",
          "Backups bekommen jetzt eine Prüfsumme (SHA-256). Wird ein importiertes Backup manipuliert, warnt dich die App sofort.",
          "Alle bekannten Abhängigkeits-Sicherheitslücken wurden geschlossen (npm audit ist wieder sauber)."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Qualität & Stabilität",
        items: [
          "Erste Unit-Test-Suite eingezogen (38 Tests für Zeitberechnungen, Backup-Integrität und Verschlüsselung). Jeder zukünftige Release läuft nur dann durch den Play-Store-Workflow, wenn die Tests grün sind.",
          "Neue zentrale Logging-Fassade — Debug-Ausgaben landen in Dev-Builds sauber im Log und sind in Release-Builds automatisch stumm."
        ]
      },
      {
        iconName: "Accessibility",
        title: "Bedienbarkeit",
        items: [
          "Alle wichtigen Icon-Buttons (Monatsnavigation, Timer-FAB, Kopfzeile, Drawer) haben jetzt ordentliche Bezeichnungen für Screenreader.",
          "Beim Öffnen von Einstellungen, Eintragsformular oder Einrichtungs-Assistent zeigt die App jetzt einen sauberen Lade-Skeleton statt einer leeren Fläche."
        ]
      },
      {
        iconName: "Globe",
        title: "Unter der Haube",
        items: [
          "Mehrsprachigkeits-Infrastruktur (i18next) eingezogen — Deutsch bleibt Standard, englische Übersetzungen sind vorbereitet und folgen in einem späteren Release.",
          "ESLint-Konfiguration verschärft und das Android-Build-Verzeichnis aus dem Lint-Scan ausgenommen."
        ]
      }
    ]
  },

  {
    version: "3.0.2",
    date: "01.04.2026",
    title: "Gsunde Wochen, bessere Daten 🔧",
    isMajor: false,
    sections: [
      {
        iconName: "Bug",
        title: "Fehlerbehebungen",
        items: [
          "Die Wochenstunden werden jetzt immer für die ganze Kalenderwoche (Mo–So) berechnet — auch wenn sie über zwei Monate geht.",
          "Mehrarbeit und Überstunden stimmen jetzt auch bei Monatswechseln sauber.",
          "Demo-Daten laden funktioniert sofort, ohne dass man die App neu starten muss.",
          "Einträge die nicht in die Datenbank geschrieben werden konnten, verschwinden nicht mehr still — du bekommst eine Meldung.",
          "Das Auto-Backup legt nicht mehr im Hintergrund doppelte Listener an."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Verbesserungen",
        items: [
          "Die Demo-Daten sehen jetzt praxisnah aus — mit Arbeitsmodell, Fahrzeit, Baustellen und einem ordentlichen Profil.",
          "Popups (Änderungsprotokoll, Hilfe) gehen jetzt sauber bis unter die Navigationsleiste.",
          "Der Zeitwähler ist jetzt auch für Screenreader bedienbar."
        ]
      },
      {
        iconName: "Download",
        title: "Unter der Haube",
        items: [
          "Alle Capacitor-Plugins auf den neuesten Stand gebracht.",
          "Import-Daten werden jetzt geprüft, bevor sie gespeichert werden — kaputte Einträge fliegen raus.",
          "Eintrags-IDs sind jetzt kollisionssicher, auch bei schnellem Anlegen."
        ]
      }
    ]
  },

  {
    version: "3.0.1",
    date: "31.03.2026",
    title: "Kleine Reparaturen, sauberer Text ✨",
    isMajor: false,
    sections: [
      {
        iconName: "Bug",
        title: "Fehlerbehebungen",
        items: [
          "Umlaute und Sonderzeichen werden in der App wieder korrekt angezeigt.",
          "Der Button zum Play Store ist sprachlich sauber formuliert und zeigt wieder den richtigen Text."
        ]
      },
      {
        iconName: "FileText",
        title: "Dokumentation",
        items: [
          "Die README wurde von kaputten Zeichen bereinigt und wieder lesbar gemacht."
        ]
      }
    ]
  },
  {
    version: "3.0.0",
    date: "30.03.2026",
    title: "Da große Frühjahrs-Stand",
    isMajor: true,
    sections: [
      {
        iconName: "Cloud",
        title: "Backup & Cloud",
        items: [
          "Google Drive, Nextcloud und lokales Backup sind jetzt sauber in der App eingebaut.",
          "Schon im Einrichtungs-Wizard kannst du dein Backup-Ziel gemütlich verbinden.",
          "Backups und Wiederherstellen greifen jetzt überall auf denselben Datenstand zu."
        ]
      },
      {
        iconName: "FileText",
        title: "Stunden & Berichte",
        items: [
          "Die Stundenberechnung läuft jetzt über eine gemeinsame zentrale Logik.",
          "Dashboard, Berichtsvorschau und PDF ziehen damit dieselben Werte her.",
          "Wochenkarten zeigen Mehrarbeit und Überstunden jetzt stimmiger an."
        ]
      },
      {
        iconName: "Shield",
        title: "Stabilität",
        items: [
          "Google Drive bleibt auf Android deutlich verlässlicher verbunden.",
          "Nextcloud meldet Rate-Limits und Verbindungsprobleme jetzt verständlicher zurück.",
          "Mehrere kleine Kanten in Einstellungen, Backup-Status und Picker wurden geglättet."
        ]
      }
    ]
  },
  {
    version: "2.5.0",
    date: "28.03.2026",
    title: "Cloud, Privatsphäre und a gscheite Datenbasis",
    isMajor: false,
    sections: [
      {
        iconName: "Cloud",
        title: "Cloud-Backups",
        items: [
          "Nextcloud ist als eigenes Backup-Ziel dazugekommen.",
          "Google Drive nutzt den geschützten App-Datenbereich statt sichtbarer Dateien.",
          "Der Verbindungsstatus in den Einstellungen ist klarer und einheitlicher geworden."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Alltag in der App",
        items: [
          "Die Einstellungen wurden aufgeräumt und übersichtlicher gemacht.",
          "Der Einrichtungsfluss fühlt sich runder an und nimmt dir mehr Handgriffe ab.",
          "Kleinere UI-Polishes machen die App insgesamt gschmeidiger."
        ]
      }
    ]
  },
  {
    version: "2.2.0",
    date: "26.03.2026",
    title: "SQLite, Anhänge und a stabiles Fundament",
    isMajor: false,
    sections: [
      {
        iconName: "FileText",
        title: "Daten & Anhänge",
        items: [
          "SQLite ist zur zentralen lokalen Datenbasis geworden.",
          "Anhänge und Dokumente können an Einträge gehängt und mitgeteilt werden.",
          "Import und Export sichern jetzt mehr von dem mit, was im Alltag wirklich wichtig ist."
        ]
      },
      {
        iconName: "Rocket",
        title: "Technik",
        items: [
          "Die App arbeitet robuster mit größeren Datenmengen.",
          "Icons und Build wurden optimiert, damit Start und Paketgröße sauberer passen.",
          "Interne Datenwege sind konsistenter geworden."
        ]
      }
    ]
  },
  {
    version: "2.0.0",
    date: "23.03.2026",
    title: "Mehr Flexibilität beim Arbeiten",
    isMajor: true,
    sections: [
      {
        iconName: "Sliders",
        title: "Arbeitsalltag",
        items: [
          "Eigene Tätigkeitscodes und Presets sind dazugekommen.",
          "Die Zeiteingabe wurde feiner und flexibler, je nachdem wie genau du buchen willst.",
          "Ein sofortiger 'Jetzt sichern'-Knopf spart Wartezeit, wenn du selbst sichern magst."
        ]
      },
      {
        iconName: "Clock",
        title: "Für neue User",
        items: [
          "Das Onboarding begleitet dich besser durch den Start.",
          "Demo-Daten und einfachere Grundeinstellungen helfen beim schnellen Ausprobieren.",
          "Arbeitszeitmodelle lassen sich klarer auf die eigene Woche anpassen."
        ]
      }
    ]
  },
  {
    version: "1.5.0",
    date: "15.01.2026",
    title: "Die App wird erwachsen",
    isMajor: false,
    sections: [
      {
        iconName: "Timer",
        title: "Stempeln & Überblick",
        items: [
          "Live-Stempeln ist dazugekommen und macht die tägliche Erfassung flotter.",
          "Dashboard und Salden geben dir schneller ein Gefühl, wo du gerade stehst.",
          "Zeitausgleich, Feiertage und ähnliche Fälle wurden sauberer eingebaut."
        ]
      },
      {
        iconName: "FileText",
        title: "Berichte",
        items: [
          "Die PDF-Berichte wurden übersichtlicher und hilfreicher aufgebaut.",
          "Monats- und Tageswerte sind besser nachvollziehbar geworden.",
          "Die Vorschau ist näher an dem dran, was später wirklich exportiert wird."
        ]
      }
    ]
  },
  {
    version: "1.0.0",
    date: "18.11.2025",
    title: "Der erste gscheite Grundstock",
    isMajor: true,
    sections: [
      {
        iconName: "Sparkles",
        title: "Start von eStundnzettl",
        items: [
          "Die Basis für Zeiteingabe, Dashboard und Berichte war damit gelegt.",
          "Österreichische Feiertage und typische Arbeitsfälle wurden von Anfang an mitgedacht.",
          "Die App hat ihren eigenen Stil bekommen und war bereit für den Alltag."
        ]
      }
    ]
  }
];
