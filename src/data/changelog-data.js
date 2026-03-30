export const CHANGELOG_DATA = [

  {
  version: "3.0.0",
  date: "30.03.2026",
  title: "Neue Features & Bugfixes 🛠️",
  isMajor: false,
  sections: [
    {
      iconName: 'Zap',
      title: "Verbesserungen",
      items: [
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
    version: "3.0.0",
    date: "30.03.2026",
    title: "Da gro\u00dfe Fr\u00fchjahrs-Stand",
    isMajor: true,
    sections: [
      {
        iconName: "Cloud",
        title: "Backup & Cloud",
        items: [
          "Google Drive, Nextcloud und lokales Backup sind jetzt sauber in der App eingebaut.",
          "Schon im Einrichtungs-Wizard kannst du dein Backup-Ziel gem\u00fctlich verbinden.",
          "Backups und Wiederherstellen greifen jetzt \u00fcberall auf denselben Datenstand zu."
        ]
      },
      {
        iconName: "FileText",
        title: "Stunden & Berichte",
        items: [
          "Die Stundenberechnung l\u00e4uft jetzt \u00fcber eine gemeinsame zentrale Logik.",
          "Dashboard, Berichtsvorschau und PDF ziehen damit dieselben Werte her.",
          "Wochenkarten zeigen Mehrarbeit und \u00dcberstunden jetzt stimmiger an."
        ]
      },
      {
        iconName: "Shield",
        title: "Stabilit\u00e4t",
        items: [
          "Google Drive bleibt auf Android deutlich verl\u00e4sslicher verbunden.",
          "Nextcloud meldet Rate-Limits und Verbindungsprobleme jetzt verst\u00e4ndlicher zur\u00fcck.",
          "Mehrere kleine Kanten in Einstellungen, Backup-Status und Picker wurden gegl\u00e4ttet."
        ]
      }
    ]
  },
  {
    version: "2.5.0",
    date: "28.03.2026",
    title: "Cloud, Privatsph\u00e4re und a gscheite Datenbasis",
    isMajor: false,
    sections: [
      {
        iconName: "Cloud",
        title: "Cloud-Backups",
        items: [
          "Nextcloud ist als eigenes Backup-Ziel dazugekommen.",
          "Google Drive nutzt den gesch\u00fctzten App-Datenbereich statt sichtbarer Dateien.",
          "Der Verbindungsstatus in den Einstellungen ist klarer und einheitlicher geworden."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Alltag in der App",
        items: [
          "Die Einstellungen wurden aufger\u00e4umt und \u00fcbersichtlicher gemacht.",
          "Der Einrichtungsfluss f\u00fchlt sich runder an und nimmt dir mehr Handgriffe ab.",
          "Kleinere UI-Polishes machen die App insgesamt gschmeidiger."
        ]
      }
    ]
  },
  {
    version: "2.2.0",
    date: "26.03.2026",
    title: "SQLite, Anh\u00e4nge und a stabiles Fundament",
    isMajor: false,
    sections: [
      {
        iconName: "FileText",
        title: "Daten & Anh\u00e4nge",
        items: [
          "SQLite ist zur zentralen lokalen Datenbasis geworden.",
          "Anh\u00e4nge und Dokumente k\u00f6nnen an Eintr\u00e4ge geh\u00e4ngt und mitgeteilt werden.",
          "Import und Export sichern jetzt mehr von dem mit, was im Alltag wirklich wichtig ist."
        ]
      },
      {
        iconName: "Rocket",
        title: "Technik",
        items: [
          "Die App arbeitet robuster mit gr\u00f6\u00dferen Datenmengen.",
          "Icons und Build wurden optimiert, damit Start und Paketgr\u00f6\u00dfe sauberer passen.",
          "Interne Datenwege sind konsistenter geworden."
        ]
      }
    ]
  },
  {
    version: "2.0.0",
    date: "23.03.2026",
    title: "Mehr Flexibilit\u00e4t beim Arbeiten",
    isMajor: true,
    sections: [
      {
        iconName: "Sliders",
        title: "Arbeitsalltag",
        items: [
          "Eigene T\u00e4tigkeitscodes und Presets sind dazugekommen.",
          "Die Zeiteingabe wurde feiner und flexibler, je nachdem wie genau du buchen willst.",
          "Ein sofortiger 'Jetzt sichern'-Knopf spart Wartezeit, wenn du selbst sichern magst."
        ]
      },
      {
        iconName: "Clock",
        title: "F\u00fcr neue User",
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
        title: "Stempeln & \u00dcberblick",
        items: [
          "Live-Stempeln ist dazugekommen und macht die t\u00e4gliche Erfassung flotter.",
          "Dashboard und Salden geben dir schneller ein Gef\u00fchl, wo du gerade stehst.",
          "Zeitausgleich, Feiertage und \u00e4hnliche F\u00e4lle wurden sauberer eingebaut."
        ]
      },
      {
        iconName: "FileText",
        title: "Berichte",
        items: [
          "Die PDF-Berichte wurden \u00fcbersichtlicher und hilfreicher aufgebaut.",
          "Monats- und Tageswerte sind besser nachvollziehbar geworden.",
          "Die Vorschau ist n\u00e4her an dem dran, was sp\u00e4ter wirklich exportiert wird."
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
          "Die Basis f\u00fcr Zeiteingabe, Dashboard und Berichte war damit gelegt.",
          "\u00d6sterreichische Feiertage und typische Arbeitsf\u00e4lle wurden von Anfang an mitgedacht.",
          "Die App hat ihren eigenen Stil bekommen und war bereit f\u00fcr den Alltag."
        ]
      }
    ]
  }
];
