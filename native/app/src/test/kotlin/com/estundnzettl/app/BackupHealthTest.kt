package com.estundnzettl.app

import com.estundnzettl.app.data.AutoBackupManager
import com.estundnzettl.app.data.GoogleDriveManager
import com.estundnzettl.app.data.NextcloudClient
import com.estundnzettl.app.data.googleDriveFailureNeedsReconnect
import com.estundnzettl.app.data.isConnectivityFailure
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.net.ConnectException
import java.net.SocketException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException
import javax.net.ssl.SSLHandshakeException

class BackupHealthTest {

    @Test
    fun `quiet warning starts after three consecutive failures`() {
        assertFalse(
            shouldShowGoogleDriveBackupWarning(
                failureCount = 2,
                reconnectRequired = false,
                alreadyShown = false,
            )
        )
        assertTrue(
            shouldShowGoogleDriveBackupWarning(
                failureCount = 3,
                reconnectRequired = false,
                alreadyShown = false,
            )
        )
        assertFalse(
            shouldShowGoogleDriveBackupWarning(
                failureCount = 3,
                reconnectRequired = false,
                alreadyShown = true,
            )
        )
    }

    @Test
    fun `lost authorization is surfaced immediately and only once`() {
        assertTrue(
            shouldShowGoogleDriveBackupWarning(
                failureCount = 1,
                reconnectRequired = true,
                alreadyShown = false,
            )
        )
        assertFalse(
            shouldShowGoogleDriveBackupWarning(
                failureCount = 1,
                reconnectRequired = true,
                alreadyShown = true,
            )
        )
    }

    @Test
    fun `missing authorization requires reconnect`() {
        assertTrue(googleDriveFailureNeedsReconnect(GoogleDriveManager.AuthRequiredException(null)))
    }

    @Test
    fun `unauthorized Drive response requires reconnect but service outage does not`() {
        assertTrue(googleDriveFailureNeedsReconnect(GoogleDriveManager.DriveApiException("Test", 401)))
        assertFalse(googleDriveFailureNeedsReconnect(GoogleDriveManager.DriveApiException("Test", 503)))
    }

    @Test
    fun `mixed target result is a partial backup`() {
        val outcome = AutoBackupManager.Outcome(
            ran = true,
            anySucceeded = true,
            allSatisfied = false,
            succeededTargets = setOf(AutoBackupManager.Target.LOCAL),
            failedTargets = setOf(AutoBackupManager.Target.GOOGLE_DRIVE),
        )

        assertTrue(outcome.isPartial)
    }

    @Test
    fun `network cut in the background counts as connectivity failure`() {
        // Android reports a blocked background app exactly like this.
        assertTrue(
            isConnectivityFailure(
                UnknownHostException(
                    "Unable to resolve host \"cloud.example.org\": No address associated with hostname",
                ),
            ),
        )
        assertTrue(isConnectivityFailure(ConnectException("Connection refused")))
        assertTrue(isConnectivityFailure(SocketTimeoutException("timeout")))
        assertTrue(isConnectivityFailure(SocketException("Software caused connection abort")))
        assertTrue(isConnectivityFailure(IOException("wrapped", UnknownHostException("www.googleapis.com"))))
        // Conscrypt reports a TLS socket the system tore down without a cause chain.
        assertTrue(
            isConnectivityFailure(
                SSLException("Read error: ssl=0x0: I/O error during system call, Software caused connection abort"),
            ),
        )
    }

    @Test
    fun `server answers are real backup failures`() {
        assertFalse(isConnectivityFailure(GoogleDriveManager.DriveApiException("Update", 500)))
        assertFalse(isConnectivityFailure(GoogleDriveManager.AuthRequiredException(null)))
        assertFalse(isConnectivityFailure(NextcloudClient.NextcloudException("Nicht autorisiert (401)")))
        // A certificate problem is a server misconfiguration, not a missing network.
        assertFalse(isConnectivityFailure(SSLHandshakeException("PKIX path building failed")))
    }
}
