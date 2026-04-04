import { describe, it, expect } from "vitest";
import { validateNextcloudConfig, validateNextcloudUrl } from "../nextcloud";

describe("validateNextcloudConfig", () => {
  it("akzeptiert eine vollständige, gültige Konfiguration", () => {
    const result = validateNextcloudConfig({
      enabled: true,
      url: "https://cloud.example.com",
      user: "alice",
      pass: "app-passwort-123",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt leeren Benutzer oder leeres Passwort ab", () => {
    const empty = validateNextcloudConfig({
      enabled: true,
      url: "https://cloud.example.com",
      user: "",
      pass: "",
    });
    expect(empty.success).toBe(false);
  });

  it("lehnt nicht-http(s)-URLs ab", () => {
    const bad = validateNextcloudConfig({
      enabled: true,
      url: "ftp://cloud.example.com",
      user: "alice",
      pass: "x",
    });
    expect(bad.success).toBe(false);
  });

  it("lehnt kaputte URLs ab", () => {
    const bad = validateNextcloudConfig({
      enabled: true,
      url: "keineurl",
      user: "alice",
      pass: "x",
    });
    expect(bad.success).toBe(false);
  });
});

describe("validateNextcloudUrl", () => {
  it("akzeptiert https://cloud.example.com", () => {
    expect(validateNextcloudUrl({ url: "https://cloud.example.com" }).success).toBe(true);
  });
  it("akzeptiert http:// (für Self-hosted Dev-Setups)", () => {
    expect(validateNextcloudUrl({ url: "http://localhost:8080" }).success).toBe(true);
  });
  it("lehnt leere Strings ab", () => {
    expect(validateNextcloudUrl({ url: "" }).success).toBe(false);
  });
});
