/**
 * Smoke test für den Language-Switch.
 *
 * Prüft, dass die wichtigsten Keys aus allen Namespaces sowohl in
 * DE als auch in EN aufgelöst werden und nicht auf den Key-String
 * selbst zurückfallen. Dient als einfaches Sicherheitsnetz gegen
 * Tippfehler in JSON-Dateien oder fehlende Übersetzungen.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import i18n from "../../i18n";

const CRITICAL_KEYS = [
  "common.cancel",
  "common.save",
  "header.settings",
  "dashboard.target",
  "dashboard.balance",
  "entryForm.entryTypeLabel",
  "reports.title",
  "modals.export.titlePdf",
  "workCodes.title",
  "skeleton.onboarding",
  "settings.theme.title",
  "settings.backup.header",
  "settings.calc.header",
  "settings.data.workModel.heading",
  "settings.pdfArchive.header",
  "settings.language.header",
  "onboarding.welcome.hello",
  "onboarding.summary.title",
  "onboarding.calc.title",
  "toasts.entry.saved",
  "toasts.export.success",
  "toasts.import.success",
  "appTour.steps.welcome.title",
  "appTour.steps.report.body",
  "hints.gotIt",
  "hints.settingsTitle",
  "hints.settings",
  "hints.reportTitle",
  "hints.report",
  "liveTimer.hours",
  "helpModal.title",
  "changelogModal.title",
  "app.deleteEntryTitle",
];

describe("i18n smoke", () => {
  const originalLanguage = i18n.language;

  beforeEach(async () => {
    await i18n.changeLanguage("de");
  });

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage);
  });

  it("resolves every critical key in German", async () => {
    for (const key of CRITICAL_KEYS) {
      const value = i18n.t(key);
      expect(value, `DE key missing: ${key}`).not.toBe(key);
      expect(typeof value).toBe("string");
      expect((value as string).length, `DE empty: ${key}`).toBeGreaterThan(0);
    }
  });

  it("resolves every critical key in English", async () => {
    await i18n.changeLanguage("en");
    for (const key of CRITICAL_KEYS) {
      const value = i18n.t(key);
      expect(value, `EN key missing: ${key}`).not.toBe(key);
      expect(typeof value).toBe("string");
      expect((value as string).length, `EN empty: ${key}`).toBeGreaterThan(0);
    }
  });

  it("returns distinct strings between DE and EN for most keys", async () => {
    const collisions: string[] = [];
    for (const key of CRITICAL_KEYS) {
      await i18n.changeLanguage("de");
      const deValue = i18n.t(key);
      await i18n.changeLanguage("en");
      const enValue = i18n.t(key);
      if (deValue === enValue) {
        collisions.push(`${key} -> "${deValue}"`);
      }
    }
    // A few identical strings are fine (e.g. "Status" / "Status"),
    // but the vast majority should actually differ between DE and EN.
    expect(
      collisions.length,
      `Too many DE/EN collisions (expected <5):\n${collisions.join("\n")}`,
    ).toBeLessThan(5);
  });
});
