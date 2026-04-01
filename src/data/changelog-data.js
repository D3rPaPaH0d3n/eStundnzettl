export const CHANGELOG_DATA = [

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
