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
