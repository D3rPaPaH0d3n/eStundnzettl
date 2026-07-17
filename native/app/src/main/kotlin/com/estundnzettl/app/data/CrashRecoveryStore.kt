package com.estundnzettl.app.data

import android.content.Context
import android.os.Build
import com.estundnzettl.app.BuildConfig
import java.io.PrintWriter
import java.io.StringWriter
import java.time.Instant

private const val MAX_DIAGNOSTIC_LENGTH = 24_000

data class CrashReport(val diagnostic: String)

internal fun buildCrashDiagnostic(
    throwable: Throwable,
    timestamp: String,
    appVersion: String,
    androidVersion: String,
    device: String,
): String {
    val trace = StringWriter().also { throwable.printStackTrace(PrintWriter(it)) }.toString()
    return buildString {
        appendLine("eStundnzettl Diagnose")
        appendLine("Zeit: $timestamp")
        appendLine("App: $appVersion")
        appendLine("Android: $androidVersion")
        appendLine("Gerät: $device")
        appendLine()
        append(trace.take(MAX_DIAGNOSTIC_LENGTH))
    }
}

/** Speichert nur technische Crashdaten, niemals Einträge, Profil oder Backups. */
class CrashRecoveryStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun read(): CrashReport? = prefs.getString(KEY_REPORT, null)
        ?.takeIf { it.isNotBlank() }
        ?.let(::CrashReport)

    fun record(throwable: Throwable) {
        val report = buildCrashDiagnostic(
            throwable = throwable,
            timestamp = Instant.now().toString(),
            appVersion = "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
            androidVersion = "${Build.VERSION.RELEASE} / API ${Build.VERSION.SDK_INT}",
            device = "${Build.MANUFACTURER} ${Build.MODEL}",
        )
        prefs.edit().putString(KEY_REPORT, report).commit()
    }

    fun clear() {
        prefs.edit().remove(KEY_REPORT).apply()
    }

    companion object {
        private const val PREFS_NAME = "estundnzettl_crash_recovery"
        private const val KEY_REPORT = "last_crash_report"
    }
}
