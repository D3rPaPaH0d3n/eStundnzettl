package com.estundnzettl.app.data

import android.content.Context
import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.HttpURLConnection
import java.net.URL

/**
 * GitHub-Release-Update-Check — Port von useUpdateAvailable.ts.
 *
 * Aktiv nur bei Sideload-Installationen: Play Store, Amazon und Huawei
 * liefern Updates selbst und sollen keinen Banner sehen (fail-closed —
 * wenn die Installationsquelle nicht bestimmbar ist, bleibt der Check
 * still). Fragt maximal einmal pro 24 h die Releases-API ab.
 */
object UpdateCheck {

    data class Release(val tag: String, val url: String)

    private val STORE_INSTALLERS = setOf(
        "com.android.vending",  // Google Play Store
        "com.amazon.venezia",   // Amazon Appstore
        "com.huawei.appmarket", // Huawei AppGallery
    )

    private const val RELEASE_API_URL =
        "https://api.github.com/repos/D3rPaPaH0d3n/eStundnzettl/releases/latest"
    private const val CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000L
    private const val NETWORK_TIMEOUT_MS = 8000

    const val KEY_LAST_CHECK = "github_update_last_check_ts"
    const val KEY_LAST_RESULT = "github_update_last_result"
    const val KEY_DISMISSED = "github_update_dismissed_for_version"

    private val json = Json { ignoreUnknownKeys = true }

    /** Installationsquelle; null = Sideload (adb/APK-Datei). */
    private fun installerPackage(context: Context): String? = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.getInstallerPackageName(context.packageName)
        }
    } catch (_: Exception) {
        // fail-closed wie das Original: Quelle unbekannt → als Store behandeln
        STORE_INSTALLERS.first()
    }

    /** Semver-Vergleich, tolerant gegen v-Präfix und Pre-Release-Suffixe. */
    fun compareSemver(a: String, b: String): Int {
        fun parts(v: String) = v.removePrefix("v").removePrefix("V")
            .substringBefore("-").split(".").map { it.toIntOrNull() ?: 0 }
        val ap = parts(a)
        val bp = parts(b)
        for (i in 0 until maxOf(ap.size, bp.size)) {
            val av = ap.getOrElse(i) { 0 }
            val bv = bp.getOrElse(i) { 0 }
            if (av != bv) return av - bv
        }
        return 0
    }

    /**
     * Liefert das neuere Release oder null. Debug-Builds prüfen nie
     * (Pendant zum APP_VERSION === "dev"-Guard des Originals).
     */
    suspend fun check(
        context: Context,
        settings: SettingsRepository,
        currentVersion: String,
        isDebugBuild: Boolean,
    ): Release? {
        if (isDebugBuild) return null
        val installer = installerPackage(context)
        if (installer != null && installer in STORE_INSTALLERS) return null

        // 24h-Cache
        val lastTs = settings.getString(KEY_LAST_CHECK)?.toLongOrNull()
        val cachedRaw = settings.getString(KEY_LAST_RESULT)
        val release: Release? = if (
            lastTs != null && cachedRaw != null &&
            System.currentTimeMillis() - lastTs < CHECK_INTERVAL_MS
        ) {
            runCatching {
                val obj = json.parseToJsonElement(cachedRaw).jsonObject
                Release(
                    obj["latestTag"]!!.jsonPrimitive.content,
                    obj["htmlUrl"]!!.jsonPrimitive.content,
                )
            }.getOrNull()
        } else {
            fetchLatest()?.also { fetched ->
                settings.setString(KEY_LAST_CHECK, System.currentTimeMillis().toString())
                settings.setString(
                    KEY_LAST_RESULT,
                    """{"latestTag":"${fetched.tag}","htmlUrl":"${fetched.url}"}""",
                )
            }
        }

        val result = release ?: return null
        if (compareSemver(result.tag, currentVersion) <= 0) return null
        if (settings.getString(KEY_DISMISSED) == result.tag) return null
        return result
    }

    private suspend fun fetchLatest(): Release? = withContext(Dispatchers.IO) {
        try {
            val connection = URL(RELEASE_API_URL).openConnection() as HttpURLConnection
            connection.connectTimeout = NETWORK_TIMEOUT_MS
            connection.readTimeout = NETWORK_TIMEOUT_MS
            connection.setRequestProperty("Accept", "application/vnd.github+json")
            try {
                if (connection.responseCode != 200) return@withContext null
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                val obj = json.parseToJsonElement(body).jsonObject
                if (obj["draft"]?.jsonPrimitive?.boolean == true) return@withContext null
                if (obj["prerelease"]?.jsonPrimitive?.boolean == true) return@withContext null
                val tag = obj["tag_name"]?.jsonPrimitive?.content ?: return@withContext null
                val url = obj["html_url"]?.jsonPrimitive?.content ?: return@withContext null
                Release(tag, url)
            } finally {
                connection.disconnect()
            }
        } catch (_: Exception) {
            null
        }
    }
}
