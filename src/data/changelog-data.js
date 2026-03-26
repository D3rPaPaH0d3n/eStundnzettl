import { Sparkles, Zap, FileText, Shield, Bug, Globe, Clock, Timer, Rocket, Sliders, Download, Cloud, Building2 } from "lucide-react";

export const CHANGELOG_DATA = [






    {
    version: "6.4.0",
    date: "26.03.2026",
    title: "Großes Daten-Update mit SQLite 🚀",
    isMajor: true,
    sections: [
      {
        iconName: 'Sparkles',
        title: "Neue Features",
        items: [
          "Dokumente direkt an Einträge anhängen",
          "PDF-Berichte zusammen mit Anhängen teilen",
          "Anhänge und Label-Vorschläge werden jetzt zuverlässig gespeichert"
        ]
      },
      {
        iconName: 'Zap',
        title: "Verbesserungen",
        items: [
          "Die App speichert Kerndaten jetzt auf einer stabileren SQLite-Datenbank",
          "Zeiteinträge, Einstellungen und Tätigkeitscodes wurden für die neue Speicherung umgestellt",
          "Backup-Infos und zuletzt verwendete Auswahl bleiben konsistenter erhalten"
        ]
      },
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Mehrere Speicher- und Synchronisationsprobleme im Hintergrund behoben",
          "Anhänge, Backups und zuletzt verwendete Werte robuster gemacht",
          "Diverse technische Aufräumarbeiten für stabilere Updates auf Android"
        ]
      }
    ]
  },
  {
  version: "6.3.34",
  date: "26.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: Anhänge und Label-Vorschläge in SQLite speichern",
        "Neu: Einstellungen und Tätigkeitscodes auf SQLite vorbereiten",
        "Neu: Zeiteinträge auf SQLite mit Fallback vorbereiten",
        "Neu: Dokumente an Einträge anhängen und gemeinsam teilen",
        "Neu: Changelog aufgeräumt + Accordion UI [skip ci]",
        "Neu: Deploy-Verifizierung + Telegram-Notification in CI"
      ]
    },
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
        "Fix: remove internal-only entries from user-facing changelog",
        "Fix: add missing changelog entries (6.3.21–6.3.27) + group bugfix releases (#4)",
        "Fix: enable edge-to-edge display for Android 15+ compatibility",
        "Fix: Telegram-Notification klarer formuliert [skip ci]",
        "Fix: minifyEnabled true + Proguard Keep-Rules für WebView/Capacitor",
        "Fix: Update-Checker verlinkt auf Play Store statt GitHub APK",
        "Fix: removeAllListeners() durch gezieltes Listener-Cleanup ersetzt",
        "Fix: Backup-Fehler sichtbar machen mit Fail-Counter und Warnung",
        "Fix: GDrive Token-Expiry-Check nach 50 Minuten"
      ]
    },
    {
      iconName: 'Zap',
      title: "Verbesserungen",
      items: [
        "humanize changelog + improve commit guidelines (#3)",
        "Einstellungen vereinfacht, add collapsible UI and improved demo warning",
        "Single-Point-of-Truth Versionierung via Vite define",
        "privacy datum + logo optimiert",
        "Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "CI Pipeline vereinfacht — nur noch Play Store Deploy"
      ]
    },
    {
      iconName: 'FileText',
      title: "Dokumentation",
      items: [
        "Docs: README CI Hinweis [test]"
      ]
    }
  ]
  },
  {
  version: "6.3.33",
  date: "26.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: Einstellungen und Tätigkeitscodes auf SQLite vorbereiten",
        "Neu: Zeiteinträge auf SQLite mit Fallback vorbereiten",
        "Neu: Dokumente an Einträge anhängen und gemeinsam teilen",
        "Neu: Changelog aufgeräumt + Accordion UI [skip ci]",
        "Neu: Deploy-Verifizierung + Telegram-Notification in CI"
      ]
    },
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
        "Fix: remove internal-only entries from user-facing changelog",
        "Fix: add missing changelog entries (6.3.21–6.3.27) + group bugfix releases (#4)",
        "Fix: enable edge-to-edge display for Android 15+ compatibility",
        "Fix: Telegram-Notification klarer formuliert [skip ci]",
        "Fix: minifyEnabled true + Proguard Keep-Rules für WebView/Capacitor",
        "Fix: Update-Checker verlinkt auf Play Store statt GitHub APK",
        "Fix: removeAllListeners() durch gezieltes Listener-Cleanup ersetzt",
        "Fix: Backup-Fehler sichtbar machen mit Fail-Counter und Warnung",
        "Fix: GDrive Token-Expiry-Check nach 50 Minuten"
      ]
    },
    {
      iconName: 'Zap',
      title: "Verbesserungen",
      items: [
        "humanize changelog + improve commit guidelines (#3)",
        "Einstellungen vereinfacht, add collapsible UI and improved demo warning",
        "Single-Point-of-Truth Versionierung via Vite define",
        "privacy datum + logo optimiert",
        "Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "CI Pipeline vereinfacht — nur noch Play Store Deploy"
      ]
    },
    {
      iconName: 'FileText',
      title: "Dokumentation",
      items: [
        "Docs: README CI Hinweis [test]"
      ]
    }
  ]
  },
  {
  version: "6.3.32",
  date: "26.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: Zeiteinträge auf SQLite mit Fallback vorbereiten",
        "Neu: Dokumente an Einträge anhängen und gemeinsam teilen",
        "Neu: Changelog aufgeräumt + Accordion UI [skip ci]",
        "Neu: Deploy-Verifizierung + Telegram-Notification in CI"
      ]
    },
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
        "Fix: remove internal-only entries from user-facing changelog",
        "Fix: add missing changelog entries (6.3.21–6.3.27) + group bugfix releases (#4)",
        "Fix: enable edge-to-edge display for Android 15+ compatibility",
        "Fix: Telegram-Notification klarer formuliert [skip ci]",
        "Fix: minifyEnabled true + Proguard Keep-Rules für WebView/Capacitor",
        "Fix: Update-Checker verlinkt auf Play Store statt GitHub APK",
        "Fix: removeAllListeners() durch gezieltes Listener-Cleanup ersetzt",
        "Fix: Backup-Fehler sichtbar machen mit Fail-Counter und Warnung",
        "Fix: GDrive Token-Expiry-Check nach 50 Minuten"
      ]
    },
    {
      iconName: 'Zap',
      title: "Verbesserungen",
      items: [
        "humanize changelog + improve commit guidelines (#3)",
        "Einstellungen vereinfacht, add collapsible UI and improved demo warning",
        "Single-Point-of-Truth Versionierung via Vite define",
        "privacy datum + logo optimiert",
        "Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "CI Pipeline vereinfacht — nur noch Play Store Deploy"
      ]
    },
    {
      iconName: 'FileText',
      title: "Dokumentation",
      items: [
        "Docs: README CI Hinweis [test]"
      ]
    }
  ]
  },
  {
  version: "6.3.31",
  date: "26.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: Dokumente an Einträge anhängen und gemeinsam teilen",
        "Neu: Changelog aufgeräumt + Accordion UI [skip ci]",
        "Neu: Deploy-Verifizierung + Telegram-Notification in CI"
      ]
    },
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
        "Fix: remove internal-only entries from user-facing changelog",
        "Fix: add missing changelog entries (6.3.21–6.3.27) + group bugfix releases (#4)",
        "Fix: enable edge-to-edge display for Android 15+ compatibility",
        "Fix: Telegram-Notification klarer formuliert [skip ci]",
        "Fix: minifyEnabled true + Proguard Keep-Rules für WebView/Capacitor",
        "Fix: Update-Checker verlinkt auf Play Store statt GitHub APK",
        "Fix: removeAllListeners() durch gezieltes Listener-Cleanup ersetzt",
        "Fix: Backup-Fehler sichtbar machen mit Fail-Counter und Warnung",
        "Fix: GDrive Token-Expiry-Check nach 50 Minuten"
      ]
    },
    {
      iconName: 'Zap',
      title: "Verbesserungen",
      items: [
        "humanize changelog + improve commit guidelines (#3)",
        "Einstellungen vereinfacht, add collapsible UI and improved demo warning",
        "Single-Point-of-Truth Versionierung via Vite define",
        "privacy datum + logo optimiert",
        "Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "CI Pipeline vereinfacht — nur noch Play Store Deploy"
      ]
    },
    {
      iconName: 'FileText',
      title: "Dokumentation",
      items: [
        "Docs: README CI Hinweis [test]"
      ]
    }
  ]
  },
  {
  version: "6.3.30",
  date: "25.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
        "Fix: remove internal-only entries from user-facing changelog",
        "Fix: add missing changelog entries (6.3.21–6.3.27) + group bugfix releases (#4)",
        "Fix: enable edge-to-edge display for Android 15+ compatibility",
        "Fix: Telegram-Notification klarer formuliert [skip ci]",
        "Fix: minifyEnabled true + Proguard Keep-Rules für WebView/Capacitor",
        "Fix: Update-Checker verlinkt auf Play Store statt GitHub APK",
        "Fix: removeAllListeners() durch gezieltes Listener-Cleanup ersetzt",
        "Fix: Backup-Fehler sichtbar machen mit Fail-Counter und Warnung",
        "Fix: GDrive Token-Expiry-Check nach 50 Minuten"
      ]
    },
    {
      iconName: 'Zap',
      title: "Verbesserungen",
      items: [
        "humanize changelog + improve commit guidelines (#3)",
        "Einstellungen vereinfacht, add collapsible UI and improved demo warning",
        "Single-Point-of-Truth Versionierung via Vite define",
        "privacy datum + logo optimiert",
        "Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "CI Pipeline vereinfacht — nur noch Play Store Deploy"
      ]
    },
    {
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: Changelog aufgeräumt + Accordion UI [skip ci]",
        "Neu: Deploy-Verifizierung + Telegram-Notification in CI"
      ]
    },
    {
      iconName: 'FileText',
      title: "Dokumentation",
      items: [
        "Docs: README CI Hinweis [test]"
      ]
    }
  ]
  },
  {
    version: "6.3.27",
    date: "25.03.2026",
    title: "Einstellungen neu organisiert ⚙️",
    isMajor: false,
    sections: [
      {
        iconName: 'Sliders',
        title: "Einstellungen",
        items: [
          "Einstellungen aufgeräumt und übersichtlicher",
          "Demo-Daten Funktion verbessert"
        ]
      },
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "App stürzt nicht mehr ab beim Öffnen der Einstellungen"
        ]
      }
    ]
  },
  {
    version: "6.3.26",
    date: "25.03.2026",
    title: "Android 15+ Edge-to-Edge Fix 📱",
    isMajor: false,
    sections: [
      {
        iconName: 'Shield',
        title: "Android-Kompatibilität",
        items: [
          "Edge-to-Edge Display für Android 15+ aktiviert",
          "App wird nicht mehr von der Statusleiste überlagert"
        ]
      }
    ]
  },
  {
    version: "6.3.22",
    date: "25.03.2026",
    title: "Logo & Datenschutz optimiert 🖼️",
    isMajor: false,
    sections: [
      {
        iconName: 'Sparkles',
        title: "Design",
        items: [
          "Logo und Icons für Play Store optimiert",
          "Datumsformat im Sinne der DSGVO angepasst"
        ]
      }
    ]
  },
  {
    version: "6.3.21",
    date: "25.03.2026",
    title: "App-Größe reduziert 📦",
    isMajor: false,
    sections: [
      {
        iconName: 'Rocket',
        title: "Performance",
        items: [
          "Icon-Dateien drastisch komprimiert",
          "App startet schneller, weniger Speicherplatz"
        ]
      }
    ]
  },
  {
    version: "6.3.19",
    date: "24.03.2026",
    title: "Updates 🔄",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Icons bei Firmenname und Position in den Einstellungen optimiert"
        ]
      }
    ]
  },
  {
    version: "6.3.18",
    date: "24.03.2026",
    title: "Updates 🔄",
    isMajor: false,
    sections: [
      {
        iconName: 'Sparkles',
        title: "Neue Features",
        items: [
          "Einstellungen aufgeräumt und übersichtlicher",
          "App läuft schneller und spart Akku"
        ]
      }
    ]
  },
  {
    version: "6.3.17",
    date: "24.03.2026",
    title: "Bugfixes 🔧",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Einstellungen funktionieren wieder stabil",
          "Bessere Handhabung von gespeicherten Daten"
        ]
      }
    ]
  },
  {
    version: "6.3.16",
    date: "24.03.2026",
    title: "Kritischer Bugfix: Settings-Crash behoben",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "App stürzt nicht mehr ab wenn man die Einstellungen öffnet",
          "Fehlende Arbeitstage werden automatisch auf Standardwerte gesetzt"
        ]
      }
    ]
  },
  {
    version: "6.3.15",
    date: "24.03.2026",
    title: "Bugfixes 🔧",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Einstellungen reagieren stabiler"
        ]
      }
    ]
  },
  {
    version: "6.3.14",
    date: "24.03.2026",
    title: "Bugfixes 🔧",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Daten werden zuverlässiger geladen"
        ]
      }
    ]
  },
  {
    version: "6.3.13",
    date: "24.03.2026",
    title: "Bugfixes 🔧",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "App startet robuster"
        ]
      }
    ]
  },
  {
    version: "6.3.12",
    date: "24.03.2026",
    title: "Bugfixes 🔧",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Fehlermeldungen können jetzt kopiert werden"
        ]
      }
    ]
  },
  {
    version: "6.3.11",
    date: "24.03.2026",
    title: "Bugfixes 🔧",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Fehler-Details werden jetzt richtig angezeigt"
        ]
      }
    ]
  },
  {
    version: "6.3.10",
    date: "24.03.2026",
    title: "Bugfixes 🔧",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Google Drive funktioniert auf älteren Android-Versionen"
        ]
      }
    ]
  },
  {
    version: "6.3.9",
    date: "23.03.2026",
    title: "Updates 🔄",
    isMajor: false,
    sections: [
      {
        iconName: 'Sparkles',
        title: "Verbesserungen",
        items: [
          "Allgemeine Verbesserungen und Stabilität"
        ]
      }
    ]
  },
  {
    version: "6.3.8",
    date: "23.03.2026",
    title: "Updates 🔄",
    isMajor: false,
    sections: [
      {
        iconName: 'Zap',
        title: "Verbesserungen",
        items: [
          "Internes aufgeräumt — App läuft flüssiger"
        ]
      }
    ]
  },
  {
    version: "6.3.7",
    date: "23.03.2026",
    title: "Updates 🔄",
    isMajor: false,
    sections: [
      {
        iconName: 'Sparkles',
        title: "Neue Features",
        items: [
          "Einstellungen übersichtlicher organisiert"
        ]
      }
    ]
  },
  {
    version: "6.3.6",
    date: "23.03.2026",
    title: "Neue Features ✨",
    isMajor: false,
    sections: [
      {
        iconName: 'Sparkles',
        title: "Neue Features",
        items: [
          "Minütige Zeiteingabe in den Einstellungen umschaltbar"
        ]
      }
    ]
  },
  {
    version: "6.3.5",
    date: "23.03.2026",
    title: "Neue Features & Bugfixes 🛠️",
    isMajor: false,
    sections: [
      {
        iconName: 'Sparkles',
        title: "Neue Features",
        items: [
          "Manueller Backup-Button hinzugefügt",
          "Minütige Zeiteingabe (1-Min-Modus) in den Einstellungen",
          "Demo-Daten direkt im Onboarding ausprobieren",
          "Letztes Backup wird angezeigt"
        ]
      },
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Changelog scrollt und schließt sich richtig",
          "Export/Import sichert jetzt auch Tätigkeitscodes mit"
        ]
      },
      {
        iconName: 'Rocket',
        title: "Performance",
        items: [
          "App-Ladezeit verkürzt"
        ]
      }
    ]
  },
  {
    version: "6.3.3",
    date: "23.03.2026",
    title: "Neue Features & Bugfixes 🛠️",
    isMajor: false,
    sections: [
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "Changelog Overlay und Scroll-Verhalten korrigiert"
        ]
      },
      {
        iconName: 'Sparkles',
        title: "Neue Features",
        items: [
          "Manueller Backup-Button für sofortige Sicherung",
          "Optionale minütliche Zeiteingabe (1-Min-Modus)"
        ]
      },
      {
        iconName: 'Rocket',
        title: "Performance",
        items: [
          "Changelog wird erst geladen wenn du ihn brauchst — App startet schneller"
        ]
      }
    ]
  },
  {
    version: "6.3.2",
    date: "23.03.2026",
    title: "Backup-System verbessert 🛡️",
    isMajor: false,
    sections: [
      {
        iconName: 'Cloud',
        icon: Cloud,
        title: "Backup",
        items: [
          "'Jetzt sichern'-Button für sofortiges Backup (Google Drive + Lokal)",
          "Letztes Backup wird angezeigt ('vor X Min./Std.')",
          "Offline-Warnung wenn Google Drive Token abgelaufen"
        ]
      }
    ]
  },
  {
    version: "6.3.1",
    date: "23.03.2026",
    title: "Neue Features & Bugfixes 🛠️",
    isMajor: false,
    sections: [
      {
        iconName: 'Sparkles',
        icon: Sparkles,
        title: "Neue Features",
        items: [
          "Demo-Daten laden in den Entwickler-Optionen (Einstellungen)",
          "Export/Import sichert jetzt auch Tätigkeitscodes mit",
          "Demo-Daten direkt im Onboarding ausprobieren (ohne App zu überschreiben)",
          "Minütige Zeiteingabe (1-Min statt 15-Min Schritte) — in Einstellungen & Onboarding umschaltbar"
        ]
      },
      {
        iconName: 'Shield',
        icon: Shield,
        title: "Datensicherheit",
        items: [
          "Tätigkeitscodes werden bei Export/Import nicht mehr übersprungen",
          "Preset laden schützt jetzt mit Bestätigungsdialog"
        ]
      }
    ]
  },
  {
    version: "6.3.0",
    date: "23.03.2026",
    title: "Minütige Zeiteingabe ⚡",
    isMajor: false,
    sections: [
      {
        iconName: 'Zap',
        icon: Zap,
        title: "Neue Features",
        items: [
          "Minütige Zeiteingabe (1-Min statt 15-Min Schritte) — in Einstellungen & Onboarding umschaltbar"
        ]
      },
      {
        iconName: 'Sparkles',
        icon: Sparkles,
        title: "Sonstiges",
        items: [
          "Demo-Daten laden in den Entwickler-Optionen (Einstellungen)",
          "Export/Import sichert jetzt auch Tätigkeitscodes mit"
        ]
      },
      {
        iconName: 'Shield',
        icon: Shield,
        title: "Datensicherheit",
        items: [
          "Tätigkeitscodes werden bei Export/Import nicht mehr übersprungen"
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
        iconName: 'Shield',
        icon: Shield,
        title: "Backup-System",
        items: [
          "Auto-Backup funktioniert jetzt zuverlässig auf allen Android-Versionen",
          "Keine 'Permission Denied' Fehler mehr nach App-Neuinstallation",
          "Interner Speicher für Auto-Backup optimiert (stabiler & schneller)"
        ]
      },
      {
        iconName: 'Bug',
        icon: Bug,
        title: "Bugfixes",
        items: [
          "Hintergrund scrollt nicht mehr wenn Tätigkeitscodes-Modal offen ist",
          "Eindeutige Dateinamen mit Zeitstempel (verhindert Überschreib-Konflikte)"
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
        iconName: 'Sliders',
        icon: Sliders,
        title: "Tätigkeitscodes anpassbar",
        items: [
          "Eigene Tätigkeitscodes erstellen, bearbeiten und löschen",
          "Presets: Wähle zwischen 'Kogler', 'Allgemein' oder starte leer",
          "Quick-Add: Neue Codes direkt im Eintragsformular hinzufügen",
          "Code-Verwaltung: Neuer Bereich in den Einstellungen"
        ]
      },
      {
        iconName: 'Zap',
        icon: Zap,
        title: "Verbesserungen",
        items: [
          "Neue User starten mit 'Allgemein' Preset als Standard",
          "Bestehende User behalten ihre gewohnten Kogler-Codes"
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
        iconName: 'Sparkles',
        icon: Sparkles,
        title: "Neues Design",
        items: [
          "Paper-Look: Ein frisches, technisches Grau (Anthrazit) ersetzt das alte Blau-Grau.",
          "Emerald-Green: Das neue, satte Grün sorgt für bessere Lesbarkeit und modernen Look.",
          "Konsistenz: Alle Menüs, Popups und Auswahl-Listen wurden an das neue Design angepasst."
        ]
      },
      {
        iconName: 'Building2',
        icon: Building2,
        title: "Neutral & Flexibel",
        items: [
          "Deine Firma: Du kannst jetzt in den Einstellungen deinen eigenen Firmennamen hinterlegen.",
          "PDF-Bericht: Der Stundenzettel ist nun neutral und zeigt deinen Firmennamen im Header an.",
          "White-Label: Keine fixen Firmen-Brandings mehr – die App gehört dir."
        ]
      },
      {
        iconName: 'Shield',
        icon: Shield,
        title: "Android & System",
        items: [
          "Themed Icons: Das App-Icon passt sich jetzt (ab Android 13) farblich deinem Homescreen an.",
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
        iconName: 'Shield',
        icon: Shield,
        title: "Play Store Release",
        items: [
          "Konfiguration für geschlossenen Testtrack vorbereitet",
          "Optimierung des Build-Prozesses für Android App Bundles (.aab)",
          "Anpassung der Versions-Strings für Google Play Konformität"
        ]
      },
      {
        iconName: 'Sparkles',
        icon: Sparkles,
        title: "Verbesserungen",
        items: [
          "Interne Performance-Optimierungen beim Laden der Dashboard-Stats",
          "Stabilitätsfix für schnelle Ansichtswechsel"
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
        iconName: 'Rocket',
        icon: Rocket,
        title: "Neues Onboarding",
        items: [
          "Start-Screen: Wahl zwischen 'Neu' und 'Backup laden'",
          "Profil: Feld für Tätigkeit/Anstellung ist zurück",
          "Backup-Einrichtung: Jetzt auch lokaler Ordner wählbar"
        ]
      },
      {
        iconName: 'Sliders',
        icon: Sliders,
        title: "UI & Modelle",
        items: [
          "Picker: Optimiertes Design, fixes 'h', 8h Standard-Start",
          "Arbeitszeit: '38,5h 4-Tage' Modell aktualisiert (Mo-Mi 10h)",
          "Benutzerdefiniert: Neuer Slider für Tagesstunden im Wizard"
        ]
      },
      {
        iconName: 'Bug',
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
        iconName: 'Cloud',
        icon: Cloud,
        title: "Google Drive Sync",
        items: [
          "Endlich da: Verbinde dich mit Google Drive für automatische Cloud-Backups",
          "Easy Restore: Stelle deine Daten auf einem neuen Handy direkt aus der Cloud wieder her",
          "Sicherheit: Deine Daten gehören dir – gespeichert in deinem privaten Drive"
        ]
      },
      {
        iconName: 'Rocket',
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
        iconName: 'Download',
        icon: Download,
        title: "System Updates",
        items: [
          "Download-Fix: Updates werden jetzt sicher über den System-Browser geladen"
        ]
      },
      {
        iconName: 'FileText',
        icon: FileText,
        title: "PDF Bericht",
        items: [
          "Soll-Stunden: Berechnung korrigiert (zählt im laufenden Monat nur bis 'Heute')",
          "Layout-Fix: Keine abgeschnittenen Texte mehr bei langen Einträgen",
          "Optik: 'Saldo' und 'Std' sind jetzt perfekt auf einer Linie ausgerichtet",
          "Design: Trennlinien optimiert"
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
        iconName: 'Bug',
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
        iconName: 'Rocket',
        icon: Rocket,
        title: "Onboarding & Modelle",
        items: [
          "Neuer Einrichtungs-Assistent: Begrüßt dich beim Start und richtet die App perfekt auf dich ein",
          "Flexible Arbeitszeit: Wähle zwischen 38,5h (Kogler Standard), 40h oder definiere deine Woche komplett selbst",
          "Wochen-Rechner: Der Assistent zeigt dir live deine Gesamt-Wochenstunden an"
        ]
      },
      {
        iconName: 'Shield',
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
        iconName: 'Timer',
        icon: Timer,
        title: "Live Stempeluhr",
        items: [
          "Endlich da: Drücke einfach auf 'Einstempeln' und die App erfasst deine Zeit live",
          "Neuer 'EIN/AUS' Button: Schwebend unten links, immer erreichbar",
          "Live-Status: Siehe sofort, wie viel Zeit noch fehlt oder ob du schon Überstunden machst"
        ]
      },
      {
        iconName: 'Zap',
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
        iconName: 'Sparkles',
        icon: Sparkles,
        title: "Neue Features",
        items: [
          "Smart Time: Bei neuen Einträgen startet die Zeit automatisch dort, wo der letzte aufgehört hat",
          "Zeitausgleich: Neuer lila Button für ZA (wird korrekt berechnet)",
          "Dashboard: Pause wird jetzt direkt hinter der Zeit angezeigt"
        ]
      },
      {
        iconName: 'FileText',
        icon: FileText,
        title: "PDF & Design",
        items: [
          "PDF-Bericht: Kompaktere Zusammenfassung, ungenutzte Kategorien werden ausgeblendet",
          "DatePicker: Feiertage sind jetzt nur noch durch rote Zahlen markiert (dezenter)"
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
        iconName: 'FileText',
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
        iconName: 'Bug',
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
        iconName: 'Shield',
        icon: Shield,
        title: "Logik & Sicherheit",
        items: [
          "Doppel-Buchungsschutz: Verhindert überlappende Zeiteinträge",
          "Zukunfts-Logik: Feiertage & Stunden werden erst gutgeschrieben, wenn der Tag erreicht ist",
          "OTA-Check: Manueller Update-Prüfer in den Einstellungen"
        ]
      },
      {
        iconName: 'FileText',
        icon: FileText,
        title: "Berichtsvorschau 2.0",
        items: [
          "Monats-Navigation: Wechsle Monate direkt in der Vorschau",
          "Smart-Zoom: PDF passt sich automatisch perfekt an dein Display an",
          "Neuer Dropdown: Schicke Auswahl für Wochen & Monate"
        ]
      },
      {
        iconName: 'Bug',
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
        iconName: 'Sparkles',
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
        iconName: 'Zap',
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
        iconName: 'FileText',
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
        iconName: 'Sparkles',
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
        iconName: 'Zap',
        icon: Zap,
        title: "Technik",
        items: [
          "Upgrade auf neueste Technologie",
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
        iconName: 'Shield',
        icon: Shield,
        title: "Datensicherheit",
        items: [
          "Automatisches Backup: Optional 1x täglich",
          "Offener Speicherort: Dateien landen direkt in 'Dokumente'"
        ]
      },
      {
        iconName: 'Bug',
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
        iconName: 'FileText',
        icon: FileText,
        title: "PDF Bericht V4",
        items: [
          "Neues Design: Zebra-Look & optimiertes Layout",
          "Tages-Saldo: Neue Spalte für Plus/Minus pro Tag",
          "Erweiterte Zusammenfassung mit Soll/Ist Vergleich"
        ]
      },
      {
        iconName: 'Globe',
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
