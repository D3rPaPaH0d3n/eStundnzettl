import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFirstOpenHint } from "../useFirstOpenHint";

describe("useFirstOpenHint", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is visible before the hint was dismissed", () => {
    const { result } = renderHook(() => useFirstOpenHint("hint_key"));

    expect(result.current.visible).toBe(true);
  });

  it("is hidden when the localStorage key is already set", () => {
    localStorage.setItem("hint_key", "true");

    const { result } = renderHook(() => useFirstOpenHint("hint_key"));

    expect(result.current.visible).toBe(false);
  });

  it("dismisses the hint and persists the decision", () => {
    const { result } = renderHook(() => useFirstOpenHint("hint_key"));

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.visible).toBe(false);
    expect(localStorage.getItem("hint_key")).toBe("true");
  });
});
