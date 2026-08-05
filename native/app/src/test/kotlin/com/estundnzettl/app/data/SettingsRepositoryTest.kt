package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.SettingRow
import com.estundnzettl.app.data.db.SettingsDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Test
import kotlin.test.assertEquals

class SettingsRepositoryTest {

    @Test
    fun `getInt accepts json numbers and numeric strings`() = runBlocking {
        val dao = RecordingSettingsDao()
        val repository = SettingsRepository(dao)

        dao.values["number"] = "7"
        dao.values["string"] = "\"19\""
        dao.values["broken"] = "\"nope\""

        assertEquals(7, repository.getInt("number"))
        assertEquals(19, repository.getInt("string"))
        assertEquals(null, repository.getInt("broken"))
    }

    @Test
    fun `setRawBatch writes related settings together`() = runBlocking {
        val dao = RecordingSettingsDao()
        val repository = SettingsRepository(dao)

        repository.setRawBatch(
            mapOf(
                "gdrive_account_email" to JsonPrimitive("Google"),
                SettingsRepository.Keys.CLOUD_SYNC_ENABLED to JsonPrimitive(true),
            ),
        )

        assertEquals(1, dao.putAllCalls)
        assertEquals(0, dao.putCalls)
        assertEquals("\"Google\"", dao.values["gdrive_account_email"])
        assertEquals("true", dao.values[SettingsRepository.Keys.CLOUD_SYNC_ENABLED])
    }
}

private class RecordingSettingsDao : SettingsDao {
    val values = linkedMapOf<String, String>()
    var putCalls = 0
    var putAllCalls = 0

    override suspend fun getValue(key: String): String? = values[key]

    override fun observeValue(key: String): Flow<String?> = flowOf(values[key])

    override suspend fun getAll(): List<SettingRow> =
        values.map { (key, value) -> SettingRow(key, value) }

    override suspend fun put(setting: SettingRow) {
        putCalls++
        values[setting.key] = setting.value
    }

    override suspend fun putAll(settings: List<SettingRow>) {
        putAllCalls++
        settings.forEach { values[it.key] = it.value }
    }

    override suspend fun delete(key: String) {
        values.remove(key)
    }
}
