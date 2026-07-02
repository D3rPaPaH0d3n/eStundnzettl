import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// ─── Mocks (VOR dem PdfArchiveSettings-Import) ──────────────
// Native/daten-lastige Module mocken, damit der Render in jsdom
// deterministisch bleibt (analog BackupSettings.render.test.tsx).

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

vi.mock("../../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../utils/googleDrivePdfArchive", () => ({
  connectGoogleDrivePdf: vi.fn().mockResolvedValue(undefined),
  disconnectGoogleDrivePdf: vi.fn().mockResolvedValue(undefined),
  getGoogleDrivePdfStatus: vi.fn().mockResolvedValue({ connected: false }),
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
import PdfArchiveSettings from "../PdfArchiveSettings";

const makeProps = () => ({
  nextcloudEnabled: false,
  performRun: vi.fn().mockResolvedValue({}),
  lastRun: null,
  lastError: null,
});

describe("PdfArchiveSettings (Wrapper-Varianten)", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert standalone in einer eigenen Card (unwrapped=false)", () => {
    const { container } = render(<PdfArchiveSettings {...makeProps()} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("rounded-xl"); // Card-Rahmen
    expect(container.textContent).toContain("Automatisches PDF-Archiv");
  });

  it("rendert eingebettet mit Trenner statt Card (unwrapped=true)", () => {
    const { container } = render(
      <PdfArchiveSettings {...makeProps()} unwrapped />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("border-t");
    expect(root.className).not.toContain("rounded-xl");
    expect(container.textContent).toContain("Automatisches PDF-Archiv");
  });
});
