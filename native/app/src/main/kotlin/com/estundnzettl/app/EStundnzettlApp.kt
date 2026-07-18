package com.estundnzettl.app

import android.app.Activity
import android.app.Application
import android.util.Log
import com.estundnzettl.app.data.CrashRecoveryStore
import com.estundnzettl.app.data.LegacyDbImportResult
import com.estundnzettl.app.data.LegacyDbImporter
import com.estundnzettl.app.data.LegacyWebImportResult
import com.estundnzettl.app.data.LegacyWebStorageImporter
import com.estundnzettl.app.data.SecretStore
import com.estundnzettl.app.data.SettingsRepository
import com.estundnzettl.app.data.db.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

data class MigrationRunResult(
    val database: LegacyDbImportResult,
    val webStorage: LegacyWebImportResult,
    val capacitorSecret: SecretStore.CapacitorMigrationStatus,
)

class EStundnzettlApp : Application() {

    val database: AppDatabase by lazy { AppDatabase.get(this) }

    private val migrationMutex = Mutex()
    @Volatile private var completedMigration: MigrationRunResult? = null

    override fun onCreate() {
        super.onCreate()

        val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            val comesFromTestRunner = throwable.stackTrace.any {
                it.className.startsWith("org.junit.") || it.className.startsWith("androidx.test.")
            }
            if (!comesFromTestRunner) {
                runCatching { CrashRecoveryStore(this).record(throwable) }
                    .onFailure { Log.e("EStundnzettlApp", "Crash diagnostic could not be stored", it) }
            }
            previousHandler?.uncaughtException(thread, throwable)
        }
    }

    /**
     * Completes every migration source before MainViewModel is constructed.
     * Failures are returned to a blocking recovery screen and remain retryable.
     */
    suspend fun runMigrations(activity: Activity): Result<MigrationRunResult> = migrationMutex.withLock {
        completedMigration?.let { return@withLock Result.success(it) }

        runCatching {
            val dbResult = withContext(Dispatchers.IO) {
                LegacyDbImporter(this@EStundnzettlApp, database).importIfNeeded()
            }
            val secretStore = SecretStore(this@EStundnzettlApp)
            val capacitorSecret = withContext(Dispatchers.IO) {
                val result = secretStore.migrateCapacitorNextcloudSecret()
                if (result == SecretStore.CapacitorMigrationStatus.NOT_FOUND) {
                    val settings = SettingsRepository(database.settingsDao())
                    secretStore.migrateLegacyRawNextcloudSecret(
                        value = settings.getString("nextcloud_pass"),
                        masterKeyBase64 = settings.getString("crypto_mk_v1"),
                    )
                }
                result
            }
            val webResult = LegacyWebStorageImporter(activity, database, secretStore).importIfNeeded()
            withContext(Dispatchers.IO) { normalizeLegacyScalarSettings() }
            database.checkpoint()
            MigrationRunResult(dbResult, webResult, capacitorSecret).also {
                completedMigration = it
                Log.i("EStundnzettlApp", "Migration gate completed: $it")
            }
        }.onFailure {
            Log.e("EStundnzettlApp", "Migration gate failed; normal startup remains blocked", it)
        }
    }

    /**
     * Capacitor wrote some counters as JSON numbers while native readers use
     * strings. Normalising only those status counters preserves their value and
     * avoids silently resetting retry/backoff information after the update.
     */
    private suspend fun normalizeLegacyScalarSettings() {
        val settings = SettingsRepository(database.settingsDao())
        listOf(
            "backup_fail_count",
            "nextcloud_backup_fail_count",
            "pdf_archive_fail_count",
        ).forEach { key ->
            val raw = settings.getRaw(key) as? JsonPrimitive ?: return@forEach
            if (!raw.isString) {
                raw.contentOrNull?.let { settings.setString(key, it) }
            }
        }
    }
}
