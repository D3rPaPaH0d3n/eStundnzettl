/**
 * pdfArchiveTargets.js — Ziel-Adapter fuer das automatische PDF-Archiv.
 *
 * Stellt eine einheitliche Schnittstelle fuer die (derzeit zwei) Ziele
 * bereit: Lokaler Ordner und Nextcloud. Google Drive folgt in einer
 * separaten Iteration — der GoogleDriveBackupPlugin wird in dieser
 * Iteration bewusst nicht angefasst.
 */

import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { uploadBinaryToPath } from "./nextcloudClient";
import { deobfuscate } from "./obfuscate";
import { STORAGE_KEYS } from "../hooks/constants";
import { logger } from "./logger";

const log = logger.scope("PdfArchive");

/**
 * Schreibt das PDF in den lokalen Ordner Documents/eStundnzettl/Archiv/.
 * Web-Fallback: Download via Blob-URL.
 */
export async function writeLocalArchive(filename, base64, blob) {
  if (!Capacitor.isNativePlatform()) {
    // Web: schlichter Download als Fallback
    if (!blob) return { ok: false, error: "Kein Blob fuer Web-Download" };
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true, target: "local-web" };
  }

  try {
    await Filesystem.writeFile({
      path: `eStundnzettl/Archiv/${filename}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return { ok: true, target: "local" };
  } catch (err) {
    log.warn("Lokales PDF-Archiv fehlgeschlagen:", err);
    return { ok: false, error: String(err?.message || err), target: "local" };
  }
}

/**
 * Laedt das PDF nach Nextcloud in /eStundnzettl/Archiv/ hoch.
 * Liest die Nextcloud-Credentials aus dem bestehenden Settings-Store
 * (gleicher Pfad wie `useAutoBackup`).
 */
export async function uploadNextcloudArchive(filename, base64) {
  const ncUrl = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL) || "";
  const ncUser = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || "";
  const ncPassRaw = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || "";
  if (!ncUrl || !ncUser || !ncPassRaw) {
    return { ok: false, error: "Nextcloud nicht konfiguriert", target: "nextcloud" };
  }
  try {
    const ncPass = await deobfuscate(ncPassRaw);
    await uploadBinaryToPath(
      ncUrl,
      ncUser,
      ncPass,
      ["eStundnzettl", "Archiv"],
      filename,
      base64,
      "application/pdf",
    );
    return { ok: true, target: "nextcloud" };
  } catch (err) {
    log.warn("Nextcloud PDF-Archiv fehlgeschlagen:", err);
    return { ok: false, error: String(err?.message || err), target: "nextcloud" };
  }
}
