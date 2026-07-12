import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

// ─── Mocks (VOR dem OnboardingWizard-Import) ────────────────
//
// Charakterisierungs-/Snapshot-Tests: Diese Suite friert das AKTUELLE
// UI/Verhalten des OnboardingWizard ein, bevor er refactored wird. Die
// echten Step-Subkomponenten werden bewusst NICHT gemockt (sie sind
// jsdom-sicher und liefern erst dadurch aussagekräftige Snapshots).
// Gemockt werden nur die nativen/daten-lastigen Module, damit der
// initiale Render in jsdom nicht crasht und deterministisch bleibt.

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: 0, Medium: 1, Heavy: 2 },
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

// framer-motion auf passthrough stellen (analog zu EntryForm.test.tsx).
vi.mock("framer-motion", () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      whileDrag: _whileDrag,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      onDragEnd: _onDragEnd,
      layout: _layout,
      layoutId: _layoutId,
      ...rest
    } = props;
    return rest;
  };
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
          React.createElement(tag, stripMotionProps(props), children);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    // SelectionDrawer (via LocaleStep) nutzt useDragControls.
    useDragControls: () => ({ start: () => {} }),
  };
});

// Native Browser-Bridge (Capacitor) — nur Stub, im Render nicht genutzt.
vi.mock("@capacitor/browser", () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Google-Drive-Bridge: initGoogleAuth wird im useEffect aufgerufen.
vi.mock("../../utils/googleDrive", () => ({
  initGoogleAuth: vi.fn().mockResolvedValue(undefined),
  signInGoogle: vi.fn().mockResolvedValue(null),
  findLatestBackup: vi.fn().mockResolvedValue(null),
  downloadFileContent: vi.fn().mockResolvedValue(null),
}));

// Nextcloud-Client: nur Funktionsstubs, im Render nicht aufgerufen.
vi.mock("../../utils/nextcloudClient", () => ({
  downloadBackup: vi.fn().mockResolvedValue(null),
  initiateLoginFlow: vi.fn().mockResolvedValue({ ok: true }),
  pollLoginResult: vi.fn().mockResolvedValue({ ok: true, status: "pending" }),
  getNextcloudErrorMessage: vi.fn(() => "nc error"),
  resolveUserId: vi.fn().mockResolvedValue("user"),
}));

// Storage-Backup-Helfer: Stubs für Restore-/Folder-Handler.
vi.mock("../../utils/storageBackup", () => ({
  analyzeBackupData: vi.fn().mockResolvedValue({ isValid: false }),
  applyBackup: vi.fn().mockResolvedValue(undefined),
  readJsonFile: vi.fn().mockResolvedValue("{}"),
  readBackupFromFolder: vi.fn().mockResolvedValue(null),
  selectBackupFolder: vi.fn().mockResolvedValue(false),
}));

// Settings/WorkCodes/Entries Repositories — SQLite-Schreibzugriffe stubben.
vi.mock("../../db/repositories/settingsRepo", () => ({
  setSetting: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../db/repositories/workCodesRepo", () => ({
  bulkReplaceWorkCodes: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../db/repositories/entriesRepo", () => ({
  bulkInsertEntries: vi.fn().mockResolvedValue(undefined),
}));

// Nextcloud-Secret-Storage (im finishSetup genutzt).
vi.mock("../../utils/nextcloudSecret", () => ({
  storeNextcloudAppPassword: vi.fn().mockResolvedValue({ status: "ready" }),
}));

// Feature-Availability: deterministisch fail-open (alle Cloud-Optionen sichtbar).
vi.mock("../../hooks/useFeatureAvailability", () => ({
  useFeatureAvailability: vi.fn(() => ({
    googleServicesAvailable: true,
    googleServicesStatus: 0,
    loading: false,
    probeFailed: false,
  })),
}));

// Importe NACH den Mocks
import OnboardingWizard from "../OnboardingWizard";

// ─── Test-Helper ────────────────────────────────────────────

const makeProps = () => ({
  onComplete: vi.fn(),
  setUserData: vi.fn(),
  importEntries: vi.fn(),
  importWorkCodes: vi.fn(),
  setCloudSyncEnabled: vi.fn(),
  setLocalBackupEnabled: vi.fn(),
  setTheme: vi.fn(),
  setLocale: vi.fn(),
  setCalculationConfig: vi.fn(),
});

const renderWizard = () => {
  const props = makeProps();
  const result = render(<OnboardingWizard {...props} />);
  return { ...result, props };
};

// ─── Tests ──────────────────────────────────────────────────

describe("OnboardingWizard (Snapshot/Charakterisierung)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert den Welcome-Step (Step 0) ohne Crash", () => {
    const { container } = renderWizard();
    // Sanity: bekannte deutsche Strings des Welcome-Steps.
    expect(container.textContent).toContain("Servus!");
    expect(container.textContent).toContain("Flexible Arbeitszeiten");
    expect(container.textContent).toContain("Ich hab schon ein Backup");
  });

  it("Snapshot: Welcome-Step (Step 0)", () => {
    const { container } = renderWizard();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Snapshot: Backup-Step im Restore-Flow (Step 6, isRestoreFlow=true)", () => {
    // Restore-Flow ist über einen einzelnen Button-Klick zuverlässig
    // erreichbar (handleStartRestore → setStep(6)) und zeigt den
    // Restore-Zweig (FALL B) des Backup-Steps.
    const { container, getByText } = renderWizard();
    fireEvent.click(getByText("Ich hab schon ein Backup"));

    // Sanity: Restore-spezifische deutsche Strings.
    expect(container.textContent).toContain("Aus Google Drive");
    expect(container.textContent).toContain("Aus Nextcloud");
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Snapshot: Backup-Step im Setup-Flow (Step 6, !isRestoreFlow)", () => {
    // Setup-Flow Step 6 (Backup-Einrichtung, FALL A). Erreicht über die
    // Navigation: Welcome → Profil (Name eingeben) → Locale (AT wählen)
    // → WorkSchedule → (Calc übersprungen) → WorkCodes → Backup.
    const { container, getByText, getByPlaceholderText } = renderWizard();

    // Step 0 → 1: "Mit Berechnung & Auswertung" startet den vollen Flow.
    fireEvent.click(getByText("Feste Sollzeiten"));

    // Step 1 (Profil): Name ist Pflichtfeld, sonst blockt nextStep.
    const nameInput = getByPlaceholderText("Max Mustermann") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Max Muster" } });
    fireEvent.click(getByText("Weiter"));

    // Step 2 (Locale): eine Locale wählen, sonst blockt nextStep.
    // Wir klicken den Österreich-Eintrag (sichtbarer Titel-Text).
    fireEvent.click(getByText("Österreich"));
    fireEvent.click(getByText("Weiter"));

    // Step 3 (WorkSchedule) → Step 5 (CalculationStep übersprungen,
    // weil kein "Eigener Plan").
    fireEvent.click(getByText("Weiter"));

    // Step 5 (WorkCodes) → Step 6 (Backup).
    fireEvent.click(getByText("Weiter"));

    // Sanity: Setup-spezifische deutsche Strings des Backup-Steps.
    expect(container.textContent).toContain("Sicher ist sicher");
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Snapshot: Summary-Step (Step 7) via Simple-Mode-Fast-Path", () => {
    // Simple-Mode-Fast-Path springt von Step 1 (Profil) direkt zu
    // Step 7 (Summary) — zuverlässig über sichtbare Buttons erreichbar.
    const { container, getByText, getByPlaceholderText } = renderWizard();

    fireEvent.click(getByText("Flexible Arbeitszeiten"));
    const nameInput = getByPlaceholderText("Max Mustermann") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Max Muster" } });
    fireEvent.click(getByText("Weiter"));

    // Sanity: Summary-spezifische deutsche Strings.
    expect(container.textContent).toContain("Perfekt!");
    expect(container.firstChild).toMatchSnapshot();
  });

  it("bietet im flexiblen Schnellstart ein optionales Monatsziel an", () => {
    const { getByText, getByLabelText, getByPlaceholderText } = renderWizard();

    fireEvent.click(getByText("Flexible Arbeitszeiten"));
    expect(getByText("Monatliches Stundenziel (optional)")).toBeTruthy();

    fireEvent.click(getByText("Monatliches Stundenziel (optional)"));
    const targetInput = getByLabelText("Stunden") as HTMLInputElement;
    expect(targetInput.value).toBe("30");
    expect((getByLabelText("Minuten") as HTMLSelectElement).value).toBe("00");

    fireEvent.change(targetInput, { target: { value: "745" } });
    fireEvent.change(getByPlaceholderText("Max Mustermann"), { target: { value: "Max Muster" } });
    fireEvent.click(getByText("Weiter"));
    expect(getByText("Bitte ein gültiges Ziel im Format Stunden:Minuten eingeben.")).toBeTruthy();

  });

  it("akzeptiert ein gültiges Monatsziel im flexiblen Schnellstart", () => {
    const { getByText, getByLabelText, getByPlaceholderText } = renderWizard();
    fireEvent.click(getByText("Flexible Arbeitszeiten"));
    fireEvent.click(getByText("Monatliches Stundenziel (optional)"));
    fireEvent.change(getByLabelText("Stunden"), { target: { value: "35" } });
    fireEvent.change(getByLabelText("Minuten"), { target: { value: "30" } });
    fireEvent.change(getByPlaceholderText("Max Mustermann"), { target: { value: "Max Muster" } });
    fireEvent.click(getByText("Weiter"));
    expect(getByText("Perfekt! 🎉")).toBeTruthy();
  });
});
