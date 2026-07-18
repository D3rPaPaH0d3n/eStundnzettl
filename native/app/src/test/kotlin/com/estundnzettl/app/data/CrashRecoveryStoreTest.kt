package com.estundnzettl.app.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CrashRecoveryStoreTest {
    @Test
    fun `diagnostic contains technical context and stack trace`() {
        val result = buildCrashDiagnostic(
            throwable = IllegalStateException("kaputt"),
            timestamp = "2026-07-17T20:00:00Z",
            appVersion = "5.0.0 (300)",
            androidVersion = "16 / API 36",
            device = "Google Pixel",
        )

        assertTrue(result.contains("5.0.0 (300)"))
        assertTrue(result.contains("IllegalStateException: kaputt"))
        assertTrue(result.contains("Google Pixel"))
    }

    @Test
    fun `diagnostic never contains app data labels by itself`() {
        val result = buildCrashDiagnostic(
            RuntimeException("test"), "now", "version", "android", "device",
        )
        assertFalse(result.contains("Arbeitszeiten:"))
        assertFalse(result.contains("Profil:"))
        assertFalse(result.contains("Backup:"))
    }
}
