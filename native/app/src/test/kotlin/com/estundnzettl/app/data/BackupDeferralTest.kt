package com.estundnzettl.app.data

import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.time.Duration
import java.time.Instant
import javax.net.ssl.SSLHandshakeException

class BackupDeferralTest {

    private val now = Instant.parse("2026-10-21T20:52:00Z")
    private val minutesAgo = now.minus(Duration.ofMinutes(6))

    @Test
    fun `blocked or missing network counts as connectivity error`() {
        // Genau der Fehler aus dem Screenshot: Android sperrt das Netz im Hintergrund
        assertTrue(isConnectivityError(UnknownHostException("Unable to resolve host \"www.googleapis.com\"")))
        assertTrue(isConnectivityError(ConnectException("Failed to connect")))
        assertTrue(isConnectivityError(SocketTimeoutException("timeout")))
        assertTrue(isConnectivityError(IOException("upload", UnknownHostException("cloud.kainer.co.at"))))
        assertTrue(isConnectivityError(ApiException(Status(CommonStatusCodes.NETWORK_ERROR))))
    }

    @Test
    fun `server and account problems stay real failures`() {
        assertFalse(isConnectivityError(SSLHandshakeException("certificate expired")))
        assertFalse(isConnectivityError(GoogleDriveManager.DriveApiException("Upload", 401)))
        assertFalse(isConnectivityError(NextcloudClient.NextcloudException("Nicht autorisiert (401)")))
        assertFalse(isConnectivityError(ApiException(Status(CommonStatusCodes.DEVELOPER_ERROR))))
    }

    @Test
    fun `connectivity error is retried quietly after a recent success`() {
        assertTrue(shouldDeferBackupFailure(UnknownHostException(), minutesAgo, now))
        assertFalse(shouldDeferBackupFailure(GoogleDriveManager.DriveApiException("Upload", 401), minutesAgo, now))
    }

    @Test
    fun `long outage or never succeeded is reported`() {
        val dayAndAHalfAgo = now.minus(Duration.ofHours(36))
        assertFalse(shouldDeferBackupFailure(UnknownHostException(), dayAndAHalfAgo, now))
        assertFalse(shouldDeferBackupFailure(UnknownHostException(), null, now))
    }
}
