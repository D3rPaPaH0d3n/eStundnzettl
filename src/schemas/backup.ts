/**
 * Zod-Schema für Backup-Payloads (Export / Import).
 *
 * Das Schema ist bewusst **tolerant** — ein Import soll auch bei leicht
 * abweichenden Legacy-Formaten funktionieren, solange die Kerndaten
 * stimmen. Strikte Prüfung findet auf Entry-Ebene über das Entry-Schema statt.
 */

import { z } from "zod";
import { entrySchema } from "./entry";

const workCodeSchema = z.object({
  id: z.number().int(),
  label: z.string(),
});

const attachmentMetaSchema = z
  .looseObject({
    id: z.string(),
    entryId: z.union([z.number(), z.string()]),
    label: z.string().optional().default(""),
    fileName: z.string().optional().default(""),
    mimeType: z.string().optional().default(""),
    fileSize: z.number().int().optional().default(0),
    createdAt: z.string().optional().default(""),
  });

export const backupPayloadSchema = z
  .looseObject({
    // Meta (Welle 3.1.0)
    formatVersion: z.number().int().optional(),
    checksum: z.string().optional(),
    exportedAt: z.string().optional(),
    timezone: z.string().optional(),
    version: z.string().optional(),
    note: z.string().optional(),
    lastModified: z.string().optional(),

    // Payload
    user: z.record(z.string(), z.any()).nullable().optional(),
    entries: z.array(entrySchema).optional().default([]),
    workCodes: z.array(workCodeSchema).optional().default([]),
    attachments: z.array(attachmentMetaSchema).optional().default([]),
    attachmentLabels: z.array(z.string()).optional().default([]),
  });

export function parseBackupPayloadSafe(value: unknown) {
  return backupPayloadSchema.safeParse(value);
}
