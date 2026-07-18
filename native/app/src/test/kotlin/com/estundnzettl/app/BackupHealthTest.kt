package com.estundnzettl.app

import com.estundnzettl.app.data.AutoBackupManager
import com.estundnzettl.app.data.GoogleDriveManager
import com.estundnzettl.app.data.googleDriveFailureNeedsReconnect
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

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
}
