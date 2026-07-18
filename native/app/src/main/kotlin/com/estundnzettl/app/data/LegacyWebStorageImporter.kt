package com.estundnzettl.app.data

import android.annotation.SuppressLint
import android.app.Activity
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.room.withTransaction
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.app.data.db.SettingRow
import java.io.File
import java.time.Instant
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

enum class LegacyWebImportStatus { NOT_FOUND, ALREADY_DONE, CHECKED, IMPORTED }

data class LegacyWebImportResult(
    val status: LegacyWebImportStatus,
    val importedItems: Int = 0,
)

/**
 * Reads the retained Capacitor WebView origin without parsing Chromium's
 * private LevelDB format. Only a static in-memory page is loaded; file/content
 * access and network navigation are disabled.
 */
class LegacyWebStorageImporter(
    private val activity: Activity,
    private val db: AppDatabase,
    private val secrets: SecretStore,
) {
    companion object {
        private const val TAG = "LegacyWebImport"
        const val MIGRATION_MARKER_KEY = "native_web_storage_migration_done"
        const val MIGRATION_REPORT_KEY = "native_web_storage_migration_report"
        private const val LEGACY_ORIGIN = "https://localhost/"
    }

    suspend fun importIfNeeded(): LegacyWebImportResult {
        if (db.settingsDao().getValue(MIGRATION_MARKER_KEY) != null) {
            return LegacyWebImportResult(LegacyWebImportStatus.ALREADY_DONE)
        }

        // Test this before constructing WebView, because WebView itself creates
        // app_webview on a clean native installation.
        val oldWebViewDirectory = File(activity.applicationInfo.dataDir, "app_webview")
        if (!oldWebViewDirectory.exists()) {
            return LegacyWebImportResult(LegacyWebImportStatus.NOT_FOUND)
        }

        val values = withTimeout(8_000) { readLegacyLocalStorage() }
        return importValues(values)
    }

    internal suspend fun importValues(values: Map<String, String>): LegacyWebImportResult {
        val existingSettings = db.settingsDao().getAll()
        val existingSettingKeys = existingSettings.mapTo(mutableSetOf()) { it.key }
        val currentEntries = db.entryDao().getAll()
        val currentCodes = db.workCodeDao().getAll()
        val currentAttachments = db.attachmentDao().getAll()
        val currentLabels = db.attachmentLabelDao().getAll()

        val mapped = LegacyLocalStorageMapper.map(
            values = values,
            existingSettingKeys = existingSettingKeys,
            needsEntries = currentEntries.isEmpty(),
            needsWorkCodes = currentCodes.isEmpty(),
            needsAttachments = currentAttachments.isEmpty(),
            needsLabels = currentLabels.isEmpty(),
        )

        val masterKey = existingSettings.firstOrNull { it.key == "crypto_mk_v1" }
            ?.value
            ?.let { raw ->
                runCatching { Json.parseToJsonElement(raw).jsonPrimitive.contentOrNull }.getOrNull()
            }
        secrets.migrateLegacyRawNextcloudSecret(mapped.legacyNextcloudSecret, masterKey)

        val completedAt = Instant.now().toString()
        db.withTransaction {
            if (currentEntries.isEmpty()) db.entryDao().insertAll(mapped.entries)
            if (currentCodes.isEmpty()) db.workCodeDao().insertAll(mapped.workCodes)
            if (currentAttachments.isEmpty()) db.attachmentDao().insertAll(mapped.attachments)
            if (currentLabels.isEmpty()) db.attachmentLabelDao().insertAll(mapped.labels)
            db.settingsDao().putAll(mapped.settings)

            check(db.entryDao().getAll().containsAll(mapped.entries)) { "Web storage entry verification failed" }
            check(db.workCodeDao().getAll().containsAll(mapped.workCodes)) { "Web storage work-code verification failed" }
            check(db.attachmentDao().getAll().containsAll(mapped.attachments)) { "Web storage attachment verification failed" }
            check(db.attachmentLabelDao().getAll().containsAll(mapped.labels)) { "Web storage label verification failed" }
            val writtenSettings = db.settingsDao().getAll().associate { it.key to it.value }
            check(mapped.settings.all { writtenSettings[it.key] == it.value }) {
                "Web storage settings verification failed"
            }

            val report = buildJsonObject {
                put("completedAt", completedAt)
                put("sourceKeys", values.size)
                put("importedItems", mapped.importedItemCount)
                put("entries", mapped.entries.size)
                put("settings", mapped.settings.size)
                put("workCodes", mapped.workCodes.size)
                put("attachments", mapped.attachments.size)
                put("attachmentLabels", mapped.labels.size)
            }
            val markers = mutableListOf(
                SettingRow(MIGRATION_MARKER_KEY, JsonPrimitive(completedAt).toString()),
                SettingRow(MIGRATION_REPORT_KEY, report.toString()),
            )
            if (mapped.importedItemCount > 0 &&
                db.settingsDao().getValue(LegacyDbImporter.MIGRATION_MARKER_KEY) == null
            ) {
                markers += SettingRow(
                    LegacyDbImporter.MIGRATION_MARKER_KEY,
                    JsonPrimitive(completedAt).toString(),
                )
            }
            db.settingsDao().putAll(markers)
        }

        val status = if (mapped.importedItemCount > 0) {
            LegacyWebImportStatus.IMPORTED
        } else {
            LegacyWebImportStatus.CHECKED
        }
        Log.i(TAG, "Capacitor localStorage checked: status=$status, items=${mapped.importedItemCount}")
        return LegacyWebImportResult(status, mapped.importedItemCount)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private suspend fun readLegacyLocalStorage(): Map<String, String> =
        suspendCancellableCoroutine { continuation ->
            val webView = WebView(activity)
            var finished = false

            fun cleanup() {
                if (finished) return
                finished = true
                webView.stopLoading()
                webView.removeJavascriptInterface("MigrationBridge")
                webView.destroy()
            }

            val bridge = object {
                @JavascriptInterface
                fun onResult(raw: String) {
                    activity.runOnUiThread {
                        if (!continuation.isActive) {
                            cleanup()
                            return@runOnUiThread
                        }
                        val result = runCatching {
                            val root = Json.parseToJsonElement(raw) as JsonObject
                            root.mapValues { (_, value) -> value.jsonPrimitive.content }
                        }
                        cleanup()
                        result.fold(continuation::resume, continuation::resumeWithException)
                    }
                }

                @JavascriptInterface
                fun onError(message: String) {
                    activity.runOnUiThread {
                        if (continuation.isActive) {
                            cleanup()
                            continuation.resumeWithException(
                                IllegalStateException("Capacitor localStorage read failed: $message")
                            )
                        } else {
                            cleanup()
                        }
                    }
                }
            }

            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
            }
            webView.addJavascriptInterface(bridge, "MigrationBridge")
            continuation.invokeOnCancellation { activity.runOnUiThread(::cleanup) }
            val page = """
                <!doctype html><meta charset="utf-8"><script>
                (() => {
                  try {
                    const values = {};
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key !== null) values[key] = localStorage.getItem(key) ?? '';
                    }
                    MigrationBridge.onResult(JSON.stringify(values));
                  } catch (error) {
                    MigrationBridge.onError(String(error && error.message ? error.message : error));
                  }
                })();
                </script>
            """.trimIndent()
            webView.loadDataWithBaseURL(LEGACY_ORIGIN, page, "text/html", "UTF-8", null)
        }
}
