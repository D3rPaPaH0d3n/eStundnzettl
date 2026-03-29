import { Sparkles, Zap, FileText, Shield, Bug, Globe, Clock, Timer, Rocket, Sliders, Download, Cloud, Building2, Lock, Database, Smartphone, CheckCircle, AlertTriangle, Users, Palette, RefreshCw } from "lucide-react";

export const CHANGELOG_DATA = [

  {
  version: "7.0.0-beta.1",
  date: "29.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Sparkles',
      title: "Neue Features",
      items: [
        "Neu: natives Google-Drive-Backup ohne spontanen Login",
        "Neu: Version 7.0.0 — Nextcloud Privacy Update + Changelog aufgeräumt [skip ci]",
        "Neu: Nextcloud Backup im Einrichtungs-Wizard",
        "Neu: Copy-Button für Debug-Panel",
        "Neu: Live Debug-Panel für Nextcloud + Bug 1 Fix",
        "Neu: Nextcloud Login Flow v2 — Ein-Klick Verbindung",
        "Neu: Changelog für v6.6.0 — Nextcloud Backup 🔒☁️",
        "Neu: Nextcloud Backup-Unterstützung",
        "Neu: localStorage komplett entfernt — nur noch SQLite für Android",
        "Neu: SQLite als Hauptspeicher fertig verdrahtet",
        "Neu: vollständige SQLite-Migration — Dual-Write entfernt, Backup/Import auf SQLite umgestellt",
        "Neu: Versionssprung auf 6.4.0 und Changelog aufräumen",
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
        "Fix: Nextcloud Storage-Keys im Wizard korrigiert",
        "Fix: WebDAV-Requests auf OkHttp umgestellt — MKCOL funktioniert jetzt",
        "Fix: WebDAV MKCOL nativ korrekt senden",
        "Fix: Nextcloud MKCOL mit Trailing Slash reparieren",
        "Fix: Nextcloud testweise direkt in WebDAV-Root hochladen",
        "Fix: Nextcloud WebDAV-Pfad + testConnection Bug",
        "Fix: Resolve echte User-ID via OCS API für WebDAV-Pfad",
        "Fix: WebDAV-Methoden (MKCOL, PROPFIND) im nativen Plugin",
        "Fix: Nextcloud WebDAV über natives Android-Plugin statt fetch()",
        "Fix: CapacitorHttp für Nextcloud-Upload, kein Google-Login ohne Verbindung",
        "Fix: Backup-Erfolgsmeldung zeigt jetzt korrekten Status pro Ziel",
        "Fix: Nextcloud Login Flow Lifecycle für Android",
        "Fix: Nextcloud-Credentials werden jetzt robust gespeichert",
        "Fix: Nextcloud Login — Browser schließt jetzt automatisch nach erfolgreicher Auth",
        "Fix: fehlender motion-Import im OnboardingWizard — App crasht nicht mehr bei Erstinstallation",
        "Fix: Nextcloud Login Flow läuft nativ auf Android",
        "Fix: Nextcloud Login Flow nutzt natives HTTP auf Android",
        "Fix: Android Network Security Config — erlaubt HTTP/HTTPS zu allen Domains",
        "Fix: Nextcloud Login Flow v2 — bessere URL-Validierung & Fehlermeldungen",
        "Fix: Google Token-Refresh bei jedem App-Öffnen",
        "Fix: Google Drive Auth bleibt jetzt dauerhaft verbunden",
        "Fix: Props-Mismatch behoben — autoBackup/setAutoBackup korrekt weitergeleitet",
        "Fix: play-services-auth explizit als Dependency deklariert",
        "Fix: catch-Block räumt partiellen State nach Fehler auf",
        "Fix: triggerManualBackup liest Daten aus SQLite statt localStorage",
        "Fix: 5 Bugs aus Migrationsanalyse behoben",
        "Fix: JSON-Backup-Restore mit SQLite-Integration (WorkCodes, Attachments, Labels)",
        "Fix: onboarding and data settings improvements",
        "Fix: applyBackup korrekt awaiten nach async-Umstellung",
        "Fix: Workflow-Syntax für Release-Version korrigieren",
        "Fix: Version nur noch manuell erhöhen",
        "Fix: Versionsquellen wieder konsistent machen",
        "Fix: Versionsstand wieder auf 6.4.0 angleichen",
        "Fix: Auto-Bump nur noch manuell auslösen",
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
        "Debug-Konsole und Logs entfernen",
        "release metadata for v6.6.0 [skip ci]",
        "release metadata for v6.6.0 [skip ci]",
        "release metadata for v6.6.0 [skip ci]",
        "release metadata for v6.6.0 [skip ci]",
        "release metadata for v6.6.0 [skip ci]",
        "release metadata for v6.6.0 [skip ci]",
        "Changelog für v6.5.0 aktualisiert — SQLite-Migration abgeschlossen",
        "Onboarding-Debug-Logs entfernen (Konflikt gelöst)",
        "release metadata for v6.4.0 [skip ci]",
        "release metadata for v6.4.0 [skip ci]",
        "Restdaten und Backup-Metadaten an SQLite anbinden",
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
    version: "7.0.0",
    date: "28.03.2026",
    title: "Nextcloud Privacy Update 🔒☁️",
    isMajor: true,
    sections: [
      {
        iconName: 'Cloud',
        title: "Nextcloud-Integration",
        items: [
          "Nextcloud als Backup-Ziel — deine Daten auf deinem eigenen Server",
          "Direkt im Einrichtungs-Wizard: Nextcloud sofort einrichten",
          "Login Flow v2 — sicher und ohne Passwort-Eingabe in der App",
          "Auch beim Wiederherstellen: Backup direkt aus Nextcloud laden"
        ]
      },
      {
        iconName: 'Database',
        title: "SQLite-Speicher",
        items: [
          "Alle Daten werden jetzt lokal in SQLite gespeichert",
          "Schneller, stabiler und zuverlässiger als localStorage",
          "Backup & Import nutzen SQLite als Source of Truth"
        ]
      },
      {
        iconName: 'Zap',
        title: "Verbesserungen",
        items: [
          "Einstellungen vereinfacht und übersichtlicher",
          "App-Icons optimiert — weniger Speicher, schnellerer Start",
          "Google Drive Token wird automatisch erneuert"
        ]
      },
      {
        iconName: 'Bug',
        title: "Bugfixes",
        items: [
          "App startet jetzt zuverlässig nach Einrichtung",
          "Backup-Status zeigt korrekten Stand pro Ziel",
          "Google Drive bleibt dauerhaft verbunden",
          "JSON-Restore funktioniert mit SQLite-Integration"
        ]
      }
    ]
  },
  {
    version: "6.4.0",
    date: "26.03.2026",
    title: "Großes Daten-Update mit SQLite 🗃️",
    isMajor: true,
    sections: [
      {
        iconName: 'Database',
        title: "Neue Datenbank-Architektur",
        items: [
          "SQLite als Hauptspeicher für Android — stabiler und schneller",
          "Backup & Import nutzen jetzt SQLite als Source of Truth"
        ]
      },
      {
        iconName: 'FileText',
        title: "Dokumente & Anhänge",
        items: [
          "Dokumente direkt an Einträge anhängen (PDF, Bilder)",
          "PDF-Berichte zusammen mit allen Anhängen teilen"
        ]
      },
      {
        iconName: 'Shield',
        title: "Sicherheit & Stabilität",
        items: [
          "Backup-Fehler werden sichtbar gemacht mit Warnzähler",
          "Edge-to-Edge Display für Android 15+ Kompatibilität"
        ]
      },
      {
        iconName: 'Rocket',
        title: "Performance",
        items: [
          "App-Icons optimiert (MB → ~90KB) — weniger Speicher",
          "Proguard aktiviert — kleinere APK-Größe"
        ]
      }
    ]
  },
  {
    version: "6.3.5",
    date: "23.03.2026",
    title: "Minütige Zeiteingabe & Backup-Button ⏱️",
    isMajor: false,
    sections: [
      {
        iconName: 'Clock',
        title: "Zeiteingabe",
        items: [
          "Minütige Zeiteingabe (1-Minuten-Modus) in Einstellungen umschaltbar",
          "Standard bleibt 15-Minuten-Schritte für schnelle Eingabe"
        ]
      },
      {
        iconName: 'Cloud',
        title: "Backup",
        items: [
          "'Jetzt sichern'-Button für sofortiges Backup (Google Drive + Lokal)",
          "Letztes Backup wird mit Zeitstempel angezeigt",
          "Offline-Warnung bei abgelaufenem Google Drive Token"
        ]
      },
      {
        iconName: 'Users',
        title: "Onboarding",
        items: [
          "Demo-Daten direkt im Onboarding ausprobieren",
          "Export/Import sichert jetzt auch Tätigkeitscodes mit"
        ]
      }
    ]
  },
  {
    version: "6.3.0",
    date: "23.03.2026",
    title: "Flexible Tätigkeitscodes & Presets 🏷️",
    isMajor: false,
    sections: [
      {
        iconName: 'Sliders',
        title: "Tätigkeitscodes",
        items: [
          "Eigene Codes erstellen, bearbeiten und löschen",
          "Presets: 'Kogler', 'Allgemein' oder leer starten",
          "Quick-Add: Neue Codes direkt im Eintragsformular hinzufügen"
        ]
      },
      {
        iconName: 'Shield',
        title: "Datensicherheit",
        items: [
          "Tätigkeitscodes werden bei Export/Import mitgesichert",
          "Preset laden mit Bestätigungsdialog"
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
        title: "Tätigkeitscodes anpassbar",
        items: [
          "Eigene Tätigkeitscodes erstellen, bearbeiten und löschen",
          "Presets: Wähle zwischen 'Kogler', 'Allgemein' oder starte leer",
          "Code-Verwaltung: Neuer Bereich in den Einstellungen"
        ]
      },
      {
        iconName: 'Users',
        title: "Für neue User",
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
        iconName: 'Palette',
        title: "Neues Design",
        items: [
          "Paper-Look: Frisches, technisches Grau (Anthrazit) ersetzt das alte Blau-Grau",
          "Emerald-Green: Satte Akzentfarbe für bessere Lesbarkeit",
          "Alle Menüs, Popups und Listen an das neue Design angepasst"
        ]
      },
      {
        iconName: 'Building2',
        title: "Neutral & Flexibel",
        items: [
          "Eigener Firmenname in den Einstellungen hinterlegbar",
          "PDF-Bericht zeigt deinen Firmennamen im Header — White-Label",
          "Keine fixen Firmen-Brandings mehr — die App gehört dir"
        ]
      },
      {
        iconName: 'Smartphone',
        title: "Android & System",
        items: [
          "Themed Icons: App-Icon passt sich (ab Android 13) deinem Homescreen an",
          "Optimierter Dark Mode: Bessere Kontraste für nächtliches Arbeiten"
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
        title: "Neues Onboarding",
        items: [
          "Start-Screen: Wahl zwischen 'Neu' und 'Backup laden'",
          "Profil: Feld für Tätigkeit/Anstellung ist zurück",
          "Backup-Einrichtung: Jetzt auch lokaler Ordner wählbar"
        ]
      },
      {
        iconName: 'Clock',
        title: "Zeitauswahl",
        items: [
          "Picker: Optimiertes Design, fixes 'h', 8h Standard-Start",
          "Arbeitszeit: '38,5h 4-Tage' Modell aktualisiert (Mo-Mi 10h)",
          "Benutzerdefiniert: Slider für Tagesstunden im Wizard"
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
        title: "Google Drive Sync",
        items: [
          "Verbinde dich mit Google Drive für automatische Cloud-Backups",
          "Easy Restore: Stelle Daten auf neuem Handy direkt aus der Cloud wieder her",
          "Deine Daten gehören dir — gespeichert in deinem privaten Drive"
        ]
      },
      {
        iconName: 'Users',
        title: "Neuer Start",
        items: [
          "Überarbeiteter Einrichtungs-Assistent (Onboarding)",
          "Wahl beim Start: 'Neu beginnen' oder 'Backup laden'",
          "Verbesserte UI in Einstellungen für Account & Backup"
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
        title: "Onboarding & Modelle",
        items: [
          "Neuer Einrichtungs-Assistent richtet die App perfekt auf dich ein",
          "Flexible Arbeitszeit: 38,5h (Kogler), 40h oder komplett selbst definieren",
          "Wochen-Rechner zeigt live deine Gesamt-Wochenstunden"
        ]
      },
      {
        iconName: 'Shield',
        title: "Logik & Sicherheit",
        items: [
          "Auto-Checkout: Vergessen auszustempeln? App beendet den Tag automatisch um 23:59",
          "Zeitzonen-Fix: Live-Uhr arbeitet präzise mit deiner lokalen Gerätezeit",
          "Smart Migration: Bestehende User werden sanft umgestellt"
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
        title: "Live Stempeluhr",
        items: [
          "Einfach auf 'Einstempeln' drücken — App erfasst deine Zeit live",
          "Neuer 'EIN/AUS' Button: Schwebend unten links, immer erreichbar",
          "Live-Status: Sieh sofort, wie viel Zeit noch fehlt oder ob du Überstunden machst"
        ]
      },
      {
        iconName: 'Zap',
        title: "Workflow",
        items: [
          "Auto-Rundung: Zeiten werden im Hintergrund auf 15 Minuten geglättet",
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
        title: "Neue Features",
        items: [
          "Smart Time: Neue Einträge starten automatisch dort, wo der letzte aufgehört hat",
          "Zeitausgleich: Neuer lila Button für ZA (wird korrekt berechnet)",
          "Dashboard: Pause wird direkt hinter der Zeit angezeigt"
        ]
      },
      {
        iconName: 'FileText',
        title: "PDF & Design",
        items: [
          "PDF-Bericht: Kompaktere Zusammenfassung, ungenutzte Kategorien ausgeblendet",
          "DatePicker: Feiertage nur noch durch rote Zahlen markiert (dezenter)"
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
        title: "Logik & Sicherheit",
        items: [
          "Doppel-Buchungsschutz: Verhindert überlappende Zeiteinträge",
          "Zukunfts-Logik: Feiertage & Stunden werden erst gutgeschrieben, wenn der Tag erreicht ist",
          "OTA-Check: Manueller Update-Prüfer in den Einstellungen"
        ]
      },
      {
        iconName: 'FileText',
        title: "Berichtsvorschau 2.0",
        items: [
          "Monats-Navigation: Wechsle Monate direkt in der Vorschau",
          "Smart-Zoom: PDF passt sich automatisch perfekt an dein Display an",
          "Neuer Dropdown: Schicke Auswahl für Wochen & Monate"
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
        title: "Look & Feel",
        items: [
          "High-End Animationen bei Seitenübergängen und Listen",
          "Haptisches Feedback (Vibrationen bei Interaktionen)",
          "Swipe-to-Delete: Einträge einfach nach links wischen",
          "TimePicker aktualisiert sich direkt beim Scrollen"
        ]
      },
      {
        iconName: 'Zap',
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
        iconName: 'Palette',
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
        iconName: 'Smartphone',
        title: "Technik",
        items: [
          "Upgrade auf neueste Technologie",
          "Android Splash Screen: Weißes Aufblitzen entfernt"
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
        title: "PDF Bericht V4",
        items: [
          "Neues Design: Zebra-Look & optimiertes Layout",
          "Tages-Saldo: Neue Spalte für Plus/Minus pro Tag",
          "Erweiterte Zusammenfassung mit Soll/Ist Vergleich"
        ]
      },
      {
        iconName: 'Globe',
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
