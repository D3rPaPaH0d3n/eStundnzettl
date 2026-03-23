import { Sparkles, Zap, FileText, Shield, Bug, Globe, Clock, Timer, Rocket, Sliders, Download, Cloud, Building2 } from "lucide-react";

export const CHANGELOG_DATA = [
  {
  version: "6.2.3",
  date: "23.03.2026",
  title: "Code Cleanup & Performance ⚡",
  isMajor: false,
  sections: [
    {
      icon: Zap,
      title: "Code-Qualität",
      items: [
        "Refactor: App.jsx in useAppActions + useAppData Hooks aufgeteilt",
        "Chore: Debug-Logs und stale Kommentar-Blöcke entfernt",
        "Fix: Swipe-to-delete Layout in der Wochenansicht korrigiert",
        "Fix: Fahrzeit-Button von Orange auf Emerald umgestellt (Design-Konsistenz)"
      ]
    },
    {
      icon: Sparkles,
      title: "Neue Features",
      items: [
        "Neu: Demo-Daten laden in den Entwickler-Optionen (Einstellungen)",
        "Neu: Export/Import sichert jetzt auch Tätigkeitscodes mit",
        "Neu: Demo-Daten direkt im Onboarding ausprobieren (ohne App zu überschreiben)"
      ]
    },
    {
      icon: Shield,
      title: "Datensicherheit",
      items: [
        "Fix: Tätigkeitscodes werden bei Export/Import nicht mehr übersprungen",
        "Fix: Preset laden schützt jetzt mit Bestätigungsdialog"
      ]
    }
  ]
},
  {
  version: "6.2.2",
  date: "22.01.2026",
  title: "Backup Stability Fix 🛡️",
  isMajor: false,
  sections: [
    {
      icon: Shield,
      title: "Backup-System",
      items: [
        "Fix: Auto-Backup funktioniert jetzt zuverlässig auf allen Android-Versionen",
        "Fix: Keine 'Permission Denied' Fehler mehr nach App-Neuinstallation",
        "Optimiert: Interner Speicher für Auto-Backup (stabiler & schneller)"
      ]
    },
    {
      icon: Bug,
      title: "Bugfixes",
      items: [
        "Fix: Hintergrund scrollt nicht mehr wenn Tätigkeitscodes-Modal offen ist",
        "Export: Eindeutige Dateinamen mit Zeitstempel (verhindert Überschreib-Konflikte)"
      ]
    }
  ]
},
  {
    version: "6.2.0",
    date: "17.01.2026",
    title: "Custom Work Codes Update 🛠️",
    isMajor: false,
    sections: [
      {
        icon: Sliders,
        title: "Tätigkeitscodes anpassbar",
        items: [
          "Neu: Eigene Tätigkeitscodes erstellen, bearbeiten und löschen",
          "Presets: Wähle zwischen 'Kogler', 'Allgemein' oder starte leer",
          "Quick-Add: Neue Codes direkt im Eintragsformular hinzufügen",
          "Code-Verwaltung: Neuer Bereich in den Einstellungen"
        ]
      },
      {
        icon: Zap,
        title: "Verbesserungen",
        items: [
          "Neue User starten mit 'Allgemein' Preset als Standard",
          "Bestehende User behalten ihre gewohnten Kogler-Codes",
          "Footer: Developed with ❤️ by Markus Kainer & Claude"
        ]
      }
    ]
  },
  {
    version: "6.0.0",
    date: "15.01.2026",
    title: "The Neutral & Paper Update 🎨",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Neues Design",
        items: [
          "Paper-Look: Ein frisches, technisches Grau (Anthrazit) ersetzt das alte Blau-Grau.",
          "Emerald-Green: Das neue, satte Grün sorgt für bessere Lesbarkeit und modernen Look.",
          "Konsistenz: Alle Menüs, Popups und Auswahl-Listen wurden an das neue Design angepasst."
        ]
      },
      {
        icon: Building2,
        title: "Neutral & Flexibel",
        items: [
          "Deine Firma: Du kannst jetzt in den Einstellungen deinen eigenen Firmennamen hinterlegen.",
          "PDF-Bericht: Der Stundenzettel ist nun neutral und zeigt deinen Firmennamen im Header an.",
          "White-Label: Keine fixen Firmen-Brandings mehr – die App gehört dir."
        ]
      },
      {
        icon: Shield,
        title: "Android & System",
        items: [
          "Themed Icons: Das App-Icon passt sich jetzt (ab Android 13) farblich deinem Homescreen an (Monochrome Support).",
          "Optimierter Dark Mode: Bessere Kontraste für augenschonendes Arbeiten bei Nacht."
        ]
      }
    ]
  },
  {
    version: "5.1.4",
    date: "04.01.2026",
    title: "Vorbereitung Play Store & Stabilität 🚀",
    isMajor: false,
    sections: [
      {
        icon: Shield,
        title: "Play Store Release",
        items: [
          "Konfiguration für geschlossenen Testtrack vorbereitet",
          "Optimierung des Build-Prozesses für Android App Bundles (.aab)",
          "Anpassung der Versions-Strings für Google Play Konformität"
        ]
      },
      {
        icon: Sparkles,
        title: "Verbesserungen",
        items: [
          "Interne Performance-Optimierungen beim Laden der Dashboard-Stats",
          "Stabilitätsfix für AnimatePresence bei schnellen Ansichtswechseln"
        ]
      }
    ]
  },
  {
    version: "5.1.0",
    date: "16.12.2025",
    title: "Onboarding & Picker Polish ✨",
    isMajor: false,
    sections: [
      {
        icon: Rocket,
        title: "Neues Onboarding",
        items: [
          "Start-Screen: Wahl zwischen 'Neu' und 'Backup laden'",
          "Profil: Feld für Tätigkeit/Anstellung ist zurück",
          "Backup-Einrichtung: Jetzt auch lokaler Ordner wählbar"
        ]
      },
      {
        icon: Sliders,
        title: "UI & Modelle",
        items: [
          "Picker: Optimiertes Design, fixes 'h', 8h Standard-Start",
          "Arbeitszeit: '38,5h 4-Tage' Modell aktualisiert (Mo-Mi 10h)",
          "Benutzerdefiniert: Neuer Slider für Tagesstunden im Wizard"
        ]
      },
      {
        icon: Bug,
        title: "Wichtige Fixes",
        items: [
          "Crash beim Start (Google Drive Init) behoben",
          "Restore-Probleme (Format & Token) gefixt",
          "Header wird im Wizard nun korrekt ausgeblendet"
        ]
      }
    ]
  },
  {
    version: "5.0.0",
    date: "13.12.2025",
    title: "Das Cloud-Update ☁️",
    isMajor: true,
    sections: [
      {
        icon: Cloud,
        title: "Google Drive Sync",
        items: [
          "Endlich da: Verbinde dich mit Google Drive für automatische Cloud-Backups",
          "Easy Restore: Stelle deine Daten auf einem neuen Handy direkt aus der Cloud wieder her",
          "Sicherheit: Deine Daten gehören dir – gespeichert in deinem privaten Drive"
        ]
      },
      {
        icon: Rocket,
        title: "Neuer Start",
        items: [
          "Komplett überarbeiteter Einrichtungs-Assistent (Onboarding)",
          "Wahlmöglichkeit beim Start: 'Neu beginnen' oder 'Backup laden'",
          "Verbesserte UI in den Einstellungen für Account & Backup"
        ]
      }
    ]
  },
  {
    version: "4.4.3",
    date: "09.12.2025",
    title: "Update-Fix & PDF Politur 🛠️",
    isMajor: false,
    sections: [
      {
        icon: Download,
        title: "System Updates",
        items: [
          "Download-Fix: Updates werden jetzt sicher über den System-Browser geladen (löst Probleme beim Speichern der APK)",
        ]
      },
      {
        icon: FileText,
        title: "PDF Bericht",
        items: [
          "Soll-Stunden: Berechnung korrigiert (zählt im laufenden Monat nur bis 'Heute')",
          "Layout-Fix: Keine abgeschnittenen Texte mehr bei langen Einträgen",
          "Optik: 'Saldo' und 'Std' sind jetzt perfekt auf einer Linie ausgerichtet",
          "Design: Trennlinien optimiert (keine Striche mehr zwischen Einträgen am selben Tag)"
        ]
      }
    ]
  },
  {
    version: "4.4.1",
    date: "04.12.2025",
    title: "Hotfix & Polish 🧹",
    isMajor: false,
    sections: [
      {
        icon: Bug,
        title: "Korrekturen",
        items: [
          "Korrektur der internen Versionsnummerierung für reibungslose Updates",
          "Kleine Optimierungen am Onboarding-Prozess"
        ]
      }
    ]
  },
  {
    version: "4.4.0",
    date: "04.12.2025",
    title: "The Flex-Time Update ⚙️",
    isMajor: true,
    sections: [
      {
        icon: Rocket,
        title: "Onboarding & Modelle",
        items: [
          "Neuer Einrichtungs-Assistent: Begrüßt dich beim Start und richtet die App perfekt auf dich ein",
          "Flexible Arbeitszeit: Wähle zwischen 38,5h (Kogler Standard), 40h oder definiere deine Woche komplett selbst",
          "Wochen-Rechner: Der Assistent zeigt dir live deine Gesamt-Wochenstunden an"
        ]
      },
      {
        icon: Shield,
        title: "Logik & Sicherheit",
        items: [
          "Auto-Checkout: Vergessen auszustempeln? Die App beendet den Tag beim nächsten Start automatisch um 23:59",
          "Zeitzonen-Fix: Die Live-Uhr arbeitet jetzt präzise mit deiner lokalen Gerätezeit",
          "Smart Migration: Bestehende User werden sanft auf das neue Datensystem umgestellt"
        ]
      }
    ]
  },
  {
    version: "4.3.0",
    date: "04.12.2025",
    title: "The Live Update ⏱️",
    isMajor: true,
    sections: [
      {
        icon: Timer,
        title: "Live Stempeluhr",
        items: [
          "Endlich da: Drücke einfach auf 'Einstempeln' und die App erfasst deine Zeit live",
          "Neuer 'EIN/AUS' Button: Schwebend unten links, immer erreichbar",
          "Live-Status: Siehe sofort, wie viel Zeit noch fehlt oder ob du schon Überstunden machst"
        ]
      },
      {
        icon: Zap,
        title: "Workflow",
        items: [
          "Auto-Rundung: Zeiten werden im Hintergrund kaufmännisch auf 15 Minuten geglättet",
          "Smart-Entry: Gestoppte Zeiten landen direkt fix und fertig im Formular"
        ]
      }
    ]
  },
  {
    version: "4.2.0",
    date: "03.12.2025",
    title: "Smart Time & Zeitausgleich 🧠",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Neue Features",
        items: [
          "Smart Time: Bei neuen Einträgen startet die Zeit automatisch dort, wo der letzte aufgehört hat",
          "Zeitausgleich: Neuer lila Button für ZA (wird korrekt berechnet)",
          "Dashboard: Pause wird jetzt direkt hinter der Zeit angezeigt"
        ]
      },
      {
        icon: FileText,
        title: "PDF & Design",
        items: [
          "PDF-Bericht: Kompaktere Zusammenfassung, ungenutzte Kategorien werden ausgeblendet",
          "DatePicker: Feiertage sind jetzt nur noch durch rote Zahlen markiert (dezenter)",
        ]
      }
    ]
  },
  {
    version: "4.1.1",
    date: "02.12.2025",
    title: "PDF Perfektion & Notizen 📝",
    isMajor: false,
    sections: [
      {
        icon: FileText,
        title: "PDF Bericht",
        items: [
          "Layout optimiert: Perfektes A4-Format ohne leere Seiten",
          "Notiz-Funktion: Füge persönliche Anmerkungen zum Bericht hinzu",
          "Design: Größere Schrift & verbesserte Lesbarkeit",
          "Intelligente Datumsanzeige: Tag wird bei Mehrfach-Einträgen gruppiert"
        ]
      },
      {
        icon: Bug,
        title: "Fixes",
        items: [
          "Export-Fehler 'EACCESS' auf Android behoben",
          "Druck-Statusmeldung korrigiert"
        ]
      }
    ]
  },
  {
    version: "4.1.0",
    date: "01.12.2025",
    title: "The Precision Update 🎯",
    isMajor: true,
    sections: [
      {
        icon: Shield,
        title: "Logik & Sicherheit",
        items: [
          "Doppel-Buchungsschutz: Verhindert überlappende Zeiteinträge",
          "Zukunfts-Logik: Feiertage & Stunden werden erst gutgeschrieben, wenn der Tag erreicht ist",
          "OTA-Check: Manueller Update-Prüfer in den Einstellungen"
        ]
      },
      {
        icon: FileText,
        title: "Berichtsvorschau 2.0",
        items: [
          "Monats-Navigation: Wechsle Monate direkt in der Vorschau",
          "Smart-Zoom: PDF passt sich automatisch perfekt an dein Display an",
          "Neuer Dropdown: Schicke Auswahl für Wochen & Monate"
        ]
      },
      {
        icon: Bug,
        title: "Fixes & UI",
        items: [
          "iPhone Fix: 'Neuer Eintrag'-Button ist jetzt immer klickbar",
          "Safe-Area: Menüs werden unten nicht mehr abgeschnitten",
          "Drawer-Scroll Fix: Zeitwahl schließt sich nicht mehr versehentlich beim Scrollen"
        ]
      }
    ]
  },
  {
    version: "4.0.0",
    date: "30.11.2025",
    title: "The Smooth Elevator Update 🛗",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Look & Feel",
        items: [
          "High-End Animationen (Seitenübergänge, Listen)",
          "Haptisches Feedback (Vibrationen bei Interaktionen)",
          "Swipe-to-Delete: Einträge einfach nach links wischen",
          "TimePicker: Zeitwahl aktualisiert sich direkt beim Scrollen"
        ]
      },
      {
        icon: Zap,
        title: "Workflow & Speed",
        items: [
          "Magic Copy: Neuer 'Wie zuletzt'-Button im Formular",
          "Autocomplete: Projekt-Vorschläge beim Tippen",
          "Massive Performance-Optimierung (Lazy Loading)",
          "App-Startzeit drastisch verkürzt"
        ]
      },
      {
        icon: FileText,
        title: "PDF Bericht 2.0",
        items: [
          "Profilfoto im Header (automatisch rechtsbündig)",
          "Layout-Fix: Keine leeren Seiten mehr",
          "Vorschau öffnet sich als schickes Overlay"
        ]
      }
    ]
  },
  {
    version: "3.0.0",
    date: "25.11.2025",
    title: "The Dark Mode Update 🌙",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Neue Features & UI",
        items: [
          "Dark Mode: Unterstützung für Hell, Dunkel und System",
          "Custom Drawers: Moderne Slide-Up Menüs statt nativer Auswahl",
          "Smart DatePicker: Neuer Kalender mit Zebra-Look & großen Flächen",
          "Verbesserte UX: Toasts statt nerviger Alerts",
          "Smart Defaults: Merkt sich die letzte Tätigkeit"
        ]
      },
      {
        icon: Zap,
        title: "Technik",
        items: [
          "Komplettes Refactoring in modulare Komponenten",
          "Upgrade auf Tailwind CSS v4 Engine",
          "Android Splash Screen: Weißes Aufblitzen entfernt"
        ]
      }
    ]
  },
  {
    version: "2.0.1",
    date: "20.11.2025",
    title: "Auto-Backup & Dateizugriff 🛡️",
    isMajor: false,
    sections: [
      {
        icon: Shield,
        title: "Datensicherheit",
        items: [
          "Automatisches Backup: Optional 1x täglich",
          "Offener Speicherort: Dateien landen direkt in 'Dokumente'"
        ]
      },
      {
        icon: Bug,
        title: "Fixes",
        items: [
          "Robuster PDF-Export (Zeitstempel in Dateinamen)",
          "Verbesserter Zugriff auf das Dateisystem"
        ]
      }
    ]
  },
  {
    version: "2.0.0",
    date: "18.11.2025",
    title: "PDF V4, Feiertage & Fahrtzeit 🚀",
    isMajor: true,
    sections: [
      {
        icon: FileText,
        title: "PDF Bericht V4",
        items: [
          "Neues Design: Zebra-Look & optimiertes Layout",
          "Tages-Saldo: Neue Spalte für Plus/Minus pro Tag",
          "Erweiterte Zusammenfassung mit Soll/Ist Vergleich"
        ]
      },
      {
        icon: Globe,
        title: "Logik",
        items: [
          "Intelligente Feiertage (automatische Erkennung Österreich)",
          "Differenzierte Fahrtzeiten: Anreise (bezahlt) vs. Fahrt (unbezahlt)",
          "Unbezahlte Zeiten werden separat ausgewiesen"
        ]
      }
    ]
  }
];