package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.SettingRow
import com.estundnzettl.app.data.db.SettingsDao
import com.estundnzettl.core.calc.getDefaultCalculationConfig
import com.estundnzettl.core.config.coerceCalculationConfig
import com.estundnzettl.core.config.decodeUserData
import com.estundnzettl.core.config.toJson
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.locale.isLocaleId
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.UserData
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive

/**
 * Typisierter Settings-Store über der Key-Value-Tabelle.
 *
 * Werte werden als JSON-Strings gespeichert (auch für primitive Werte) —
 * exakt wie settingsRepo.ts der TS-App (`JSON.stringify` beim Schreiben,
 * `JSON.parse` mit Raw-Fallback beim Lesen). Dadurch bleibt die Tabelle
 * beim Datenimport aus der Capacitor-DB 1:1 kompatibel.
 */
class SettingsRepository(private val dao: SettingsDao) {

    /** Bekannte Settings-Keys (Auszug; identisch zur TS-App). */
    object Keys {
        const val USER = "user"
        const val THEME = "theme"
        const val LOCALE = "locale"
        const val LANGUAGE = "language"
        const val CALCULATION_CONFIG = "calculationConfig"
        const val CLOUD_SYNC_ENABLED = "cloud_sync_enabled"
        const val LOCAL_BACKUP_ENABLED = "local_backup_enabled"
        const val NEXTCLOUD_ENABLED = "nextcloud_enabled"
        const val NEXTCLOUD_URL = "nextcloud_url"
        const val NEXTCLOUD_USER = "nextcloud_user"
        const val BACKUP_TARGET = "backup_target"
        const val LAST_BACKUP = "last_backup"
    }

    private val json = Json { ignoreUnknownKeys = true }

    // ─── Roh-Zugriff (JSON.parse-Semantik) ───────────────────

    /** Geparstes JSON oder null; bei kaputtem JSON der Raw-String (wie TS). */
    suspend fun getRaw(key: String): JsonElement? {
        val value = dao.getValue(key) ?: return null
        return runCatching { json.parseToJsonElement(value) }
            .getOrElse { JsonPrimitive(value) }
    }

    suspend fun setRaw(key: String, value: JsonElement) {
        dao.put(SettingRow(key, value.toString()))
    }

    /** Schreibt zusammengehörige Einstellungen in einem Room-Aufruf. */
    suspend fun setRawBatch(values: Map<String, JsonElement>) {
        dao.putAll(values.map { (key, value) -> SettingRow(key, value.toString()) })
    }

    suspend fun delete(key: String) = dao.delete(key)

    // ─── Typisierte Zugriffe ─────────────────────────────────

    suspend fun getString(key: String): String? =
        (getRaw(key) as? JsonPrimitive)?.takeIf { it.isString }?.content

    suspend fun setString(key: String, value: String) = setRaw(key, JsonPrimitive(value))

    suspend fun getBoolean(key: String): Boolean =
        (getRaw(key) as? JsonPrimitive)?.content == "true"

    suspend fun setBoolean(key: String, value: Boolean) = setRaw(key, JsonPrimitive(value))

    suspend fun getUserData(): UserData? = decodeUserData(getRaw(Keys.USER))

    suspend fun setUserData(user: UserData) = setRaw(Keys.USER, user.toJson())

    suspend fun getLocaleId(): String? = getString(Keys.LOCALE)?.takeIf { isLocaleId(it) }

    suspend fun setLocaleId(localeId: String) = setString(Keys.LOCALE, localeId)

    suspend fun getTheme(): String = getString(Keys.THEME) ?: "system"

    suspend fun setTheme(theme: String) = setString(Keys.THEME, theme)

    /**
     * CalculationConfig mit Koerzierung: fehlende/kaputte Felder werden aus
     * den Locale-Defaults ergänzt (Verhalten von coerceCalculationConfig).
     */
    suspend fun getCalculationConfig(workDays: List<Int>?): CalculationConfig {
        val locale = getLocale(getLocaleId())
        val fallback = getDefaultCalculationConfig(locale, workDays)
        return coerceCalculationConfig(getRaw(Keys.CALCULATION_CONFIG), fallback)
    }

    suspend fun setCalculationConfig(config: CalculationConfig) =
        setRaw(Keys.CALCULATION_CONFIG, config.toJson())

    fun observeTheme(): Flow<String> = dao.observeValue(Keys.THEME).map { value ->
        value?.let { raw ->
            runCatching { json.parseToJsonElement(raw).jsonPrimitive.content }.getOrNull()
        } ?: "system"
    }
}
