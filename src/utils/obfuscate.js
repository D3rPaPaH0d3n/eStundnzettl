/**
 * Einfache Obfuskation für sensible Werte (z.B. Nextcloud-Passwort).
 * KEIN echtes Encryption — verhindert nur Klartext-Anzeige in Storage.
 * Abwärtskompatibel: Werte ohne Prefix werden als Klartext erkannt.
 */

const OBF_PREFIX = "obf:";

export function obfuscate(val) {
  if (!val) return "";
  return OBF_PREFIX + btoa(unescape(encodeURIComponent(val)));
}

export function deobfuscate(val) {
  if (!val) return "";
  if (val.startsWith(OBF_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(val.slice(OBF_PREFIX.length))));
    } catch {
      return "";
    }
  }
  return val; // Klartext-Fallback für bestehende Werte
}
