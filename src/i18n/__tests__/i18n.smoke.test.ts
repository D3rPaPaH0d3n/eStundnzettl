/**
 * Smoke test für den Language-Switch.
 *
 * Prüft, dass die wichtigsten Keys aus allen Namespaces sowohl in
 * DE als auch in EN aufgelöst werden und nicht auf den Key-String
 * selbst zurückfallen. Dient als einfaches Sicherheitsnetz gegen
 * Tippfehler in JSON-Dateien oder fehlende Übersetzungen.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import i18n from "../../i18n";
import de from "../locales/de.json";
import en from "../locales/en.json";

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
  "supportPrompt.title",
  "supportPrompt.body",
  "supportPrompt.rate",
  "supportPrompt.coffee",
  "supportPrompt.noThanks",
  "supportPrompt.linkError",
  "onboarding.welcome.hello",
  "onboarding.summary.title",
  "onboarding.calc.title",
  "toasts.entry.saved",
  "toasts.export.success",
  "toasts.import.success",
  "appTour.steps.welcome.title",
  "appTour.steps.report.body",
  "hints.gotIt",
  "hints.reportTitle",
  "hints.report",
  "settingsTour.steps.overview.title",
  "settingsTour.steps.calculation.body",
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

  it("has identical key trees for DE and EN", () => {
    const collectStringKeys = (node: unknown, prefix = ""): string[] => {
      if (typeof node === "string") return [prefix];
      if (node === null || typeof node !== "object") return [];
      const keys: string[] = [];
      for (const [name, value] of Object.entries(node as Record<string, unknown>)) {
        const next = prefix ? `${prefix}.${name}` : name;
        keys.push(...collectStringKeys(value, next));
      }
      return keys;
    };

    const deKeys = collectStringKeys(de).sort();
    const enKeys = collectStringKeys(en).sort();
    const deSet = new Set(deKeys);
    const enSet = new Set(enKeys);
    const missingInDe = enKeys.filter((k) => !deSet.has(k));
    const missingInEn = deKeys.filter((k) => !enSet.has(k));

    expect(
      missingInDe.length === 0 && missingInEn.length === 0,
      [
        missingInDe.length ? `Missing in DE:\n  - ${missingInDe.join("\n  - ")}` : null,
        missingInEn.length ? `Missing in EN:\n  - ${missingInEn.join("\n  - ")}` : null,
      ]
        .filter(Boolean)
        .join("\n") || "",
    ).toBe(true);
  });

  it("contains every static translation key used by the native Kotlin app", () => {
    const nativeRoot = resolve(__dirname, "../../../native/app/src/main/kotlin");
    const sourceFiles: string[] = [];

    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (entry.isFile() && entry.name.endsWith(".kt")) sourceFiles.push(path);
      }
    };
    visit(nativeRoot);

    const collectStringKeys = (node: unknown, prefix = ""): string[] => {
      if (typeof node === "string") return [prefix];
      if (node === null || typeof node !== "object") return [];
      return Object.entries(node as Record<string, unknown>).flatMap(([name, value]) =>
        collectStringKeys(value, prefix ? `${prefix}.${name}` : name),
      );
    };

    const deKeys = new Set(collectStringKeys(de));
    const enKeys = new Set(collectStringKeys(en));
    const missing: string[] = [];
    const literalCall = /\b(?:[A-Za-z_]\w*\.)?t\(\s*"([^"]+)"/g;

    for (const file of sourceFiles) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(literalCall)) {
        const key = match[1];
        if (key.includes("$")) continue;
        const direct = deKeys.has(key) && enKeys.has(key);
        const plural =
          deKeys.has(`${key}_one`) && deKeys.has(`${key}_other`) &&
          enKeys.has(`${key}_one`) && enKeys.has(`${key}_other`);
        if (!direct && !plural) {
          missing.push(`${key} (${file.slice(nativeRoot.length + 1)})`);
        }
      }
    }

    expect(
      [...new Set(missing)].sort(),
      `Native Kotlin translation keys missing in DE or EN:\n${missing.join("\n")}`,
    ).toEqual([]);
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
