package com.estundnzettl.core.backup

import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.WorkCode
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * composeBackupPayload: Ein von Kotlin erzeugtes Backup muss dieselbe
 * Checksum ergeben wie die TS-App für denselben Inhalt — bewiesen über
 * die von der echten TS-Implementierung erzeugte Referenz-Fixture.
 */
class BackupComposerTest {

    @Test
    fun `Kotlin-Export reproduziert die TS-Checksum des Referenz-Backups`() {
        val fixture = Json.parseToJsonElement(
            javaClass.getResourceAsStream("/fixtures/backup-v7-reference.json")!!
                .bufferedReader().readText()
        ).jsonObject

        // Sektionen aus der Fixture nachbauen (wie sie die App aus der DB lesen würde)
        val entries = listOf(
            Entry(EntryId.of(1736531200000123L), EntryType.WORK, "2026-01-05", "07:00", "16:30", 30, "Baustelle Nüßler-Straße", 14, 540),
            Entry(EntryId.of("legacy-abc-42"), EntryType.WORK, "2026-01-06", "22:00", "06:00", 0, null, 19, 480),
            Entry(EntryId.of(3L), EntryType.VACATION, "2026-01-07", null, null, 0, null, null, 510),
            Entry(EntryId.of(4L), EntryType.SICK, "2026-01-08", null, null, 0, null, null, 510),
        )
        val sections = BackupSections(
            user = fixture["user"],
            entries = entries,
            workCodes = listOf(WorkCode(14, "14 - Wartung"), WorkCode(19, "19 - Fahrzeit")),
            attachments = listOf(
                Attachment("att-1", EntryId.of(1736531200000123L), "Lieferschein", "schein.pdf", "application/pdf", "attachments/att-1.pdf", 12345, "2026-01-05T12:00:00.000Z"),
                Attachment("att-2", EntryId.of("legacy-abc-42"), "Foto", "foto.jpg", "image/jpeg", "attachments/att-2.jpg", 998877, "2026-01-06T08:15:30.500Z"),
            ),
            attachmentLabels = listOf("Lieferschein", "Foto", "Notiz äöü ß €"),
            calculationConfig = fixture["calculationConfig"],
            locale = "at",
            theme = "dark",
        )

        val payload = composeBackupPayload(
            sections,
            note = "eStundnzettl Manueller Backup",
            lastModified = "2026-07-13T12:00:00.000Z",
            timezone = "Europe/Vienna",
        )

        // Byte-identische Checksum wie die TS-App (Fixture-Wert)
        val expectedChecksum = fixture.getValue("checksum").jsonPrimitive.content
        assertEquals(expectedChecksum, payload.getValue("checksum").jsonPrimitive.content)
        assertEquals(BackupIntegrity.VERIFIED, verifyBackupIntegrity(payload))
        assertEquals("v7", payload.getValue("version").jsonPrimitive.content)
        assertEquals(2, payload.getValue("formatVersion").jsonPrimitive.content.toInt())
        assertEquals(4, payload.getValue("entries").jsonArray.size)
    }

    @Test
    fun `TS-Backup wird nach Analyse und Re-Export checksum-stabil reproduziert`() {
        // Roundtrip: TS-Fixture → analyzeBackupData → composeBackupPayload
        // Beweist, dass Import + Re-Export keine Daten verändert.
        val fixture = Json.parseToJsonElement(
            javaClass.getResourceAsStream("/fixtures/backup-v7-reference.json")!!
                .bufferedReader().readText()
        ).jsonObject

        val analysis = analyzeBackupData(fixture)
        val reExported = composeBackupPayload(
            BackupSections(
                user = analysis.settings,
                entries = analysis.entries,
                workCodes = analysis.workCodes,
                attachments = analysis.attachments,
                attachmentLabels = analysis.attachmentLabels,
                calculationConfig = analysis.calculationConfig,
                locale = analysis.locale,
                theme = analysis.theme,
            ),
            note = fixture.getValue("note").jsonPrimitive.content,
            lastModified = fixture.getValue("lastModified").jsonPrimitive.content,
            timezone = fixture.getValue("timezone").jsonPrimitive.content,
        )

        assertEquals(
            fixture.getValue("checksum").jsonPrimitive.content,
            reExported.getValue("checksum").jsonPrimitive.content,
        )
    }
}
