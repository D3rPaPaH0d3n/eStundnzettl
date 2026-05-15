import { describe, it, expect } from "vitest";
import { parseBackupPayloadSafe, } from "../backup";

describe("parseBackupPayloadSafe", () => {
  it("akzeptiert ein minimales, valides Payload", () => {
    const result = parseBackupPayloadSafe({
      entries: [
        { id: 1, type: "work", date: "2026-04-04", start: "08:00", end: "16:00" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries).toHaveLength(1);
    }
  });

  it("akzeptiert zusätzliche unbekannte Top-Level-Keys (passthrough)", () => {
    const result = parseBackupPayloadSafe({
      entries: [],
      customField: "foo",
      anotherOne: 42,
    });
    expect(result.success).toBe(true);
  });

  it("füllt fehlende Listen als leere Arrays", () => {
    const result = parseBackupPayloadSafe({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries).toEqual([]);
      expect(result.data.workCodes).toEqual([]);
    }
  });

  it("lehnt ein Payload mit invalider Entry-Liste ab", () => {
    const result = parseBackupPayloadSafe({
      entries: [{ id: 1, type: "work", date: "broken", start: "08:00", end: "16:00" }],
    });
    expect(result.success).toBe(false);
  });

  it("akzeptiert Meta-Felder formatVersion und checksum", () => {
    const result = parseBackupPayloadSafe({
      formatVersion: 2,
      checksum: "abcd".repeat(16),
      entries: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formatVersion).toBe(2);
    }
  });

  it("preserves legacy string entry IDs and matching attachment entryId", () => {
    const result = parseBackupPayloadSafe({
      version: "legacy-string-id",
      entries: [
        { id: "legacy-301", type: "work", date: "2026-04-04", start: "08:00", end: "16:00" },
      ],
      attachments: [
        { id: "att-legacy-301", entryId: "legacy-301", label: "Beleg" },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries[0].id).toBe("legacy-301");
      expect(result.data.attachments[0].entryId).toBe("legacy-301");
    }
  });
});
