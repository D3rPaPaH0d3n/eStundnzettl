package com.estundnzettl.app.data

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.estundnzettl.app.EStundnzettlApp
import java.util.concurrent.TimeUnit

/**
 * Cloud-Upload (Google Drive, Nextcloud), wenn die App nicht sichtbar ist.
 * Android startet den Job erst, wenn Netz da ist, und bündelt ihn mit
 * anderen Hintergrundjobs — kein Dauerdienst, kein eigenes Aufwecken.
 */
class CloudBackupWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext as EStundnzettlApp
        val outcome = app.autoBackup.performBackup(
            AutoBackupManager.Source.BACKGROUND,
            AutoBackupManager.CLOUD_TARGETS,
        )
        val tryAgain = outcome.busy || outcome.deferredTargets.isNotEmpty()
        return if (tryAgain && runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.success()
    }

    companion object {
        private const val WORK_NAME = "cloud-backup"
        private const val MAX_ATTEMPTS = 5

        /**
         * Höchstens ein offener Auftrag. KEEP statt REPLACE: Ein laufender
         * Upload wird nicht abgebrochen, er liest die Daten ohnehin erst
         * beim Start.
         */
        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<CloudBackupWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.KEEP, request)
        }
    }
}
