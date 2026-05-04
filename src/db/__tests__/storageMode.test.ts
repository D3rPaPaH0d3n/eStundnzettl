import { describe, it, expect, vi } from "vitest";

vi.mock("../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { setStorageMode, subscribeStorageMode } from "../storageMode";

describe("storageMode readiness signal", () => {
  it("notifies subscribers when SQLite storage mode is confirmed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStorageMode(listener);

    setStorageMode("sqlite");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setStorageMode("sqlite");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
