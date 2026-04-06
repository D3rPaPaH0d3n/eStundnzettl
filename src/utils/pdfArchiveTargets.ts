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
import { uploadPdfArchiveFile } from "./googleDrivePdfArchive";
import { deobfuscate } from "./obfuscate";
import { STORAGE_KEYS } from "../hooks/constants";
import { logger } from "./logger";

interface ArchiveResult {
  ok: boolean;
  error?: string;
  target?: string;
  note?: string;
}

const log = logger.scope("PdfArchive");

/**
 * Schreibt das PDF in einen lokalen, ohne App zugaenglichen Ordner.
 *
 * Android Scoped Storage (ab 10/11) ist bei manchen Geraetekonfigurationen
 * (Secondary User Profiles, Work Profiles, Samsung Secure Folder) besonders
 * restriktiv — ein direkter Schreibzugriff auf `Documents/Unterordner/` kann
 * mit `EACCES` scheitern. Daher probieren wir eine **dreistufige Fallback-
 * Kette** und geben im Return-Objekt via `note` zurueck, welcher Pfad
 * tatsaechlich verwendet wurde, damit die UI dem Nutzer die richtige Stelle
 * anzeigen kann.
 *
 * Web-Fallback: Download via Blob-URL.
 */
export async function writeLocalArchive(filename: string, base64: string, blob?: Blob | null): Promise<ArchiveResult> {
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

  // Stufe 1: Documents/eStundnzettl/Archiv/ (idealer Pfad, im Dateimanager
  // unter "Dokumente" sichtbar)
  try {
    await Filesystem.writeFile({
      path: `eStundnzettl/Archiv/${filename}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return { ok: true, target: "local", note: "Dokumente/eStundnzettl/Archiv/" };
  } catch (err1) {
    log.warn("Stufe 1 (Documents/eStundnzettl/Archiv) fehlgeschlagen:", err1);
  }

  // Stufe 2: Documents/ flach (MediaStore handhabt direkte Documents-Ablage
  // zuverlaessiger als verschachtelte Pfade auf manchen Geraetekonfigurationen)
  try {
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
    });
    return {
      ok: true,
      target: "local",
      note: "Dokumente/ (flach, ohne Unterordner)",
    };
  } catch (err2) {
    log.warn("Stufe 2 (Documents/ flach) fehlgeschlagen:", err2);
  }

  // Stufe 3: App-externer privater Storage
  // (/storage/emulated/<user>/Android/data/com.estundnzettl.app/files/Archiv/)
  // — schreibt immer ohne Permissions. Auf Android 11+ im Standard-"Files"-App
  // versteckt, aber mit Drittanbieter-File-Managern (Solid Explorer, MiXplorer,
  // Cx, Total Commander) sowie per USB/adb sichtbar.
  try {
    await Filesystem.writeFile({
      path: `Archiv/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true,
    });
    return {
      ok: true,
      target: "local",
      note: "Android/data/com.estundnzettl.app/files/Archiv/ (app-privat)",
    };
  } catch (err3) {
    log.warn("Stufe 3 (External/Archiv) fehlgeschlagen:", err3);
    return {
      ok: false,
      error: `Alle drei Lokal-Pfade scheiterten. Letzter Fehler: ${String((err3 as any)?.message || err3)}`,
      target: "local",
    };
  }
}

/**
 * Laedt das PDF nach Nextcloud in /eStundnzettl/Archiv/ hoch.
 * Liest die Nextcloud-Credentials aus dem bestehenden Settings-Store
 * (gleicher Pfad wie `useAutoBackup`).
 */
export async function uploadNextcloudArchive(filename: string, base64: string): Promise<ArchiveResult> {
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
    return { ok: false, error: String((err as any)?.message || err), target: "nextcloud" };
  }
}

/**
 * Laedt das PDF in den sichtbaren Google-Drive-Ordner `eStundnzettl Archiv`
 * hoch. Nutzt eine komplett eigene Auth-/Token-Pipeline
 * (`googleDrivePdfArchive.js`), die den bestehenden JSON-Backup-Flow
 * (`googleDriveBackup.js`) nicht beruehrt — eigener Scope (drive.file),
 * eigener Session-Token-Cache, eigener localStorage-Auth-State.
 */
export async function uploadGDriveArchive(filename: string, base64: string, blob?: Blob | null): Promise<ArchiveResult> {
  if (!base64) {
    return { ok: false, error: "Kein base64-Inhalt fuer GDrive-Upload", target: "gdrive" };
  }
  try {
    await uploadPdfArchiveFile(filename, base64, blob ?? undefined);
    return { ok: true, target: "gdrive" };
  } catch (err) {
    log.warn("GDrive PDF-Archiv fehlgeschlagen:", err);
    return { ok: false, error: String((err as any)?.message || err), target: "gdrive" };
  }
}
