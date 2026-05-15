import { describe, expect, it } from "vitest";

import { isGoogleConnectionReady } from "../backupSettingsUtils";

describe("isGoogleConnectionReady", () => {
  it("accepts a stored token as connected", () => {
    expect(isGoogleConnectionReady({ connected: false, hasToken: true, reauthRequired: true })).toBe(true);
  });

  it("accepts an active connection when reauth is not required", () => {
    expect(isGoogleConnectionReady({ connected: true, hasToken: false, reauthRequired: false })).toBe(true);
  });

  it("rejects missing, disconnected, or reauth-required auth state", () => {
    expect(isGoogleConnectionReady(null)).toBe(false);
    expect(isGoogleConnectionReady({ connected: false, hasToken: false, reauthRequired: false })).toBe(false);
    expect(isGoogleConnectionReady({ connected: true, hasToken: false, reauthRequired: true })).toBe(false);
  });
});
