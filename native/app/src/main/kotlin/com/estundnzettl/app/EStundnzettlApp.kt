package com.estundnzettl.app

import android.app.Application
import android.util.Log
import com.estundnzettl.app.data.LegacyDbImporter
import com.estundnzettl.app.data.db.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class EStundnzettlApp : Application() {

    val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val database: AppDatabase by lazy { AppDatabase.get(this) }

    /**
     * Einmalige Datenübernahme aus der Capacitor-App. Der ViewModel-
     * Erststart wartet auf diesen Job, damit die Onboarding-Entscheidung
     * nie gegen den laufenden Import racen kann (sonst sähe ein Update-
     * Nutzer kurz das Onboarding statt seiner Daten).
     */
    lateinit var legacyImport: kotlinx.coroutines.Job
        private set

    override fun onCreate() {
        super.onCreate()

        // Einmalige Datenübernahme aus der Capacitor-App (gleiche
        // applicationId → Alt-DB liegt im eigenen Datenverzeichnis).
        legacyImport = applicationScope.launch {
            runCatching { LegacyDbImporter(this@EStundnzettlApp, database).importIfNeeded() }
                .onFailure { Log.e("EStundnzettlApp", "Legacy-Import fehlgeschlagen", it) }
        }
    }
}
