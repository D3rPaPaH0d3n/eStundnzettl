/**
 * Englische Übersetzung des Changelog.
 *
 * Ansatz: Neu übersetzte Versionen stehen in TRANSLATED_EN; alle
 * anderen Versionen werden aus der deutschen Datei durchgereicht,
 * damit Reihenfolge (neueste zuerst) und Icon-Referenzen erhalten
 * bleiben. Zu übersetzen sind nur die Text-Felder (`title` auf
 * Version- und Section-Ebene plus `items[]`); `iconName`, `version`,
 * `date` und `isMajor` bleiben unverändert.
 *
 * Sessions:
 *   E1b.1 (dieser Commit): v4.1.0, v4.0.1, v4.0.0
 *   E1b.2 folgend:         v3.6.0, v3.5.0, v3.4.0
 *   E1b.3 folgend:         v3.3.0, v3.2.1, v3.2.0, v3.1.1
 *   E1b.4 folgend:         v3.0.x, v2.x, v1.x
 */
import { CHANGELOG_DATA_DE } from "./changelog-data.de";

const TRANSLATED_EN = [
  {
    version: "4.2.0",
    date: "13.04.2026",
    title: "English support arrives 🌐",
    isMajor: false,
    sections: [
      {
        iconName: "Globe",
        title: "The app now speaks English too",
        items: [
          "Full English UI — from dashboard to settings to the PDF report.",
          "Switch live in Settings → Language — tap once, everything adapts.",
          "On first launch the app auto-detects your device language — German or English."
        ]
      },
      {
        iconName: "Sliders",
        title: "Dates and numbers follow the language",
        items: [
          "Date formats, calendar and time picker automatically switch to the active language.",
          "The PDF timesheet now also carries whichever language you picked."
        ]
      },
      {
        iconName: "BookOpen",
        title: "Changelog & Play Store bilingual",
        items: [
          "The full version history inside the app is now available in English too.",
          "Google Play and the GitHub README are prepared in both languages as well."
        ]
      },
      {
        iconName: "Shield",
        title: "Under the hood",
        items: [
          "Around 900 translatable strings, three new safety tests that catch missing translations early.",
          "Device language detection and language persistence run cleanly via localStorage.",
          "Nothing changes for existing users — German stays the default."
        ]
      }
    ]
  },
  {
    version: "4.1.0",
    date: "12.04.2026",
    title: "Calculation logic toolkit & Switzerland 🧰",
    isMajor: true,
    sections: [
      {
        iconName: "Calculator",
        title: "Custom plan — set your own calculation rules",
        items: [
          "New fourth option at first launch: \"Custom plan\". Build your own time calculation from scratch — overtime mode, sick rules, holidays, half-days, everything individually configurable.",
          "Anyone picking Austria, Germany or Switzerland still gets the rules automatically as before and skips the toolkit entirely. No extra effort for standard users.",
          "New overtime modes: \"No distinction\" (balance only), \"Separate extra hours & overtime\" (with a freely chosen threshold) or \"All is overtime\".",
          "Sick on a workday: three modes — \"Fill up to daily target\" (AT/DE), \"Count in addition\" or \"Ignore\".",
          "Holiday + work on the same day: three modes — \"Count in addition\", \"Count as overtime\" or \"Only fill up to daily target\"."
        ]
      },
      {
        iconName: "Globe",
        title: "Switzerland: 26 cantons with holidays",
        items: [
          "Switzerland is now a fully supported locale — with all 26 cantons and their individual holidays (Catholic/Protestant, Geneva's Jeûne genevois, Glarus' Näfelser Fahrt, Berchtoldstag and more).",
          "ArG labor rules: overtime from 45h/week, half-days on Dec 24 and Dec 31, sick-leave cap at daily target.",
          "Canton picker in onboarding and settings — same UX as the German state picker."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Holiday import: Orthodox & Islamic",
        items: [
          "In the \"Custom plan\" toolkit you can now import Orthodox holidays (with a correct Julian Easter calendar) and Islamic holidays (Ramadan, Eid al-Fitr, Eid al-Adha and more) alongside AT/DE/CH.",
          "Islamic dates are stored for 2024–2035, beyond that they're astronomically approximated (±1–2 days disclaimer)."
        ]
      },
      {
        iconName: "Palmtree",
        title: "Vacation days tracking",
        items: [
          "Vacation allowance now adapts automatically to the country: AT = 25 days, DE = 20 days, CH = 20 days.",
          "New \"Remaining / carryover\" field for days from the previous year or already used days at initial setup.",
          "The PDF report now shows a vacation balance in the footer: allowance, carryover, taken and remaining — green when positive, red when depleted."
        ]
      },
      {
        iconName: "Sliders",
        title: "Settings & UI improvements",
        items: [
          "New \"Calculation\" settings section — visible to all users, collapsible. Lets you change the overtime rule, sick mode, holidays, half-days, auto-breaks and vacation allowance later.",
          "Break input: the 30-min button now opens a real time picker (same look as start/end) with 15-minute steps or minute-accurate in power-user mode.",
          "Holidays and half-days are now shown in the German DD.MM. format in the UI (internally still MM-DD).",
          "\"Standard hours\" removed from the PDF — it was redundant with actual minus extra/overtime.",
          "Changing the locale in settings now asks via dialog whether the calculation rules should be reset."
        ]
      },
      {
        iconName: "Shield",
        title: "Stability & backwards compatibility",
        items: [
          "Existing users get a CalculationConfig on migration that matches their previous locale behavior exactly — not a single number in the dashboard changes.",
          "Backup/Restore now includes the CalculationConfig. Older backups without config are derived automatically from the locale on import.",
          "The automatic PDF archive now also uses the user's calculation rules instead of the AT fallback.",
          "Demo mode now sets the AT locale and a CalculationConfig with 25 vacation days + 3 carryover days.",
          "48 new unit tests (630 total), all existing tests stay green."
        ]
      }
    ]
  },

  {
    version: "4.0.1",
    date: "11.04.2026",
    title: "Nextcloud login fix",
    sections: [
      {
        iconName: "Bug",
        title: "Bug fix",
        items: [
          "Fixed Nextcloud login URL key mismatch (url → serverUrl)."
        ]
      }
    ]
  },

  {
    version: "4.0.0",
    date: "10.04.2026",
    title: "Neutral course — for every profession 🌍",
    isMajor: true,
    sections: [
      {
        iconName: "Globe",
        title: "Hours calculation: Neutral, Austria or Germany",
        items: [
          "eStundnzettl is no longer just for Austria! At first launch you pick once which rules the app should use: Neutral (no automatic holidays, no half-days, no extra-hours/overtime split), Austria (as before, with statutory holidays, Dec 24/31 halved and extra-hours/overtime per AZG) or Germany with all 16 states including regional holidays.",
          "Existing users see a one-time popup at first launch after the update and can keep Austria with a single click, just like before — your entries stay unchanged.",
          "You can switch any time later in power-user mode under \"Hours calculation\". Future calculations follow the new selection, past entries stay."
        ]
      },
      {
        iconName: "Sliders",
        title: "Custom hours come first now",
        items: [
          "In the setup wizard the per-day sliders are now the active mode — you set your hours directly. The default comes automatically from your chosen region (38.5h for Austria, 40h for Germany, 40h for Neutral).",
          "The classic presets (38.5h, 40h, 4-day week …) are now below the sliders — one tap applies them if you want.",
          "Weekdays are finally shown in the right order: Monday to Sunday, no longer Sunday to Saturday."
        ]
      },
      {
        iconName: "Sparkles",
        title: "New step: activity codes in the wizard",
        items: [
          "New users can now decide at initial setup which activity codes to start with: \"General\" (5 neutral base codes, preselected), \"No codes\" (you add your own) or an industry preset like the Kogler elevator catalog under \"Advanced presets\".",
          "Existing users keep their familiar codes — no change."
        ]
      },
      {
        iconName: "FileText",
        title: "Small polish",
        items: [
          "The tagline under the app name proudly reads \"Mobile time tracking\" now.",
          "Demo data and example projects are phrased more neutrally so waiters, nurses, technicians & co. can recognize themselves too.",
          "Internal cleanup: the holiday list is no longer maintained twice but comes from a single central place per region."
        ]
      }
    ]
  },

  {
    version: "3.6.0",
    date: "09.04.2026",
    title: "Power-user mode & leaner settings 🔧",
    isMajor: true,
    sections: [
      {
        iconName: "Wrench",
        title: "Power-user mode — for pros who want more",
        items: [
          "Settings are now tidy and clear: only the essentials are visible. Anyone who needs Nextcloud, import/export, the PDF archive, minute mode, activity codes or record-only mode just toggles the new power-user mode at the very bottom of settings.",
          "Power-user mode is purely cosmetic — it just reveals extra settings without changing any existing functionality. Once set up, everything keeps running as before."
        ]
      },
      {
        iconName: "Layout",
        title: "Settings reorganized",
        items: [
          "The Backup & Export card now has a consistent header in the same style as the PDF archive card.",
          "The \"Record only\" toggle moved from the user profile into the work-schedule card — that's where it logically belongs. When it's on, the model selection is hidden automatically.",
          "No more overscrolling at the bottom of the settings page."
        ]
      },
      {
        iconName: "Bug",
        title: "Bug fixes",
        items: [
          "PDF archive: holidays are now correctly included in the target calculation. Previously the target was computed for holidays without counting them as actual hours — making the PDF balance too negative.",
          "Google Drive: the connected email address is now shown persistently after an app restart instead of just \"Google Drive app data\".",
          "Backup import: imported data now appears immediately in the app without requiring a restart."
        ]
      },
      {
        iconName: "BookOpen",
        title: "New guide & help",
        items: [
          "The help was fully reworked and updated to all current features: live timer, attaching documents, backup options and power-user mode are now explained.",
          "New README on GitHub with screenshots and Play Store link."
        ]
      }
    ]
  },

  {
    version: "3.5.0",
    date: "07.04.2026",
    title: "Record-only mode & better month boundaries",
    sections: [
      {
        iconName: "Sliders",
        title: "New work-schedule model: record only",
        items: [
          "You can now also use the app as a pure time-tracking tool — without target/actual calculation, without overtime, without extra hours. Just write down when you worked.",
          "The option is available in the setup wizard and also later in settings under your profile. A single toggle is enough — everything else is hidden automatically."
        ]
      },
      {
        iconName: "Bug",
        title: "Fix: extra/overtime across month boundaries",
        items: [
          "For weeks that span a month boundary (e.g. CW 14 with Mon–Tue in March and Wed–Fri in April), extra hours (MA) were calculated incorrectly. The app compared the plus-hours of the edge days against the daily target and derived MA directly — even though with only 2–3 days you can't exceed the 38.5h weekly limit at all.",
          "New rule: extra hours only arise when the actual time of the visible days exceeds the full weekly target (e.g. 38.5h). As long as you stay below, only the daily overtime (actual > daily target) is counted — without MA. This applies symmetrically at the start and end of a month."
        ]
      }
    ]
  },

  {
    version: "3.4.0",
    date: "05.04.2026",
    title: "Friendly start & a clean timesheet 🎉",
    isMajor: true,
    sections: [
      {
        iconName: "Sparkles",
        title: "New welcome flow & interactive app tour",
        items: [
          "The setup wizard was reworked from the ground up — friendlier in tone, clearer in its explanations. Right on the first page you see what eStundnzettl stands for: everything on your phone, works offline, your data stays with you. Every step briefly and honestly explains what happens and why.",
          "The backup step is now transparently marked as completely optional. You also learn the nice side effect right there: once you enable a backup, the app automatically adds a finished PDF timesheet every month.",
          "Fresh after setup you get a short interactive app tour that shows you where things live in 7 steps: dashboard, live timer (including long-press + swipe up), manual entry, report and settings. Small pulsing markers point exactly at the real buttons."
        ]
      },
      {
        iconName: "FileText",
        title: "The automatic PDF now looks like your shared report",
        items: [
          "The automatically archived monthly PDF used to have a plain, tabular layout — very different from the nice timesheet you can share from the report. From now on both paths use exactly the same template: company, photo, zebra stripes, summary box. Your archive PDF shows the same design as the shared report, 1:1.",
          "As a side effect the app install gets noticeably smaller — we were able to drop a large internal PDF library entirely."
        ]
      },
      {
        iconName: "Bug",
        title: "Fix: extra hours at month boundaries",
        items: [
          "For weeks that span a month boundary (e.g. CW 14 with Monday still in March and Wednesday already in April), the app could show too much extra time — in the dashboard and in the PDF. The bug was that the week was clipped at the month edge and plus-hours from the month half were compared against a halved target.",
          "Extra hours and overtime are now always calculated over the full week (Mon–Sun). For attribution the ISO rule applies: a week belongs to the month containing its Thursday. This way every week is counted correctly exactly once — no double counting, no gaps."
        ]
      }
    ]
  },

  {
    version: "3.3.0",
    date: "05.04.2026",
    title: "Your monthly PDF lands in the archive automatically 📁",
    sections: [
      {
        iconName: "FileText",
        title: "Automatic PDF archive",
        items: [
          "The app now creates a clean PDF of your timesheet automatically every month — once a day, completely hands-off. This way, even years later you have an orderly, searchable monthly report ready, even if the app is no longer installed by then.",
          "In settings you can choose where the archive should go: locally on your device into the Documents folder, into your Nextcloud or to Google Drive into its own \"eStundnzettl Archive\" folder. Each target can be toggled individually, and with \"Run now\" you can start a run manually at any time.",
          "At month change the old month is left as a final report and a new one is started. And as long as nothing changed in your entries, nothing happens — no unnecessary upload, no extra data usage."
        ]
      },
      {
        iconName: "ShieldCheck",
        title: "Smoother Drive connection",
        items: [
          "The Google Drive connection for the existing JSON backup and the new PDF archive now run cleanly side by side. The yellow \"Check Drive connection\" warning that briefly appeared for some users after connecting the PDF archive is gone too."
        ]
      }
    ]
  },

  {
    version: "3.2.1",
    date: "05.04.2026",
    title: "More flexible special hours ⏱️",
    sections: [
      {
        iconName: "Clock",
        title: "Sick · Vacation · Time off",
        items: [
          "For sick, vacation and time-off entries there's now a toggle under the info hint between \"Automatic\" and \"Manual\". Automatic stays the default — the daily target time from your work model is credited as usual. In manual mode you can enter start and end time just like in a regular entry, e.g. if you were only sick for half a day or need different hours.",
          "The automatic target-time calculation stays untouched — anyone not changing anything gets exactly the previous behaviour."
        ]
      }
    ]
  },

  {
    version: "3.2.0",
    date: "05.04.2026",
    title: "Structure & trust 🧱",
    isMajor: true,
    sections: [
      {
        iconName: "Database",
        title: "Database",
        items: [
          "New migration framework: schema changes now run through a dedicated version table and can build on each other step by step. Future updates can cleanly extend your database with new fields without data loss."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Quality & stability",
        items: [
          "The two largest internal building blocks (actions center and setup wizard) were split into smaller, focused modules. Invisible to you, but it makes the app more robust and future changes can be tested more precisely.",
          "When fully resetting the app, a safety backup is automatically written to the cache directory first — in case you change your mind at the last second.",
          "Import files are now validated against a strict schema (Zod). Invalid entries are skipped individually instead of failing the whole import, and you get clear feedback on how many were skipped."
        ]
      },
      {
        iconName: "TestTube",
        title: "Tests",
        items: [
          "The test suite grew from 38 to 158 tests. All database repositories (entries, settings, work codes, attachments, backup metadata) and all new action hooks are now covered by automated tests.",
          "Coverage on tested areas: repositories 100 %, schemas 100 %, action hooks 76 %. Critical logic regressions are caught before release in CI this way."
        ]
      }
    ]
  },

  {
    version: "3.1.1",
    date: "04.04.2026",
    title: "Hardening & polish 🛡️",
    isMajor: true,
    sections: [
      {
        iconName: "ShieldCheck",
        title: "Security",
        items: [
          "Your Nextcloud app password is now properly encrypted (AES-GCM via the Web Crypto API). Old, base64-only passwords are migrated to the new format automatically and transparently on first launch.",
          "Backups now carry a checksum (SHA-256). If an imported backup is tampered with, the app warns you immediately.",
          "All known dependency security vulnerabilities were closed (npm audit is clean again)."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Quality & stability",
        items: [
          "First unit-test suite introduced (38 tests for time calculations, backup integrity and encryption). Every future release only passes through the Play Store workflow if the tests are green.",
          "New central logging facade — debug output lands cleanly in the log in dev builds and is automatically silent in release builds."
        ]
      },
      {
        iconName: "Accessibility",
        title: "Usability",
        items: [
          "All important icon buttons (month navigation, timer FAB, header, drawer) now have proper labels for screen readers.",
          "When opening settings, the entry form or the setup wizard, the app now shows a clean loading skeleton instead of a blank area."
        ]
      },
      {
        iconName: "Globe",
        title: "Under the hood",
        items: [
          "Multilingual infrastructure (i18next) introduced — German stays the default, English translations are prepared and will follow in a later release.",
          "ESLint configuration tightened and the Android build directory excluded from the lint scan."
        ]
      }
    ]
  },

  {
    version: "3.0.2",
    date: "01.04.2026",
    title: "Healthy weeks, better data 🔧",
    isMajor: false,
    sections: [
      {
        iconName: "Bug",
        title: "Bug fixes",
        items: [
          "Weekly hours are now always calculated for the full calendar week (Mon–Sun) — even when it spans two months.",
          "Extra hours and overtime now line up correctly across month boundaries too.",
          "Loading demo data works instantly without needing to restart the app.",
          "Entries that couldn't be written to the database no longer disappear silently — you get a notification.",
          "Auto-backup no longer registers duplicate listeners in the background."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Improvements",
        items: [
          "Demo data now looks realistic — with a work model, drive time, construction sites and a proper profile.",
          "Popups (changelog, help) now extend cleanly all the way under the navigation bar.",
          "The time picker is now also usable by screen readers."
        ]
      },
      {
        iconName: "Download",
        title: "Under the hood",
        items: [
          "All Capacitor plugins updated to the latest versions.",
          "Import data is now validated before saving — broken entries are dropped.",
          "Entry IDs are now collision-safe, even when creating quickly in succession."
        ]
      }
    ]
  },

  {
    version: "3.0.1",
    date: "31.03.2026",
    title: "Small repairs, cleaner text ✨",
    isMajor: false,
    sections: [
      {
        iconName: "Bug",
        title: "Bug fixes",
        items: [
          "Umlauts and special characters are displayed correctly again throughout the app.",
          "The Play Store button uses clean wording again and shows the right text."
        ]
      },
      {
        iconName: "FileText",
        title: "Documentation",
        items: [
          "The README was cleaned of broken characters and is readable again."
        ]
      }
    ]
  },

  {
    version: "3.0.0",
    date: "30.03.2026",
    title: "The big spring update",
    isMajor: true,
    sections: [
      {
        iconName: "Cloud",
        title: "Backup & cloud",
        items: [
          "Google Drive, Nextcloud and local backup are now cleanly built into the app.",
          "You can connect your backup destination comfortably right in the setup wizard.",
          "Backups and restores now access the same data everywhere."
        ]
      },
      {
        iconName: "FileText",
        title: "Hours & reports",
        items: [
          "Hours calculation now runs through a shared central logic.",
          "Dashboard, report preview and PDF draw the same values from it.",
          "Weekly cards show extra hours and overtime more consistently now."
        ]
      },
      {
        iconName: "Shield",
        title: "Stability",
        items: [
          "Google Drive stays connected much more reliably on Android.",
          "Nextcloud now reports rate limits and connection issues in a more understandable way.",
          "Several small rough edges in settings, backup status and pickers have been smoothed out."
        ]
      }
    ]
  },

  {
    version: "2.5.0",
    date: "28.03.2026",
    title: "Cloud, privacy and a proper data foundation",
    isMajor: false,
    sections: [
      {
        iconName: "Cloud",
        title: "Cloud backups",
        items: [
          "Nextcloud was added as its own backup target.",
          "Google Drive now uses the protected app-data area instead of visible files.",
          "The connection status in settings became clearer and more consistent."
        ]
      },
      {
        iconName: "Sparkles",
        title: "Daily use in the app",
        items: [
          "Settings were tidied up and made more organized.",
          "The setup flow feels more rounded and takes more steps off your hands.",
          "Smaller UI polishes make the app smoother overall."
        ]
      }
    ]
  },

  {
    version: "2.2.0",
    date: "26.03.2026",
    title: "SQLite, attachments and a stable foundation",
    isMajor: false,
    sections: [
      {
        iconName: "FileText",
        title: "Data & attachments",
        items: [
          "SQLite became the central local data base.",
          "Attachments and documents can be linked to entries and shared along.",
          "Import and export now preserve more of what really matters day to day."
        ]
      },
      {
        iconName: "Rocket",
        title: "Tech",
        items: [
          "The app works more robustly with larger datasets.",
          "Icons and build were optimized so launch and package size are cleaner.",
          "Internal data paths became more consistent."
        ]
      }
    ]
  },

  {
    version: "2.0.0",
    date: "23.03.2026",
    title: "More flexibility at work",
    isMajor: true,
    sections: [
      {
        iconName: "Sliders",
        title: "Work routine",
        items: [
          "Custom activity codes and presets were added.",
          "Time entry became finer and more flexible, depending on how precisely you want to book.",
          "An instant 'Back up now' button saves waiting time if you prefer to back up yourself."
        ]
      },
      {
        iconName: "Clock",
        title: "For new users",
        items: [
          "Onboarding now guides you better through the start.",
          "Demo data and simpler base settings help you try things quickly.",
          "Work schedules can be adapted to your own week more clearly."
        ]
      }
    ]
  },

  {
    version: "1.5.0",
    date: "15.01.2026",
    title: "The app grows up",
    isMajor: false,
    sections: [
      {
        iconName: "Timer",
        title: "Clocking in & overview",
        items: [
          "Live clock-in was added and makes daily entry faster.",
          "Dashboard and balances give you a quicker feel for where you stand.",
          "Time off, holidays and similar cases were built in more cleanly."
        ]
      },
      {
        iconName: "FileText",
        title: "Reports",
        items: [
          "PDF reports were built more clearly and helpfully.",
          "Monthly and daily values became easier to follow.",
          "The preview is closer to what actually gets exported later."
        ]
      }
    ]
  },

  {
    version: "1.0.0",
    date: "18.11.2025",
    title: "The first proper foundation",
    isMajor: true,
    sections: [
      {
        iconName: "Sparkles",
        title: "Launch of eStundnzettl",
        items: [
          "The basis for time entry, dashboard and reports was laid.",
          "Austrian holidays and typical work cases were considered from the start.",
          "The app got its own style and was ready for daily use."
        ]
      }
    ]
  },
];

const translatedVersions = new Set(TRANSLATED_EN.map((v) => v.version));

/**
 * Kombiniert die bereits übersetzten Versionen mit den noch nicht
 * übersetzten (die weiter aus der deutschen Datei kommen), so dass
 * die ursprüngliche Reihenfolge erhalten bleibt.
 */
export const CHANGELOG_DATA_EN = CHANGELOG_DATA_DE.map((de) => {
  const en = TRANSLATED_EN.find((v) => v.version === de.version);
  return en ?? de;
});

// `translatedVersions` ist bewusst exportierbar, falls später ein
// Hinweis "Nur auf Deutsch verfügbar" für Altversionen gewünscht ist.
export { translatedVersions };
