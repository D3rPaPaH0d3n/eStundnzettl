export const CHANGELOG_DATA = [

  {
  version: "3.0.1",
  date: "30.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Zap',
      title: "Verbesserungen",
      items: [
        "release metadata for v3.0.0 [skip ci]",
        "release metadata for v7.0.1 [skip ci]",
        "release metadata for v7.0.0-beta.1 [skip ci]",
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
      iconName: 'FileText',
      title: "Dokumentation",
      items: [
        "Docs: README CI Hinweis [test]"
      ]
    }
  ]
  },
  {
    version: "3.0.1",
    date: "30.03.2026",
    title: "Weniger Ballast, a bissl flotter",
    isMajor: false,
    sections: [
      {
        iconName: "Rocket",
        title: "Performance",
        items: [
          "Die App startet schlanker, weil schwere Bereiche jetzt später geladen werden.",
          "Dashboard, Einstellungen und PDF ziehen sich unnötigen Ballast nicht mehr sofort mit.",
          "Ein paar Rechenwege im Hintergrund laufen jetzt ruhiger und effizienter."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Feinschliff",
        items: [
          "Die Changelog-Ansicht ist leichter geworden und schleppt nicht mehr die ganze Icon-Bibliothek mit.",
          "Kleinere Render-Bremsen in Wochenkarten und Hilfsansichten wurden geglättet."
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
