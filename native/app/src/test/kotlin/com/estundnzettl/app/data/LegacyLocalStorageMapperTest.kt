package com.estundnzettl.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test

class LegacyLocalStorageMapperTest {

    @Test
    fun mapsCoreDataSettingsTimerAndGoogleLabels() {
        val values = mapOf(
            "estundnzettl_entries" to
                """[{"id":"42","type":"work","date":"2026-07-18","start":"08:00","end":"16:00","pause":30,"project":"Lift","code":7,"netDuration":450}]""",
            "estundnzettl_work_codes" to """[{"id":7,"label":"Montage"}]""",
            "estundnzettl_attachments" to
                """[{"id":"a1","entryId":"42","label":"Foto","fileName":"x.jpg","mimeType":"image/jpeg","storagePath":"attachments/x.jpg","fileSize":12,"createdAt":"2026-07-18T10:00:00Z"}]""",
            "estundnzettl_attachment_labels" to """["Foto","Rechnung"]""",
            "estundnzettl_user" to """{"name":"Markus","position":"Monteur","photo":null,"workDays":[0,480,480,480,480,480,0]}""",
            "estundnzettl_language" to "de",
            "estundnzettl_live_timer" to
                """{"isRunning":true,"isPaused":false,"startTime":"2026-07-18T08:00:00Z","pauseStartTime":null,"accumulatedPause":0}""",
            "estundnzettl_backup_fail_count" to "2",
            "estundnzettl_last_code" to "7",
            "google_auth_state" to
                """{"nativeConnected":true,"accountEmail":"backup@example.com"}""",
            "google_auth_state_pdf" to
                """{"nativeConnected":true,"userInfo":{"email":"pdf@example.com"}}""",
        )

        val result = LegacyLocalStorageMapper.map(
            values,
            existingSettingKeys = emptySet(),
            needsEntries = true,
            needsWorkCodes = true,
            needsAttachments = true,
            needsLabels = true,
        )

        assertEquals(42L, result.entries.single().id)
        assertEquals("Lift", result.entries.single().project)
        assertEquals(42L, result.attachments.single().entryId)
        assertEquals("Montage", result.workCodes.single().label)
        assertEquals(listOf("Foto", "Rechnung"), result.labels.map { it.label })
        val settings = result.settings.associate { it.key to it.value }
        assertEquals("\"de\"", settings["language"])
        assertEquals("\"2\"", settings["backup_fail_count"])
        assertEquals("7", settings["last_code"])
        assertEquals("\"backup@example.com\"", settings[GoogleDriveManager.KEY_ACCOUNT_EMAIL])
        assertEquals("\"pdf@example.com\"", settings[GoogleDriveManager.KEY_PDF_ACCOUNT_EMAIL])
        assertFalse(settings["live_timer"].isNullOrEmpty())
    }

    @Test
    fun neverOverwritesAnExistingRoomSetting() {
        val result = LegacyLocalStorageMapper.map(
            values = mapOf("estundnzettl_language" to "en", "estundnzettl_theme" to "dark"),
            existingSettingKeys = setOf("language"),
            needsEntries = false,
            needsWorkCodes = false,
            needsAttachments = false,
            needsLabels = false,
        )

        assertEquals(setOf("theme"), result.settings.map { it.key }.toSet())
    }

    @Test
    fun malformedCoreArrayFailsOnlyWhenThatDomainStillNeedsMigration() {
        val values = mapOf("estundnzettl_entries" to "{broken")
        assertThrows(IllegalStateException::class.java) {
            LegacyLocalStorageMapper.map(values, emptySet(), true, false, false, false)
        }

        val skipped = LegacyLocalStorageMapper.map(values, emptySet(), false, false, false, false)
        assertEquals(emptyList<Any>(), skipped.entries)
    }
}
