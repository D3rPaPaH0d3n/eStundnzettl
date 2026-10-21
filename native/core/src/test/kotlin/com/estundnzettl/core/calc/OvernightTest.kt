package com.estundnzettl.core.calc

import com.estundnzettl.core.backup.analyzeBackupData
import com.estundnzettl.core.backup.toBackupJson
import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.putJsonArray
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

/** Nächtigung: reine Markierung — rechnet nichts, reist aber überall mit. */
class OvernightTest {

    private val workDays = listOf(0, 510, 510, 510, 510, 270, 0)
    private val user = UserData(workDays = workDays)
    private val config = getDefaultCalculationConfig(austriaLocale, workDays)

    private fun save(entryType: String, overnight: Boolean, code: Int = WorkCodes.OFFICE): Entry {
        val result = prepareEntryToSave(
            EntryFormInput(
                entryType = entryType, formDate = "2026-10-20", startTime = "06:00", endTime = "17:00",
                pauseDuration = 30, project = "Spielberg", code = code, overnight = overnight,
            ),
            entries = emptyList(), userData = user, workCodes = emptyList(), newEntryId = 1,
            locale = austriaLocale, config = config,
        )
        return assertIs<SaveEntryResult.Success>(result).entry
    }

    @Test
    fun `Nachtigung wird bei Arbeit gespeichert und rechnet nichts`() {
        val with = save("work", overnight = true)
        val without = save("work", overnight = false)
        assertTrue(with.overnight)
        assertFalse(without.overnight)
        assertEquals(without.netDuration, with.netDuration)
    }

    @Test
    fun `Fahrzeit und Sondertypen tragen keine Nachtigung`() {
        assertFalse(save("drive", overnight = true, code = WorkCodes.DRIVE).overnight)
        assertFalse(save("vacation", overnight = true).overnight)
        assertFalse(save("time_comp", overnight = true).overnight)
    }

    @Test
    fun `Backup schreibt das Feld nur wenn gesetzt und liest es zurueck`() {
        val plain = Entry(id = EntryId.of(1), type = EntryType.WORK, date = "2026-10-20", netDuration = 630)
        val night = plain.copy(id = EntryId.of(2), overnight = true)
        assertFalse(plain.toBackupJson().containsKey("overnight"))
        assertTrue(night.toBackupJson().containsKey("overnight"))

        val payload = buildJsonObject {
            putJsonArray("entries") {
                add(plain.toBackupJson())
                add(night.toBackupJson())
            }
        }
        val restored = analyzeBackupData(payload).entries.associateBy { it.id }
        assertFalse(restored.getValue(EntryId.of(1)).overnight)
        assertTrue(restored.getValue(EntryId.of(2)).overnight)
    }

    @Test
    fun `Archiv-Hash reagiert auf die Nachtigung`() {
        val entry = Entry(id = EntryId.of(1), type = EntryType.WORK, date = "2026-10-20", netDuration = 630)
        fun hash(e: Entry) = hashMonthContent(listOf(e), user, 2026, 10, austriaLocale, config, LocalDate.of(2026, 10, 21))
        assertNotEquals(hash(entry), hash(entry.copy(overnight = true)))
    }
}
