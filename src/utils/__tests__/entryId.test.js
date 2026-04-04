import { describe, it, expect, beforeEach } from "vitest";
import { generateEntryId, _resetEntryIdCounterForTests } from "../entryId";

describe("generateEntryId", () => {
  beforeEach(() => {
    _resetEntryIdCounterForTests();
  });

  it("liefert eine positive Ganzzahl", () => {
    const id = generateEntryId();
    expect(Number.isInteger(id)).toBe(true);
    expect(id).toBeGreaterThan(0);
  });

  it("liefert bei aufeinanderfolgenden Aufrufen strikt monoton steigende IDs", () => {
    const ids = Array.from({ length: 100 }, () => generateEntryId());
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
  });

  it("produziert keine Duplikate bei 1000 schnellen Aufrufen", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateEntryId()));
    expect(ids.size).toBe(1000);
  });

  it("bleibt innerhalb von Number.MAX_SAFE_INTEGER", () => {
    const id = generateEntryId();
    expect(id).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});
