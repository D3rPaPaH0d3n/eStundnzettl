import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

import PlayServicesBanner from "../PlayServicesBanner";

// ─── Tests ─────────────────────────────────────────────────────────

describe("PlayServicesBanner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert nichts wenn show=false", () => {
    const { queryByTestId } = render(<PlayServicesBanner show={false} />);
    expect(queryByTestId("play-services-banner")).toBeNull();
  });

  it("rendert das Banner wenn show=true", () => {
    const { getByTestId, getByText } = render(<PlayServicesBanner show={true} />);
    expect(getByTestId("play-services-banner")).toBeTruthy();
    expect(getByText("Manche Funktionen sind hier nicht verfügbar")).toBeTruthy();
  });

  it("versteckt das Banner nach Klick auf Dismiss-Button", () => {
    const { getByLabelText, queryByTestId } = render(
      <PlayServicesBanner show={true} />,
    );
    const dismissBtn = getByLabelText("Verstanden");
    fireEvent.click(dismissBtn);
    expect(queryByTestId("play-services-banner")).toBeNull();
  });

  it("merkt sich den Dismiss in localStorage", () => {
    const { getByLabelText } = render(<PlayServicesBanner show={true} />);
    fireEvent.click(getByLabelText("Verstanden"));
    expect(localStorage.getItem("pgs_banner_dismissed_v1")).toBe("1");
  });

  it("bleibt nach Re-Mount versteckt wenn schon dismissed", () => {
    localStorage.setItem("pgs_banner_dismissed_v1", "1");
    const { queryByTestId } = render(<PlayServicesBanner show={true} />);
    expect(queryByTestId("play-services-banner")).toBeNull();
  });
});
