/**
 * Erzeugt Referenz-Fixtures für die Kotlin-Port-Tests (native/core) mit der
 * ECHTEN TS-Backup-Implementierung. Die Fixtures liegen unter
 * native/core/src/test/resources/fixtures und beweisen dort, dass die
 * Kotlin-Checksummen byte-identisch sind.
 *
 * Ändert sich das Backup-Format, ändert dieser Test die eingecheckten
 * Fixtures — der Diff macht Format-Drift sichtbar und lässt die
 * Kotlin-Tests beim nächsten `gradle :core:test` gezielt fehlschlagen.
 */
import { describe, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: vi.fn(), readFile: vi.fn(), mkdir: vi.fn(), getUri: vi.fn() },
  Directory: { Data: "DATA", Documents: "DOCUMENTS", Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));
vi.mock("../googleDrive", () => ({
  uploadOrUpdateFile: vi.fn(),
  getValidToken: vi.fn(),
  initGoogleAuth: vi.fn(),
}));
vi.mock("../nextcloudClient", () => ({ uploadBackup: vi.fn() }));
vi.mock("../nextcloudSecret", () => ({ getNextcloudAppPassword: vi.fn() }));
vi.mock("../../db/storageMode", () => ({ isSQLiteActive: vi.fn(() => true) }));
vi.mock("../../db/repositories/settingsRepo", () => ({
  setSetting: vi.fn(), deleteSetting: vi.fn(), getSetting: vi.fn(),
}));
vi.mock("../../db/repositories/entriesRepo", () => ({
  getAllEntries: vi.fn(), bulkInsertEntries: vi.fn(),
}));
vi.mock("../../db/repositories/workCodesRepo", () => ({
  bulkReplaceWorkCodes: vi.fn(), getAllWorkCodes: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../db/repositories/attachmentsRepo", () => ({
  bulkReplaceAttachments: vi.fn(), bulkReplaceLabelSuggestions: vi.fn(),
  getAllAttachments: vi.fn().mockResolvedValue([]),
  getAllLabelSuggestions: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../db/snapshot", () => ({
  replaceFullSnapshot: vi.fn().mockResolvedValue(undefined),
}));

import { composeBackupPayload, computeBackupChecksum } from "../storageBackup";
import type { Entry } from "../../types";

const OUT_DIR = resolve(__dirname, "../../../native/core/src/test/resources/fixtures");

describe("generate kotlin fixtures", () => {
  it("writes reference backup payload + checksums", async () => {
    mkdirSync(OUT_DIR, { recursive: true });

    const entries: Entry[] = [
      { id: 1736531200000123, type: "work", date: "2026-01-05", start: "07:00", end: "16:30", pause: 30, project: "Baustelle Nüßler-Straße", code: 14, netDuration: 540 },
      { id: "legacy-abc-42", type: "work", date: "2026-01-06", start: "22:00", end: "06:00", pause: 0, project: null, code: 19, netDuration: 480 },
      // Entries aus SQLite kommen immer durch rowToEntry → alle Felder
      // vorhanden, fehlende Werte als explizites null.
      { id: 3, type: "vacation", date: "2026-01-07", start: null, end: null, pause: 0, project: null, code: null, netDuration: 510 },
      { id: 4, type: "sick", date: "2026-01-08", start: null, end: null, pause: 0, project: null, code: null, netDuration: 510 },
    ];

    const payload = await composeBackupPayload(
      {
        user: {
          name: "Märkus \"Test\" Kainer",
          position: "Monteur / Aufzugsbau",
          photo: null,
          workDays: [0, 510, 510, 510, 510, 270, 0],
          simpleMode: false,
          expertMode: true,
          workModelId: "38.5-classic",
        },
        entries,
        workCodes: [
          { id: 14, label: "14 - Wartung" },
          { id: 19, label: "19 - Fahrzeit" },
        ],
        attachments: [
          {
            id: "att-1", entryId: 1736531200000123, label: "Lieferschein",
            fileName: "schein.pdf", mimeType: "application/pdf",
            storagePath: "attachments/att-1.pdf", fileSize: 12345,
            createdAt: "2026-01-05T12:00:00.000Z",
          },
          {
            id: "att-2", entryId: "legacy-abc-42", label: "Foto",
            fileName: "foto.jpg", mimeType: "image/jpeg",
            storagePath: "attachments/att-2.jpg", fileSize: 998877,
            createdAt: "2026-01-06T08:15:30.500Z",
          },
        ],
        attachmentLabels: ["Lieferschein", "Foto", "Notiz äöü ß €"],
        calculationConfig: {
          weeklyTargetMinutes: 2310,
          overtimeMode: "split",
          overtimeThresholdMinutes: 2400,
          sickOnWorkDayMode: "cap_to_target",
          holidaySet: { mode: "locale_default", disabledHolidayKeys: ["12-08"] },
          halfDayMode: { mode: "locale_default", customHalfDays: [] },
          holidayOnWorkDayMode: "additive",
          autoPauseRules: [{ fromMinutes: 360, pauseMinutes: 30 }],
          vacationAllowanceDays: 25,
          vacationCarryoverDays: 3,
          pdfDisplay: {
            showSummary: true, showTargetTime: true, showBalance: false,
            showOvertimeSplit: true, showVacationBalance: true,
            showAttachmentsList: true, showWorkCodeColumn: false, showCustomNote: true,
          },
          configVersion: 1,
        },
        locale: "at",
        theme: "dark",
      },
      "eStundnzettl Manueller Backup"
    );

    // lastModified/timezone sind laufzeitabhängig → durch feste Werte
    // ersetzen und Checksum neu berechnen, damit die Fixture deterministisch ist.
    const mutable = payload as unknown as Record<string, unknown>;
    mutable.lastModified = "2026-07-13T12:00:00.000Z";
    mutable.timezone = "Europe/Vienna";
    delete mutable.checksum;
    mutable.checksum = await computeBackupChecksum(mutable);

    writeFileSync(resolve(OUT_DIR, "backup-v7-reference.json"), JSON.stringify(payload, null, 2));

    // Zusätzliche Mini-Fixtures: Checksummen für Edge-Case-Payloads
    const edgeCases: Record<string, unknown> = {
      simple: { a: 1, b: "two", c: null, d: true },
      umlauts: { text: "äöüß €—🙂", nested: { zahl: 2.5, negativ: -0, gross: 1736531200000123 } },
      escapes: { s: "Zeile1\nZeile2\t\"quoted\"\\back", leer: "", arr: [1, "x", null, false, { k: "v" }] },
      keyOrder: { zebra: 1, Alpha: 2, alpha: 3, "workCodes": 4, "workDays": 5, "attachmentLabels": 6, "attachments": 7 },
    };
    const checksums: Record<string, { canonical: string; checksum: string | null }> = {};
    for (const [name, value] of Object.entries(edgeCases)) {
      checksums[name] = {
        canonical: "",
        checksum: await computeBackupChecksum(value as Record<string, unknown>),
      };
    }
    writeFileSync(
      resolve(OUT_DIR, "checksum-cases.json"),
      JSON.stringify({ cases: edgeCases, checksums }, null, 2)
    );
  });
});
