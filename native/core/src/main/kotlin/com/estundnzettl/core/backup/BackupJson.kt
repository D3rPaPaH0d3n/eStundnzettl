package com.estundnzettl.core.backup

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.security.MessageDigest
import java.text.Collator
import java.util.Locale

/**
 * Backup-Integrität — Port der Checksum-Logik aus src/utils/storageBackup.ts.
 *
 * Die Checksum ist SHA-256 über einen kanonischen JSON-String: Objekt-Keys
 * sortiert, das Feld `checksum` ausgeschlossen. Backups der TS-App und der
 * Kotlin-App verifizieren sich damit gegenseitig.
 */

const val BACKUP_FORMAT_VERSION = 2

/** Payload-Version: v7 = vollständiger App-Zustand inkl. workCodes/locale/theme. */
const val BACKUP_PAYLOAD_VERSION = "v7"

/**
 * Kanonischer JSON-String für die Checksum-Berechnung.
 *
 * Wichtig: [JsonPrimitive] behält bei geparstem JSON die Original-Literale
 * (Zahlformatierung, Escapes in Strings werden von uns neu erzeugt) — für
 * Zahlen entspricht `toString()` dem geparsten Literal, sodass die Checksum
 * eines TS-Backups unverändert reproduziert wird.
 *
 * Die Key-Sortierung der TS-Vorlage nutzt `localeCompare` (ICU-Kollation:
 * Basis-Buchstaben zuerst, Groß-/Kleinschreibung erst auf Tertiär-Ebene) —
 * das bildet ein [Collator] nach, nicht die binäre String-Ordnung. Durch
 * den Cross-Fixture-Test (von der echten TS-Implementierung erzeugt)
 * abgesichert.
 */
fun canonicalJsonStringify(value: JsonElement?): String {
    // Collator ist nicht thread-safe → pro Aufruf eine Instanz.
    val collator = Collator.getInstance(Locale.US)
    return canonicalStringify(value, collator)
}

private fun canonicalStringify(value: JsonElement?, collator: Collator): String = when (value) {
    null, is JsonNull -> "null"
    is JsonPrimitive -> if (value.isString) encodeJsonString(value.content) else value.content
    is JsonArray -> value.joinToString(",", "[", "]") { canonicalStringify(it, collator) }
    is JsonObject -> value.keys
        .filter { it != "checksum" }
        .sortedWith(collator)
        .joinToString(",", "{", "}") { key ->
            encodeJsonString(key) + ":" + canonicalStringify(value[key], collator)
        }
}

/** JSON-String-Encoding identisch zu JSON.stringify (minimale Escapes). */
internal fun encodeJsonString(s: String): String {
    val sb = StringBuilder(s.length + 2)
    sb.append('"')
    for (ch in s) {
        when (ch) {
            '"' -> sb.append("\\\"")
            '\\' -> sb.append("\\\\")
            '\b' -> sb.append("\\b")
            '\u000C' -> sb.append("\\f")
            '\n' -> sb.append("\\n")
            '\r' -> sb.append("\\r")
            '\t' -> sb.append("\\t")
            else -> if (ch < ' ') {
                sb.append("\\u").append("%04x".format(ch.code))
            } else {
                sb.append(ch)
            }
        }
    }
    sb.append('"')
    return sb.toString()
}

internal fun sha256Hex(text: String): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val bytes = digest.digest(text.toByteArray(Charsets.UTF_8))
    return bytes.joinToString("") { "%02x".format(it) }
}

/** Berechnet die SHA-256-Checksum eines Backup-Payloads (ohne `checksum`-Feld). */
fun computeBackupChecksum(payload: JsonObject?): String? {
    if (payload == null) return null
    return runCatching { sha256Hex(canonicalJsonStringify(payload)) }.getOrNull()
}

/**
 * Fügt einem Backup-Payload die Felder `formatVersion` und `checksum` hinzu
 * und gibt das neue Objekt zurück (JsonObject ist immutabel).
 */
fun attachBackupChecksum(payload: JsonObject): JsonObject {
    val withVersion = JsonObject(payload + ("formatVersion" to JsonPrimitive(BACKUP_FORMAT_VERSION)))
    val checksum = computeBackupChecksum(withVersion) ?: return withVersion
    return JsonObject(withVersion + ("checksum" to JsonPrimitive(checksum)))
}

enum class BackupIntegrity(val wireName: String) {
    VERIFIED("verified"),
    MISMATCH("mismatch"),
    UNVERIFIED("unverified"),
}

/**
 * Verifiziert die Integrität eines gespeicherten Backup-Payloads.
 *  - VERIFIED:   Checksum vorhanden und korrekt
 *  - MISMATCH:   Checksum vorhanden, aber inkorrekt (möglicher Tampering)
 *  - UNVERIFIED: Kein Checksum-Feld (Legacy-Backup)
 */
fun verifyBackupIntegrity(payload: JsonElement?): BackupIntegrity {
    val obj = payload as? JsonObject ?: return BackupIntegrity.UNVERIFIED
    val expected = (obj["checksum"] as? JsonPrimitive)?.takeIf { it.isString }?.content
    if (expected.isNullOrEmpty()) return BackupIntegrity.UNVERIFIED
    val actual = computeBackupChecksum(obj) ?: return BackupIntegrity.UNVERIFIED
    return if (actual == expected) BackupIntegrity.VERIFIED else BackupIntegrity.MISMATCH
}
