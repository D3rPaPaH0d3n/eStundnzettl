package com.estundnzettl.core.backup

import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Port der analyzeBackupData-Tests aus src/utils/__tests__/storageBackup.test.ts.
 */
class BackupAnalyzerTest {

    private fun parse(json: String) = Json.parseToJsonElement(json)

    @Test
    fun `lehnt null ab`() {
        assertFalse(analyzeBackupData(null).valid)
    }

    @Test
    fun `lehnt Daten ohne nutzbare Felder ab`() {
        assertFalse(analyzeBackupData(parse("""{"foo":"bar"}""")).valid)
        assertFalse(analyzeBackupData(parse("""{"entries":[]}""")).valid)
    }

    @Test
    fun `akzeptiert Payload mit Entries und markiert Legacy-Format als unverified`() {
        val result = analyzeBackupData(parse(
            """{"entries":[{"id":1,"date":"2024-01-01","type":"work","start":"08:00","end":"17:00","pause":30,"netDuration":510}]}"""
        ))
        assertTrue(result.valid)
        assertEquals(1, result.entryCount)
        assertEquals(BackupIntegrity.UNVERIFIED, result.integrity)
    }

    @Test
    fun `filtert ungueltige Entries (Schutz gegen kaputte Exports)`() {
        val result = analyzeBackupData(parse(
            """{"entries":[
                {"id":1,"date":"2024-01-01","type":"work"},
                {"date":"2024-01-02","type":"work"},
                {"id":3,"type":"work"},
                {"id":4,"date":"2024-01-04"},
                {"id":5,"date":"2024-01-05","type":"vacation"}
            ]}"""
        ))
        assertTrue(result.valid)
        assertEquals(2, result.entryCount)
        assertEquals(EntryId.of(1L), result.entries[0].id)
        assertEquals(EntryId.of(5L), result.entries[1].id)
        assertEquals(EntryType.VACATION, result.entries[1].type)
    }

    @Test
    fun `behaelt String-Entry-IDs fuer Legacy-Attachment-Links bei`() {
        val result = analyzeBackupData(parse(
            """{
                "entries":[{"id":"legacy-42","date":"2024-01-01","type":"work"}],
                "attachments":[{"id":"att-1","entryId":"legacy-42","label":"Schein"}]
            }"""
        ))
        assertTrue(result.valid)
        assertEquals(EntryId.of("legacy-42"), result.entries[0].id)
        assertEquals(EntryId.of("legacy-42"), result.attachments[0].entryId)
    }

    @Test
    fun `extrahiert gueltige locale und theme (v7)`() {
        val result = analyzeBackupData(parse(
            """{
                "entries":[{"id":1,"date":"2024-01-01","type":"work"}],
                "locale":"de-by","theme":"dark"
            }"""
        ))
        assertEquals("de-by", result.locale)
        assertEquals("dark", result.theme)
    }

    @Test
    fun `verwirft ungueltige locale und theme Werte`() {
        val result = analyzeBackupData(parse(
            """{
                "entries":[{"id":1,"date":"2024-01-01","type":"work"}],
                "locale":"fr","theme":"neon"
            }"""
        ))
        assertNull(result.locale)
        assertNull(result.theme)
    }

    @Test
    fun `akzeptiert Legacy-Formate (data-entries, items, codes, files, labels)`() {
        val viaData = analyzeBackupData(parse(
            """{"data":{"entries":[{"id":1,"date":"2024-01-01","type":"work"}]}}"""
        ))
        assertTrue(viaData.valid)
        assertEquals(1, viaData.entryCount)

        val viaItems = analyzeBackupData(parse(
            """{"items":[{"id":1,"date":"2024-01-01","type":"work"}]}"""
        ))
        assertTrue(viaItems.valid)

        val legacyKeys = analyzeBackupData(parse(
            """{
                "profile":{"name":"Max"},
                "codes":[{"id":1,"label":"01 - Arbeit"}],
                "files":[{"id":"a1","entryId":1}],
                "labels":["Schein"]
            }"""
        ))
        assertTrue(legacyKeys.valid)
        assertTrue(legacyKeys.hasSettings)
        assertEquals(1, legacyKeys.workCodes.size)
        assertEquals(1, legacyKeys.attachments.size)
        assertEquals(listOf("Schein"), legacyKeys.attachmentLabels)
    }

    @Test
    fun `timestamp-Fallback-Kette backupDate exportedAt lastModified timestamp`() {
        val now = "2026-07-13T00:00:00.000Z"
        assertEquals("A", analyzeBackupData(parse(
            """{"entries":[{"id":1,"date":"2024-01-01","type":"work"}],"backupDate":"A","exportedAt":"B"}"""
        ), now).timestamp)
        assertEquals("B", analyzeBackupData(parse(
            """{"entries":[{"id":1,"date":"2024-01-01","type":"work"}],"exportedAt":"B","lastModified":"C"}"""
        ), now).timestamp)
        assertEquals(now, analyzeBackupData(parse(
            """{"entries":[{"id":1,"date":"2024-01-01","type":"work"}]}"""
        ), now).timestamp)
    }

    @Test
    fun `Referenz-Backup wird vollstaendig analysiert`() {
        val fixture = javaClass.getResourceAsStream("/fixtures/backup-v7-reference.json")!!
            .bufferedReader().readText()
        val result = analyzeBackupData(parse(fixture))

        assertTrue(result.valid)
        assertEquals(4, result.entryCount)
        assertTrue(result.hasSettings)
        assertTrue(result.hasWorkCodes)
        assertTrue(result.hasAttachments)
        assertTrue(result.hasCalculationConfig)
        assertEquals("at", result.locale)
        assertEquals("dark", result.theme)
        assertEquals("2026-07-13T12:00:00.000Z", result.timestamp)
        assertEquals(BackupIntegrity.VERIFIED, result.integrity)

        // Entry-Details: numerische und String-IDs bleiben formstabil
        assertEquals(EntryId.of(1736531200000123L), result.entries[0].id)
        assertEquals(EntryId.of("legacy-abc-42"), result.entries[1].id)
        assertEquals(EntryId.of(1736531200000123L), result.attachments[0].entryId)
        assertEquals(EntryId.of("legacy-abc-42"), result.attachments[1].entryId)
        assertEquals(998877L, result.attachments[1].fileSize)
    }
}
