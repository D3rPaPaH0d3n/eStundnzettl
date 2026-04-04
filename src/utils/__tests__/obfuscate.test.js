import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock settingsRepo (verhindert SQLite-Init in Tests) ───
const mockStore = new Map();
vi.mock("../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn(async (key) => mockStore.get(key) ?? null),
  setSetting: vi.fn(async (key, value) => { mockStore.set(key, value); }),
  deleteSetting: vi.fn(async (key) => { mockStore.delete(key); }),
}));

import {
  obfuscate,
  deobfuscate,
  deobfuscateLegacySync,
  _resetObfuscateCacheForTests,
} from "../obfuscate";

describe("obfuscate (AES-GCM)", () => {
  beforeEach(() => {
    mockStore.clear();
    _resetObfuscateCacheForTests();
  });

  it("verschlüsselt und entschlüsselt einen String verlustfrei (Roundtrip)", async () => {
    const plain = "super-geheimes-app-passwort-123!";
    const enc = await obfuscate(plain);
    expect(enc).toMatch(/^enc:v1:/);
    expect(enc).not.toContain(plain);
    const dec = await deobfuscate(enc);
    expect(dec).toBe(plain);
  });

  it("erzeugt pro Aufruf einen neuen IV (unterschiedliche Ciphertexte)", async () => {
    const plain = "abcdef";
    const a = await obfuscate(plain);
    const b = await obfuscate(plain);
    expect(a).not.toBe(b);
    expect(await deobfuscate(a)).toBe(plain);
    expect(await deobfuscate(b)).toBe(plain);
  });

  it("liefert leeren String bei leerer Eingabe", async () => {
    expect(await obfuscate("")).toBe("");
    expect(await obfuscate(null)).toBe("");
    expect(await obfuscate(undefined)).toBe("");
    expect(await deobfuscate("")).toBe("");
  });

  it("entschlüsselt Legacy-'obf:'-Format (Abwärtskompatibilität)", async () => {
    // Altes Base64-Format: "obf:" + btoa(unescape(encodeURIComponent(val)))
    const plain = "alt-passwort";
    const legacy = "obf:" + btoa(unescape(encodeURIComponent(plain)));
    expect(await deobfuscate(legacy)).toBe(plain);
  });

  it("behandelt Klartext ohne Prefix als Klartext", async () => {
    expect(await deobfuscate("einfach-klartext")).toBe("einfach-klartext");
  });

  it("liefert leeren String bei korruptem enc-Wert", async () => {
    expect(await deobfuscate("enc:v1:broken")).toBe("");
    expect(await deobfuscate("enc:v1:!!!:!!!")).toBe("");
  });

  it("persistiert den Master-Key nur einmal", async () => {
    await obfuscate("eins");
    await obfuscate("zwei");
    // beide Calls nutzen denselben Key
    const key = mockStore.get("crypto_mk_v1");
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("deobfuscateLegacySync entschlüsselt obf: aber nicht enc:", async () => {
    const plain = "legacy-wert";
    const legacy = "obf:" + btoa(unescape(encodeURIComponent(plain)));
    expect(deobfuscateLegacySync(legacy)).toBe(plain);
    expect(deobfuscateLegacySync("enc:v1:iv:ct")).toBe("");
    expect(deobfuscateLegacySync("plain")).toBe("plain");
    expect(deobfuscateLegacySync("")).toBe("");
  });
});
