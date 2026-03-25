export const CHANGELOG_DATA = [



  {
  version: "6.3.27",
  date: "25.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Zap',
      title: "Code-Qualität",
      items: [
        "Refactor: merge WorkModelSettings into DataSettings, add collapsible UI and improved demo warning",
        "Refactor: Single-Point-of-Truth Versionierung via Vite define",
        "Chore: privacy datum + logo optimiert",
        "Chore: Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "Chore: icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "Refactor: CI Pipeline vereinfacht — nur noch Play Store Deploy"
      ]
    },
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
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
  version: "6.3.26",
  date: "25.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
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
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: Changelog aufgeräumt + Accordion UI [skip ci]",
        "Neu: Deploy-Verifizierung + Telegram-Notification in CI"
      ]
    },
    {
      iconName: 'Zap',
      title: "Code-Qualität",
      items: [
        "Refactor: Single-Point-of-Truth Versionierung via Vite define",
        "Chore: privacy datum + logo optimiert",
        "Chore: Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "Chore: icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "Refactor: CI Pipeline vereinfacht — nur noch Play Store Deploy"
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
  version: "6.3.25",
  date: "25.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: Changelog aufgeräumt + Accordion UI [skip ci]",
        "Neu: Deploy-Verifizierung + Telegram-Notification in CI"
      ]
    },
    {
      iconName: 'Bug',
      title: "Bugfixes",
      items: [
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
      title: "Code-Qualität",
      items: [
        "Refactor: Single-Point-of-Truth Versionierung via Vite define",
        "Chore: privacy datum + logo optimiert",
        "Chore: Dead Code WorkModelModal.jsx entfernt (191 Zeilen, nirgends importiert)",
        "Chore: icon.png und logo.png optimiert (4.4MB→88KB, 1.2MB→89KB)",
        "Refactor: CI Pipeline vereinfacht — nur noch Play Store Deploy"
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
    version: "6.3.24",
    date: "25.03.2026",
    title: "Frühjahrsputz & Stabilität 🧹",
    isMajor: false,
    sections: [
      {
        iconName: "Zap",
        title: "Verbesserungen",
        items: [
          "🖼️ App-Icons massiv verkleinert (schnellerer Download)",
          "📦 App-Größe optimiert",
          "🔄 Update-Check verlinkt jetzt direkt zum Play Store",
          "🧹 Speicher-Optimierung im Hintergrund",
          "🔧 Unter der Haube: Code aufgeräumt für bessere Performance",
          "📐 Icons in den Einstellungen haben jetzt einheitliche Größe"
        ]
      },
      {
        iconName: "Bug",
        title: "Bugfixes",
        items: [
          "⚠️ Backup-Fehler werden jetzt sichtbar angezeigt",
          "☁️ Google Drive Verbindung bleibt jetzt stabiler"
        ]
      }
    ]
  },
  {
    version: "6.3.16",
    date: "24.03.2026",
    title: "Stabilitäts-Update 🛡️",
    isMajor: false,
    sections: [
      {
        iconName: "Shield",
        title: "Bugfixes",
        items: [
          "🛡️ Absturz in den Einstellungen behoben",
          "🛡️ App startet jetzt stabiler auf älteren Android-Geräten",
          "🛡️ Robustere Datenverarbeitung (keine Abstürze bei fehlerhaften Daten)",
          "🔍 Bessere Fehlermeldungen bei unerwarteten Problemen"
        ]
      }
    ]
  },
  {
    version: "6.3.5",
    date: "23.03.2026",
    title: "Changelog & Demo-Daten 📋",
    isMajor: false,
    sections: [
      {
        iconName: "Sparkles",
        title: "Neue Features",
        items: [
          "📋 Neues Änderungsprotokoll direkt in der App",
          "🧪 Demo-Daten zum Ausprobieren im Onboarding",
          "⏱️ Minuten-Eingabe jetzt auch im Arbeitszeit-Modell einstellbar"
        ]
      },
      {
        iconName: "Zap",
        title: "Verbesserungen",
        items: [
          "🚀 Changelog wird erst geladen wenn du ihn öffnest (schnellerer App-Start)",
          "📂 Einstellungen übersichtlicher gruppiert"
        ]
      }
    ]
  },
  {
    version: "6.3.2",
    date: "23.03.2026",
    title: "Backup verbessert 🛡️",
    isMajor: false,
    sections: [
      {
        iconName: "Cloud",
        title: "Backup",
        items: [
          "💾 Neuer 'Jetzt sichern'-Button für sofortiges Backup",
          "🕐 Letztes Backup wird angezeigt ('vor X Min./Std.')",
          "📡 Offline-Warnung wenn Google Drive nicht erreichbar"
        ]
      }
    ]
  },
  {
    version: "6.3.0",
    date: "23.03.2026",
    title: "Minütige Zeiteingabe & neue Features ⚡",
    isMajor: false,
    sections: [
      {
        iconName: "Zap",
        title: "Neue Features",
        items: [
          "⏱️ Minuten-genaue Zeiteingabe (1-Min statt 15-Min Schritte) — umschaltbar in Einstellungen & Onboarding",
          "🧪 Demo-Daten direkt im Onboarding oder in den Entwickler-Optionen laden",
          "💾 Export/Import sichert jetzt auch Tätigkeitscodes mit"
        ]
      },
      {
        iconName: "Shield",
        title: "Verbesserungen",
        items: [
          "🔒 Preset laden fragt jetzt vorher nach Bestätigung",
          "🎨 Design-Konsistenz: Fahrzeit-Button angepasst"
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
        iconName: "Shield",
        title: "Backup-System",
        items: [
          "🔧 Auto-Backup funktioniert jetzt zuverlässig auf allen Android-Versionen",
          "🔓 Keine 'Permission Denied' Fehler mehr nach App-Neuinstallation",
          "⚡ Interner Speicher für Auto-Backup (stabiler & schneller)"
        ]
      },
      {
        iconName: "Bug",
        title: "Bugfixes",
        items: [
          "🛑 Hintergrund scrollt nicht mehr wenn Tätigkeitscodes-Modal offen ist",
          "📄 Eindeutige Dateinamen mit Zeitstempel (verhindert Überschreib-Konflikte)"
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
        iconName: "Sliders",
        title: "Tätigkeitscodes anpassbar",
        items: [
          "✏️ Eigene Tätigkeitscodes erstellen, bearbeiten und löschen",
          "📦 Presets: Wähle zwischen 'Kogler', 'Allgemein' oder starte leer",
          "⚡ Quick-Add: Neue Codes direkt im Eintragsformular hinzufügen",
          "⚙️ Code-Verwaltung: Neuer Bereich in den Einstellungen"
        ]
      },
      {
        iconName: "Zap",
        title: "Verbesserungen",
        items: [
          "🆕 Neue User starten mit 'Allgemein' Preset als Standard",
          "🔄 Bestehende User behalten ihre gewohnten Kogler-Codes",
          "❤️ Footer: Developed with ❤️ by Markus Kainer & Claude"
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
        iconName: "Sparkles",
        title: "Neues Design",
        items: [
          "📄 Paper-Look: Ein frisches, technisches Grau (Anthrazit) ersetzt das alte Blau-Grau.",
          "💚 Emerald-Green: Das neue, satte Grün sorgt für bessere Lesbarkeit und modernen Look.",
          "🎨 Konsistenz: Alle Menüs, Popups und Auswahl-Listen wurden an das neue Design angepasst."
        ]
      },
      {
        iconName: "Building2",
        title: "Neutral & Flexibel",
        items: [
          "🏢 Deine Firma: Du kannst jetzt in den Einstellungen deinen eigenen Firmennamen hinterlegen.",
          "📝 PDF-Bericht: Der Stundenzettel ist nun neutral und zeigt deinen Firmennamen im Header an.",
          "🏷️ White-Label: Keine fixen Firmen-Brandings mehr – die App gehört dir."
        ]
      },
      {
        iconName: "Shield",
        title: "Android & System",
        items: [
          "🎭 Themed Icons: Das App-Icon passt sich jetzt (ab Android 13) farblich deinem Homescreen an.",
          "🌙 Optimierter Dark Mode: Bessere Kontraste für augenschonendes Arbeiten bei Nacht."
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
        iconName: "Shield",
        title: "Play Store Release",
        items: [
          "🏪 Konfiguration für geschlossenen Testtrack vorbereitet",
          "📦 Optimierung des Build-Prozesses für den Play Store",
          "🔢 Anpassung der Versions-Strings für Google Play Konformität"
        ]
      },
      {
        iconName: "Sparkles",
        title: "Verbesserungen",
        items: [
          "⚡ Interne Performance-Optimierungen beim Laden der Dashboard-Stats",
          "🎞️ Stabilitätsfix für Animationen bei schnellen Ansichtswechseln"
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
        iconName: "Rocket",
        title: "Neues Onboarding",
        items: [
          "🚀 Start-Screen: Wahl zwischen 'Neu' und 'Backup laden'",
          "👤 Profil: Feld für Tätigkeit/Anstellung ist zurück",
          "💾 Backup-Einrichtung: Jetzt auch lokaler Ordner wählbar"
        ]
      },
      {
        iconName: "Sliders",
        title: "UI & Modelle",
        items: [
          "🎨 Picker: Optimiertes Design, fixes 'h', 8h Standard-Start",
          "🕐 Arbeitszeit: '38,5h 4-Tage' Modell aktualisiert (Mo-Mi 10h)",
          "🔧 Benutzerdefiniert: Neuer Slider für Tagesstunden im Wizard"
        ]
      },
      {
        iconName: "Bug",
        title: "Wichtige Fixes",
        items: [
          "🛡️ Crash beim Start (Google Drive Init) behoben",
          "🔄 Restore-Probleme (Format & Token) gefixt",
          "👁️ Header wird im Wizard nun korrekt ausgeblendet"
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
        iconName: "Cloud",
        title: "Google Drive Sync",
        items: [
          "☁️ Endlich da: Verbinde dich mit Google Drive für automatische Cloud-Backups",
          "📱 Easy Restore: Stelle deine Daten auf einem neuen Handy direkt aus der Cloud wieder her",
          "🔒 Sicherheit: Deine Daten gehören dir – gespeichert in deinem privaten Drive"
        ]
      },
      {
        iconName: "Rocket",
        title: "Neuer Start",
        items: [
          "🧙 Komplett überarbeiteter Einrichtungs-Assistent (Onboarding)",
          "🔀 Wahlmöglichkeit beim Start: 'Neu beginnen' oder 'Backup laden'",
          "⚙️ Verbesserte UI in den Einstellungen für Account & Backup"
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
        iconName: "Download",
        title: "System Updates",
        items: [
          "📥 Download-Fix: Updates werden jetzt sicher über den System-Browser geladen"
        ]
      },
      {
        iconName: "FileText",
        title: "PDF Bericht",
        items: [
          "📊 Soll-Stunden: Berechnung korrigiert (zählt im laufenden Monat nur bis 'Heute')",
          "📐 Layout-Fix: Keine abgeschnittenen Texte mehr bei langen Einträgen",
          "📏 Optik: 'Saldo' und 'Std' sind jetzt perfekt auf einer Linie ausgerichtet",
          "➖ Design: Trennlinien optimiert (keine Striche mehr zwischen Einträgen am selben Tag)"
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
        iconName: "Bug",
        title: "Korrekturen",
        items: [
          "🔢 Korrektur der internen Versionsnummerierung für reibungslose Updates",
          "✨ Kleine Optimierungen am Onboarding-Prozess"
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
        iconName: "Rocket",
        title: "Onboarding & Modelle",
        items: [
          "🧙 Neuer Einrichtungs-Assistent: Begrüßt dich beim Start und richtet die App perfekt auf dich ein",
          "⏰ Flexible Arbeitszeit: Wähle zwischen 38,5h (Kogler Standard), 40h oder definiere deine Woche komplett selbst",
          "📊 Wochen-Rechner: Der Assistent zeigt dir live deine Gesamt-Wochenstunden an"
        ]
      },
      {
        iconName: "Shield",
        title: "Logik & Sicherheit",
        items: [
          "🔔 Auto-Checkout: Vergessen auszustempeln? Die App beendet den Tag beim nächsten Start automatisch um 23:59",
          "🕐 Zeitzonen-Fix: Die Live-Uhr arbeitet jetzt präzise mit deiner lokalen Gerätezeit",
          "🔄 Smart Migration: Bestehende User werden sanft auf das neue Datensystem umgestellt"
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
        iconName: "Timer",
        title: "Live Stempeluhr",
        items: [
          "⏱️ Endlich da: Drücke einfach auf 'Einstempeln' und die App erfasst deine Zeit live",
          "🔘 Neuer 'EIN/AUS' Button: Schwebend unten links, immer erreichbar",
          "📊 Live-Status: Siehe sofort, wie viel Zeit noch fehlt oder ob du schon Überstunden machst"
        ]
      },
      {
        iconName: "Zap",
        title: "Workflow",
        items: [
          "🔄 Auto-Rundung: Zeiten werden im Hintergrund kaufmännisch auf 15 Minuten geglättet",
          "✨ Smart-Entry: Gestoppte Zeiten landen direkt fix und fertig im Formular"
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
        iconName: "Sparkles",
        title: "Neue Features",
        items: [
          "🧠 Smart Time: Bei neuen Einträgen startet die Zeit automatisch dort, wo der letzte aufgehört hat",
          "🟣 Zeitausgleich: Neuer lila Button für ZA (wird korrekt berechnet)",
          "⏸️ Dashboard: Pause wird jetzt direkt hinter der Zeit angezeigt"
        ]
      },
      {
        iconName: "FileText",
        title: "PDF & Design",
        items: [
          "📄 PDF-Bericht: Kompaktere Zusammenfassung, ungenutzte Kategorien werden ausgeblendet",
          "📅 DatePicker: Feiertage sind jetzt nur noch durch rote Zahlen markiert (dezenter)"
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
        iconName: "FileText",
        title: "PDF Bericht",
        items: [
          "📐 Layout optimiert: Perfektes A4-Format ohne leere Seiten",
          "📝 Notiz-Funktion: Füge persönliche Anmerkungen zum Bericht hinzu",
          "🔤 Design: Größere Schrift & verbesserte Lesbarkeit",
          "📅 Intelligente Datumsanzeige: Tag wird bei Mehrfach-Einträgen gruppiert"
        ]
      },
      {
        iconName: "Bug",
        title: "Fixes",
        items: [
          "🔧 Export-Fehler 'EACCESS' auf Android behoben",
          "✅ Druck-Statusmeldung korrigiert"
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
        iconName: "Shield",
        title: "Logik & Sicherheit",
        items: [
          "🚫 Doppel-Buchungsschutz: Verhindert überlappende Zeiteinträge",
          "📅 Zukunfts-Logik: Feiertage & Stunden werden erst gutgeschrieben, wenn der Tag erreicht ist",
          "🔄 OTA-Check: Manueller Update-Prüfer in den Einstellungen"
        ]
      },
      {
        iconName: "FileText",
        title: "Berichtsvorschau 2.0",
        items: [
          "📅 Monats-Navigation: Wechsle Monate direkt in der Vorschau",
          "🔍 Smart-Zoom: PDF passt sich automatisch perfekt an dein Display an",
          "📋 Neuer Dropdown: Schicke Auswahl für Wochen & Monate"
        ]
      },
      {
        iconName: "Bug",
        title: "Fixes & UI",
        items: [
          "📱 iPhone Fix: 'Neuer Eintrag'-Button ist jetzt immer klickbar",
          "📐 Safe-Area: Menüs werden unten nicht mehr abgeschnitten",
          "🖱️ Drawer-Scroll Fix: Zeitwahl schließt sich nicht mehr versehentlich beim Scrollen"
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
        iconName: "Sparkles",
        title: "Look & Feel",
        items: [
          "🎞️ High-End Animationen (Seitenübergänge, Listen)",
          "📳 Haptisches Feedback (Vibrationen bei Interaktionen)",
          "👆 Swipe-to-Delete: Einträge einfach nach links wischen",
          "🕐 TimePicker: Zeitwahl aktualisiert sich direkt beim Scrollen"
        ]
      },
      {
        iconName: "Zap",
        title: "Workflow & Speed",
        items: [
          "📋 Magic Copy: Neuer 'Wie zuletzt'-Button im Formular",
          "🔤 Autocomplete: Projekt-Vorschläge beim Tippen",
          "🚀 Massive Performance-Optimierung (Lazy Loading)",
          "⚡ App-Startzeit drastisch verkürzt"
        ]
      },
      {
        iconName: "FileText",
        title: "PDF Bericht 2.0",
        items: [
          "📸 Profilfoto im Header (automatisch rechtsbündig)",
          "📐 Layout-Fix: Keine leeren Seiten mehr",
          "🖼️ Vorschau öffnet sich als schickes Overlay"
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
        iconName: "Sparkles",
        title: "Neue Features & UI",
        items: [
          "🌙 Dark Mode: Unterstützung für Hell, Dunkel und System",
          "📱 Custom Drawers: Moderne Slide-Up Menüs statt nativer Auswahl",
          "📅 Smart DatePicker: Neuer Kalender mit Zebra-Look & großen Flächen",
          "🔔 Verbesserte UX: Toasts statt nerviger Alerts",
          "🧠 Smart Defaults: Merkt sich die letzte Tätigkeit"
        ]
      },
      {
        iconName: "Zap",
        title: "Technik",
        items: [
          "🔧 Komplettes Refactoring in modulare Komponenten",
          "🎨 Upgrade auf moderne CSS-Engine",
          "📱 Android Splash Screen: Weißes Aufblitzen entfernt"
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
        iconName: "Shield",
        title: "Datensicherheit",
        items: [
          "💾 Automatisches Backup: Optional 1x täglich",
          "📂 Offener Speicherort: Dateien landen direkt in 'Dokumente'"
        ]
      },
      {
        iconName: "Bug",
        title: "Fixes",
        items: [
          "📄 Robuster PDF-Export (Zeitstempel in Dateinamen)",
          "📁 Verbesserter Zugriff auf das Dateisystem"
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
        iconName: "FileText",
        title: "PDF Bericht V4",
        items: [
          "📄 Neues Design: Zebra-Look & optimiertes Layout",
          "📊 Tages-Saldo: Neue Spalte für Plus/Minus pro Tag",
          "📋 Erweiterte Zusammenfassung mit Soll/Ist Vergleich"
        ]
      },
      {
        iconName: "Globe",
        title: "Logik",
        items: [
          "🇦🇹 Intelligente Feiertage (automatische Erkennung Österreich)",
          "🚗 Differenzierte Fahrtzeiten: Anreise (bezahlt) vs. Fahrt (unbezahlt)",
          "💰 Unbezahlte Zeiten werden separat ausgewiesen"
        ]
      }
    ]
  }
];
