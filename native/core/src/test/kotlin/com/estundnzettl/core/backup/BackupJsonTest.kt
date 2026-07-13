package com.estundnzettl.core.backup

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.fail

/**
 * Cross-Validierung gegen Fixtures, die von der ECHTEN TS-Implementierung
 * (src/utils/storageBackup.ts via Vitest) erzeugt wurden. Wenn diese Tests
 * grün sind, verifizieren sich Backups beider Apps gegenseitig.
 */
class BackupJsonTest {

    private fun loadFixture(name: String): String =
        javaClass.getResourceAsStream("/fixtures/$name")?.bufferedReader()?.readText()
            ?: fail("Fixture $name nicht gefunden")

    // ─── Referenz-Backup (v7) ────────────────────────────────

    @Test
    fun `TS-generiertes v7-Backup verifiziert als VERIFIED`() {
        val payload = Json.parseToJsonElement(loadFixture("backup-v7-reference.json"))
        assertEquals(BackupIntegrity.VERIFIED, verifyBackupIntegrity(payload))
    }

    @Test
    fun `manipuliertes Backup verifiziert als MISMATCH`() {
        val payload = Json.parseToJsonElement(loadFixture("backup-v7-reference.json")).jsonObject
        val tampered = JsonObject(payload + ("note" to JsonPrimitive("manipuliert")))
        assertEquals(BackupIntegrity.MISMATCH, verifyBackupIntegrity(tampered))
    }

    @Test
    fun `Payload ohne checksum ist UNVERIFIED`() {
        val payload = Json.parseToJsonElement(loadFixture("backup-v7-reference.json")).jsonObject
        val withoutChecksum = JsonObject(payload.filterKeys { it != "checksum" })
        assertEquals(BackupIntegrity.UNVERIFIED, verifyBackupIntegrity(withoutChecksum))
    }

    @Test
    fun `Checksum des Referenz-Backups wird identisch berechnet`() {
        val payload = Json.parseToJsonElement(loadFixture("backup-v7-reference.json")).jsonObject
        val expected = payload.getValue("checksum").jsonPrimitive.content
        assertEquals(expected, computeBackupChecksum(payload))
    }

    // ─── Edge-Case-Checksummen (Umlaute, Escapes, Key-Sortierung) ──

    @Test
    fun `Edge-Case-Checksummen stimmen mit der TS-Implementierung ueberein`() {
        val fixture = Json.parseToJsonElement(loadFixture("checksum-cases.json")).jsonObject
        val cases = fixture.getValue("cases").jsonObject
        val checksums = fixture.getValue("checksums").jsonObject

        for ((name, case) in cases) {
            val expected = checksums.getValue(name).jsonObject
                .getValue("checksum").jsonPrimitive.content
            val actual = computeBackupChecksum(case.jsonObject)
            assertEquals(expected, actual, "Checksum-Mismatch für Case '$name'")
        }
    }

    // ─── attachBackupChecksum ────────────────────────────────

    @Test
    fun `attachBackupChecksum fuegt formatVersion und checksum hinzu`() {
        val payload = JsonObject(mapOf("entries" to JsonPrimitive("x")))
        val result = attachBackupChecksum(payload)
        assertEquals(BACKUP_FORMAT_VERSION, result.getValue("formatVersion").jsonPrimitive.content.toInt())
        assertNotNull(result["checksum"])
        assertEquals(BackupIntegrity.VERIFIED, verifyBackupIntegrity(result))
    }

    @Test
    fun `checksum-Feld wird bei der Berechnung ignoriert`() {
        val without = JsonObject(mapOf("a" to JsonPrimitive(1)))
        val with = JsonObject(mapOf("a" to JsonPrimitive(1), "checksum" to JsonPrimitive("egal")))
        assertEquals(computeBackupChecksum(without), computeBackupChecksum(with))
    }
}
