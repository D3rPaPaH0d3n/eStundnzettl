import { beforeEach, describe, expect, it, vi } from "vitest";

const bulkWriteSettingsMock = vi.fn();

vi.mock("../repositories/settingsRepo", () => ({
  bulkWriteSettings: (...args: unknown[]) => bulkWriteSettingsMock(...args),
}));

vi.mock("../repositories/entriesRepo", () => ({
  bulkInsertEntries: vi.fn(),
}));

vi.mock("../repositories/workCodesRepo", () => ({
  bulkReplaceWorkCodes: vi.fn(),
}));

vi.mock("../repositories/attachmentsRepo", () => ({
  bulkReplaceAttachments: vi.fn(),
  bulkReplaceLabelSuggestions: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { migrateBackupMetaToSQLite, migrateSettingsToSQLite } from "../migrate-from-localstorage";

describe("migrate-from-localstorage", () => {
  beforeEach(() => {
    localStorage.clear();
    bulkWriteSettingsMock.mockReset();
    bulkWriteSettingsMock.mockResolvedValue(undefined);
  });

  it("migriert Locale, CalculationConfig und Nextcloud-Verbindung in Settings", async () => {
    const calcConfig = { weekly: { mode: "custom" }, vacationCarryoverDays: 3 };
    localStorage.setItem("estundnzettl_locale", "at");
    localStorage.setItem("estundnzettl_calculation_config", JSON.stringify(calcConfig));
    localStorage.setItem("estundnzettl_nextcloud_enabled", "true");
    localStorage.setItem("estundnzettl_nextcloud_url", "https://cloud.example");
    localStorage.setItem("estundnzettl_nextcloud_user", "markus");

    await expect(migrateSettingsToSQLite()).resolves.toEqual({ migrated: 5, skipped: false });

    expect(bulkWriteSettingsMock).toHaveBeenCalledWith({
      locale: "at",
      calculationConfig: calcConfig,
      nextcloud_enabled: true,
      nextcloud_url: "https://cloud.example",
      nextcloud_user: "markus",
    });
    expect(localStorage.getItem("estundnzettl_sqlite_settings_migration_done")).toBe("true");
  });

  it("migriert Backup-, Nextcloud- und PDF-Archiv-Metadaten inklusive Monats-Hashes", async () => {
    localStorage.setItem("estundnzettl_last_code", "42");
    localStorage.setItem("estundnzettl_last_backup_date", "2026-05-07T20:00:00.000Z");
    localStorage.setItem("estundnzettl_backup_target", "documents");
    localStorage.setItem("estundnzettl_backup_fail_count", "2");
    localStorage.setItem("estundnzettl_backup_last_error", "gdrive down");
    localStorage.setItem("estundnzettl_backup_backoff_until", "2026-05-07T21:00:00.000Z");
    localStorage.setItem("estundnzettl_nextcloud_backup_fail_count", "1");
    localStorage.setItem("estundnzettl_nextcloud_backup_last_error", "nc down");
    localStorage.setItem("estundnzettl_nextcloud_backoff_until", "2026-05-07T22:00:00.000Z");
    localStorage.setItem("estundnzettl_pdf_archive_enabled", "true");
    localStorage.setItem("estundnzettl_pdf_archive_local", "true");
    localStorage.setItem("estundnzettl_pdf_archive_nextcloud", "false");
    localStorage.setItem("estundnzettl_pdf_archive_gdrive", "true");
    localStorage.setItem("estundnzettl_pdf_archive_last_run", "2026-05-07");
    localStorage.setItem("estundnzettl_pdf_archive_last_month", "2026-05");
    localStorage.setItem("estundnzettl_pdf_archive_fail_count", "3");
    localStorage.setItem("estundnzettl_pdf_archive_last_error", "pdf failed");
    localStorage.setItem("estundnzettl_pdf_archive_last_hash_2026-05", "hash-1");

    const result = await migrateBackupMetaToSQLite();

    expect(result).toEqual({ migrated: 18, skipped: false });
    expect(bulkWriteSettingsMock).toHaveBeenCalledWith(expect.objectContaining({
      last_code: 42,
      last_backup: "2026-05-07T20:00:00.000Z",
      backup_target: "documents",
      backup_fail_count: 2,
      backup_last_error: "gdrive down",
      backup_backoff_until: "2026-05-07T21:00:00.000Z",
      nextcloud_backup_fail_count: 1,
      nextcloud_backup_last_error: "nc down",
      nextcloud_backoff_until: "2026-05-07T22:00:00.000Z",
      pdf_archive_enabled: true,
      pdf_archive_local: true,
      pdf_archive_nextcloud: false,
      pdf_archive_gdrive: true,
      pdf_archive_last_run: "2026-05-07",
      pdf_archive_last_month: "2026-05",
      pdf_archive_fail_count: "3",
      pdf_archive_last_error: "pdf failed",
      "estundnzettl_pdf_archive_last_hash_2026-05": "hash-1",
    }));
    expect(localStorage.getItem("estundnzettl_sqlite_backup_meta_migration_done")).toBe("true");
  });
});
