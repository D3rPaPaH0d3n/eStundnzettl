package com.estundnzettl.app

import com.estundnzettl.core.backup.BackupAnalysis
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.WORK_MODELS

/**
 * Zustand des Onboarding-Wizards — Port von useOnboardingFlow.ts.
 *
 * Step-Reihenfolge für neue User:
 *   0 Welcome → 1 Profile → 2 Locale → 3 WorkSchedule
 *   → (nur bei customCalc) 4 Calculation → 5 WorkCodes → 6 Backup → 7 Summary
 *
 * Simple-Modus springt von Step 1 direkt zu 7; der Restore-Flow läuft
 * Welcome(0) → Backup(6) → Summary(7).
 */
data class OnboardingUiState(
    val active: Boolean = false,
    val step: Int = 0,
    val isRestoreFlow: Boolean = false,
    // formData
    val name: String = "",
    val company: String = "",
    val role: String = "",
    /** Profilbild als JPEG-Data-URL (max. 1024px) — optional. */
    val photo: String? = null,
    val workDays: List<Int> = WORK_MODELS[0].days,
    val simpleMode: Boolean = false,
    val monthlyTargetMinutes: Int? = null,
    /** Google-Drive-Backup im Backup-Schritt aktiviert. */
    val autoBackup: Boolean = false,
    /** Lokales Backup im Backup-Schritt aktiviert. */
    val localBackupEnabled: Boolean = false,
    val localeId: String? = null,
    val workCodePresetId: String = "allgemein",
    val calcConfig: CalculationConfig? = null,
    /** true wenn in Step 2 "Eigener Plan" gewählt wurde → Step 4 wird gezeigt. */
    val customCalc: Boolean = false,
    /** Analysiertes Backup für den Restore-Flow. */
    val restoreData: BackupAnalysis? = null,
    /** true während ein Restore-Backup geladen wird (GDrive/Nextcloud/Ordner). */
    val restoreLoading: Boolean = false,
    /**
     * Zur Auswahl stehende Cloud-Backups. Nur belegt, wenn im Drive-Ordner
     * mehr als ein brauchbares Backup liegt — dann entscheidet der Nutzer,
     * statt dass die App still eines nimmt.
     */
    val restoreChoices: List<RestoreCandidate> = emptyList(),
)

/**
 * Ein wählbares Backup samt der kleinen Übersicht, die vor dem
 * Wiederherstellen zählt: Zeitstempel, Anzahl Einträge, Profil ja/nein.
 */
data class RestoreCandidate(
    val fileId: String,
    val fileName: String,
    /** Änderungszeit laut Drive (ISO), null wenn unbekannt. */
    val modifiedTime: String?,
    /** Datei trägt den Namen von vor dem Rebranding (kogler_backup.json). */
    val isLegacyName: Boolean,
    val analysis: BackupAnalysis,
) {
    val entryCount: Int get() = analysis.entryCount
    val hasUserData: Boolean get() = analysis.hasSettings
}
