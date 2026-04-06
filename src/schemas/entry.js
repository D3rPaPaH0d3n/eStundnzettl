/**
 * Zod-Schemas für Entry-Objekte.
 *
 * Diese Schemas spiegeln den Stand wider, der in SQLite/localStorage
 * gespeichert wird und spiegeln die bisher in useEntryActions und in
 * useExport/storageBackup verstreute Ad-hoc-Validierung.
 *
 * Sie werden in drei Kontexten verwendet:
 *  1. Import — beim Einlesen eines Backups (strikte Prüfung).
 *  2. Speicher-Pfad — beim manuellen Anlegen/Editieren (soft-Prüfung,
 *     damit die UI-Fehlermeldungen freundlich bleiben).
 *  3. Tests — als Ground Truth, wie ein gültiger Entry aussieht.
 */

import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export const dateString = z
  .string()
  .regex(DATE_RE, "Datum muss im Format YYYY-MM-DD sein");

export const timeString = z.string().regex(TIME_RE, "Zeit muss im Format HH:MM sein");

export const entryTypeSchema = z.enum([
  "work",
  "vacation",
  "sick",
  "public_holiday",
  "time_comp",
]);

/**
 * Strenge Validierung eines Entry-Objekts — Anwendung: Import.
 *
 * Arbeit-Einträge müssen start + end haben; Urlaub/Krank/Zeitausgleich
 * nicht. Zusatzfelder (project, code, netDuration) sind optional und
 * werden erhalten, falls vorhanden.
 */
export const entrySchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    type: entryTypeSchema.default("work"),
    date: dateString,
    start: timeString.nullable().optional(),
    end: timeString.nullable().optional(),
    pause: z.number().int().min(0).max(720).default(0),
    project: z.string().nullable().optional(),
    code: z.number().int().nullable().optional(),
    netDuration: z.number().int().min(0).default(0),
  })
  .superRefine((entry, ctx) => {
    if (entry.type === "work") {
      if (!entry.start || !entry.end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["start"],
          message: "Arbeitseinträge benötigen Start- und Endzeit",
        });
      }
    }
  });

/**
 * Prüft, ob ein beliebiges Objekt ein valider Entry ist.
 * Rückgabe ist der geparste Entry oder `null` bei Invalidität.
 */
export function parseEntrySafe(value) {
  const result = entrySchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Filtert eine Liste von Kandidaten und gibt nur die validen Entries zurück.
 * Nützlich für Import-Pfade, die unbekannte Struktur bekommen.
 */
export function filterValidEntries(candidates) {
  if (!Array.isArray(candidates)) return [];
  const valid = [];
  for (const candidate of candidates) {
    const parsed = parseEntrySafe(candidate);
    if (parsed) valid.push(parsed);
  }
  return valid;
}
