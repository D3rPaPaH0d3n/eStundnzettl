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
    val workDays: List<Int> = WORK_MODELS[0].days,
    val simpleMode: Boolean = false,
    val localeId: String? = null,
    val workCodePresetId: String = "allgemein",
    val calcConfig: CalculationConfig? = null,
    /** true wenn in Step 2 "Eigener Plan" gewählt wurde → Step 4 wird gezeigt. */
    val customCalc: Boolean = false,
    /** Analysiertes Backup für den Restore-Flow. */
    val restoreData: BackupAnalysis? = null,
)
