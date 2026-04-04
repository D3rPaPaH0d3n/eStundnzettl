/**
 * Verschlüsselung für sensible Werte (z. B. Nextcloud-App-Passwort).
 *
 * Wave 3.1.0: Wechsel von reinem Base64 ("obf:") auf echte AES-GCM-Verschlüsselung
 * via Web Crypto API. Der Master-Key ist ein zufälliger 256-Bit-Schlüssel, der
 * einmalig pro Installation erzeugt und in der SQLite-settings-Tabelle abgelegt
 * wird (Key: "crypto_mk_v1"). Backups enthalten diesen Key nicht — exportierte
 * Credentials sind auf einem fremden Gerät nicht entschlüsselbar.
 *
 * Format eines verschlüsselten Werts: "enc:v1:<b64url(iv)>:<b64url(ct)>"
 *
 * Abwärtskompatibilität:
 *  - Werte mit Prefix "obf:" (altes Base64) werden weiterhin gelesen und beim
 *    nächsten Schreiben automatisch als "enc:v1:" abgelegt.
 *  - Werte ohne Prefix werden als Klartext akzeptiert (Legacy-Fallback).
 *
 * API (alle async, Aufrufer müssen `await` verwenden):
 *  - obfuscate(value)        → "enc:v1:..."
 *  - deobfuscate(value)      → Klartext
 *
 * Zusätzlich:
 *  - deobfuscateLegacySync(value) → Klartext, unterstützt NUR "obf:" und
 *    Klartext. Wird für synchrone `useState`-Initializer verwendet; der echte
 *    Wert wird anschließend asynchron aus SQLite nachgeladen.
 */

import { logger } from "./logger";

const ENC_PREFIX = "enc:v1:";
const LEGACY_OBF_PREFIX = "obf:";
const MASTER_KEY_SETTING = "crypto_mk_v1";

let _cachedKeyPromise = null;

// ─── Helpers ───────────────────────────────────────────────

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8Encode(str) {
  return new TextEncoder().encode(str);
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

function getCrypto() {
  const c = (typeof globalThis !== "undefined" && globalThis.crypto) || null;
  if (!c || !c.subtle) {
    throw new Error("Web Crypto API nicht verfügbar");
  }
  return c;
}

// ─── Master Key Management ─────────────────────────────────

async function loadOrCreateMasterKey() {
  // Lazy-Import, um Zyklen zu vermeiden (obfuscate wird auch aus useSettings importiert,
  // und settingsRepo hängt indirekt vom DB-Init ab).
  const { getSetting, setSetting } = await import("../db/repositories/settingsRepo");
  const crypto = getCrypto();

  let stored = null;
  try {
    stored = await getSetting(MASTER_KEY_SETTING);
  } catch {
    // DB möglicherweise noch nicht bereit — fällt unten in "neu erzeugen" durch
    stored = null;
  }

  if (stored && typeof stored === "string" && stored.length > 0) {
    try {
      const raw = base64ToBytes(stored);
      if (raw.length === 32) {
        return await crypto.subtle.importKey(
          "raw",
          raw,
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"]
        );
      }
    } catch {
      // korrupt → neu erzeugen
    }
  }

  // Neuen 256-Bit Schlüssel erzeugen
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  try {
    await setSetting(MASTER_KEY_SETTING, bytesToBase64(exported));
  } catch (err) {
    // Persistenz fehlgeschlagen — wir arbeiten in-memory weiter, aber
    // beim nächsten Start verliert der User seine verschlüsselten Werte.
    // Das ist besser als komplett zu scheitern.
     
    logger.warn("[obfuscate] Master-Key konnte nicht persistiert werden:", err);
  }
  // Re-importieren als non-extractable für Benutzung
  return await crypto.subtle.importKey(
    "raw",
    exported,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function getMasterKey() {
  if (!_cachedKeyPromise) {
    _cachedKeyPromise = loadOrCreateMasterKey().catch((err) => {
      // Bei Fehler Cache leeren, damit ein späterer Aufruf erneut versucht
      _cachedKeyPromise = null;
      throw err;
    });
  }
  return _cachedKeyPromise;
}

/**
 * Nur für Tests / spezielle Migrationsszenarien: erzwingt ein Neuladen des Keys.
 */
export function _resetObfuscateCacheForTests() {
  _cachedKeyPromise = null;
}

// ─── Public API ────────────────────────────────────────────

/**
 * Verschlüsselt einen String mit dem geräte-gebundenen Master-Key.
 * Leere / null-Werte werden als "" zurückgegeben (kein Ciphertext).
 */
export async function obfuscate(val) {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val);
  try {
    const crypto = getCrypto();
    const key = await getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        utf8Encode(str)
      )
    );
    return `${ENC_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(ct)}`;
  } catch (err) {
    // Fallback: Falls Krypto wirklich nicht geht, lieber im Legacy-Format
    // speichern als nichts zu speichern — verhindert Datenverlust.
     
    logger.error("[obfuscate] Verschlüsselung fehlgeschlagen, Legacy-Fallback:", err);
    try {
      return LEGACY_OBF_PREFIX + btoa(unescape(encodeURIComponent(str)));
    } catch {
      return "";
    }
  }
}

/**
 * Entschlüsselt / dekodiert einen gespeicherten Wert.
 * Unterstützt: "enc:v1:..." (AES-GCM), "obf:..." (Legacy-Base64), Klartext.
 */
export async function deobfuscate(val) {
  if (!val) return "";
  const str = String(val);

  // Neues Format
  if (str.startsWith(ENC_PREFIX)) {
    try {
      const body = str.slice(ENC_PREFIX.length);
      const sep = body.indexOf(":");
      if (sep < 0) return "";
      const iv = base64ToBytes(body.slice(0, sep));
      const ct = base64ToBytes(body.slice(sep + 1));
      const crypto = getCrypto();
      const key = await getMasterKey();
      const pt = new Uint8Array(
        await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct)
      );
      return utf8Decode(pt);
    } catch (err) {
       
      logger.error("[obfuscate] Entschlüsselung fehlgeschlagen:", err);
      return "";
    }
  }

  // Legacy-Format
  if (str.startsWith(LEGACY_OBF_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(str.slice(LEGACY_OBF_PREFIX.length))));
    } catch {
      return "";
    }
  }

  // Klartext-Fallback
  return str;
}

/**
 * Synchroner Legacy-Decoder. Unterstützt ausschließlich "obf:"-Prefix und
 * Klartext. "enc:v1:"-Werte können synchron NICHT entschlüsselt werden und
 * ergeben "". Aufrufer müssen den echten Wert anschließend asynchron via
 * `deobfuscate` nachladen.
 *
 * Wird verwendet, um React-`useState`-Initializer nicht async machen zu müssen.
 */
export function deobfuscateLegacySync(val) {
  if (!val) return "";
  const str = String(val);
  if (str.startsWith(ENC_PREFIX)) return "";
  if (str.startsWith(LEGACY_OBF_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(str.slice(LEGACY_OBF_PREFIX.length))));
    } catch {
      return "";
    }
  }
  return str;
}
