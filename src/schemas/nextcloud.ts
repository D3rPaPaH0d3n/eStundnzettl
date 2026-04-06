/**
 * Zod-Schema für Nextcloud-Konfiguration.
 *
 * Wird für zwei Zwecke verwendet:
 *  1. Validierung der im Settings-Formular eingegebenen Werte, bevor ein
 *     Verbindungsversuch gestartet wird.
 *  2. Validierung der aus SQLite/localStorage geladenen Konfiguration
 *     beim Initialisieren — verhindert, dass manipulierte oder
 *     unvollständige Werte zu einem Absturz im Backup-Flow führen.
 */

import { z } from "zod";

export const nextcloudConfigSchema = z.object({
  enabled: z.boolean(),
  url: z
    .string()
    .url("Bitte eine vollständige URL eingeben (z. B. https://cloud.example.com)")
    .refine((u) => /^https?:\/\//i.test(u), {
      message: "URL muss mit http:// oder https:// beginnen",
    }),
  user: z.string().min(1, "Benutzername darf nicht leer sein"),
  pass: z.string().min(1, "App-Passwort darf nicht leer sein"),
});

/**
 * Minimal-Schema für die Setup-Eingabe, bevor die App-Passwort-Kopplung
 * über Login Flow v2 stattgefunden hat. An diesem Punkt ist nur die URL
 * bekannt; user/pass kommen später vom Server.
 */
export const nextcloudUrlOnlySchema = z.object({
  url: z
    .string()
    .url("Bitte eine vollständige URL eingeben")
    .refine((u) => /^https?:\/\//i.test(u), {
      message: "URL muss mit http:// oder https:// beginnen",
    }),
});

export function validateNextcloudConfig(value: unknown): z.SafeParseReturnType<z.input<typeof nextcloudConfigSchema>, z.infer<typeof nextcloudConfigSchema>> {
  return nextcloudConfigSchema.safeParse(value);
}

export function validateNextcloudUrl(value: unknown): z.SafeParseReturnType<z.input<typeof nextcloudUrlOnlySchema>, z.infer<typeof nextcloudUrlOnlySchema>> {
  return nextcloudUrlOnlySchema.safeParse(value);
}
