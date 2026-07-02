import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";

// ─── Mocks (VOR dem BackupSettings-Import) ──────────────────
//
// Charakterisierungs-/Snapshot-Tests: Diese Suite friert das AKTUELLE
// UI des BackupSettings-Panels ein, bevor es refactored wird. Gemockt
// werden die nativen/daten-lastigen Module, damit der Render in jsdom
// deterministisch bleibt und nicht crasht.
//
// HINWEIS Snapshot-Stabilität: lastBackupDate bleibt `null` (kein
// gemocktes last_backup), daher rendert die Komponente KEINE relative
// Zeit ("vor 3 Minuten"). Die Snapshots sind dadurch deterministisch.

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

// storageMode: SQLite als inaktiv melden, damit der nachladende
// useEffect-Zweig (getSetting-Aufrufe) übersprungen wird → kein
// dynamischer State/Zeitstempel im Snapshot.
vi.mock("../../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../utils/googleDrive", () => ({
  initGoogleAuth: vi.fn().mockResolvedValue(undefined),
  signInGoogle: vi.fn().mockResolvedValue(null),
  signOutGoogle: vi.fn().mockResolvedValue(undefined),
  // Nicht verbunden → keine "connected"-Badges, deterministischer Default.
  getGoogleAuthStatus: vi.fn().mockResolvedValue({
    connected: false,
    hasToken: false,
    reauthRequired: false,
  }),
  getStoredGoogleAuth: vi.fn(() => null),
}));

vi.mock("../../../utils/storageBackup", () => ({
  selectBackupFolder: vi.fn().mockResolvedValue(false),
  hasBackupTarget: vi.fn(() => false),
  clearBackupTarget: vi.fn().mockResolvedValue(undefined),
  triggerManualBackup: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../../utils/nextcloudClient", () => ({
  testConnection: vi.fn().mockResolvedValue({ ok: true }),
  initiateLoginFlow: vi.fn().mockResolvedValue({ ok: true }),
  pollLoginResult: vi.fn().mockResolvedValue({ ok: true, status: "pending" }),
  ensureFolder: vi.fn().mockResolvedValue({ ok: true }),
  getNextcloudErrorMessage: vi.fn(() => "nc error"),
}));

vi.mock("../../../hooks/useFeatureAvailability", () => ({
  useFeatureAvailability: vi.fn(() => ({
    googleServicesAvailable: true,
    googleServicesStatus: 0,
    loading: false,
    probeFailed: false,
  })),
}));

// Importe NACH den Mocks
import BackupSettings from "../BackupSettings";
import { isSQLiteActive } from "../../../db/storageMode";
import { getSetting } from "../../../db/repositories/settingsRepo";

// ─── Test-Helper ────────────────────────────────────────────

const makeProps = (overrides: Partial<React.ComponentProps<typeof BackupSettings>> = {}) => ({
  autoBackup: false,
  setAutoBackup: vi.fn(),
  onExport: vi.fn(),
  onFileImport: vi.fn().mockResolvedValue(undefined),
  nextcloudEnabled: false,
  nextcloudUrl: "",
  nextcloudUser: "",
  nextcloudPass: "",
  setNextcloudEnabled: vi.fn(),
  setNextcloudUrl: vi.fn(),
  setNextcloudUser: vi.fn(),
  setNextcloudPass: vi.fn(),
  expertMode: false,
  onTriggerManualBackup: vi.fn().mockResolvedValue(undefined),
  extraContent: undefined,
  ...overrides,
});

const renderCard = (overrides: Partial<React.ComponentProps<typeof BackupSettings>> = {}) => {
  const props = makeProps(overrides);
  const result = render(<BackupSettings {...props} />);
  // CollapsibleCard ist eingeklappt (defaultExpanded=false). Header
  // klicken, damit der Body (mit den Backup-Optionen) sichtbar wird.
  fireEvent.click(result.getByText("Backup & Export"));
  return { ...result, props };
};

// ─── Tests ──────────────────────────────────────────────────

describe("BackupSettings (Snapshot/Charakterisierung)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert die aufgeklappte Karte ohne Crash (Default, expertMode=false)", () => {
    const { container } = renderCard({ expertMode: false });
    // Sanity: bekannte deutsche Strings des Backup-Panels.
    expect(container.textContent).toContain("Backup & Export");
    expect(container.textContent).toContain("Status");
    expect(container.textContent).toContain("Export");
    expect(container.textContent).toContain("Import");
    // Nextcloud-Block (Hausmasta-Modus) ist hier NICHT sichtbar — der
    // "Einrichten"-Button (nextcloud.setup) ist Nextcloud-spezifisch.
    expect(container.textContent).not.toContain("Einrichten");
  });

  it("Snapshot: Default (expertMode=false, Nextcloud-Block verborgen)", () => {
    const { container } = renderCard({ expertMode: false });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Snapshot: expertMode=true (Nextcloud-Block sichtbar)", () => {
    const { container } = renderCard({ expertMode: true });
    // Sanity: Nextcloud-Block-spezifische deutsche Strings sind sichtbar
    // ("Einrichten" = nextcloud.setup, nur im Hausmasta-Modus).
    expect(container.textContent).toContain("Nextcloud");
    expect(container.textContent).toContain("Einrichten");
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("BackupSettings lastBackupLabel (relative Zeitanzeige)", () => {
  // last_backup via SQLite-Slice injizieren, damit alle Zweige der
  // relativen Zeitanzeige durchlaufen werden. Kein Snapshot — die
  // Ausgabe hängt von der aktuellen Uhrzeit ab.
  const expectLastBackupLabel = async (iso: string, expected: string) => {
    vi.mocked(isSQLiteActive).mockReturnValue(true);
    vi.mocked(getSetting).mockImplementation(async (key: string) =>
      key === "last_backup" ? iso : null
    );
    const { container } = renderCard();
    await waitFor(() =>
      expect(container.textContent).toContain(`Letztes Backup: ${expected}`)
    );
  };

  afterEach(() => {
    // Overrides zurücksetzen, damit andere Suites deterministisch bleiben.
    vi.mocked(isSQLiteActive).mockReturnValue(false);
    vi.mocked(getSetting).mockReset();
    vi.mocked(getSetting).mockResolvedValue(null);
    cleanup();
  });

  it('zeigt "gerade eben" für ein Backup vor <1 Minute', async () => {
    await expectLastBackupLabel(new Date().toISOString(), "gerade eben");
  });

  it("zeigt Minuten für ein Backup vor 5 Minuten", async () => {
    await expectLastBackupLabel(
      new Date(Date.now() - 5 * 60_000).toISOString(),
      "vor 5 Min."
    );
  });

  it("zeigt Stunden für ein Backup vor 3 Stunden", async () => {
    await expectLastBackupLabel(
      new Date(Date.now() - 3 * 3_600_000).toISOString(),
      "vor 3 Std."
    );
  });

  it("zeigt Tage für ein Backup vor 2 Tagen", async () => {
    await expectLastBackupLabel(
      new Date(Date.now() - 2 * 86_400_000).toISOString(),
      "vor 2 Tagen"
    );
  });
});
