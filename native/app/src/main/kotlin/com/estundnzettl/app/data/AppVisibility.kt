package com.estundnzettl.app.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Whether the app's activity is visible. Android cuts the network of apps
 * that are no longer visible (from Android 15 on, earlier on many OEM
 * builds), so backup code uses this to tell "no network for us" from a
 * broken target.
 *
 * Held by the Application, not by MainViewModel: the activity reports
 * onStart/onStop before the migration gate opens, and the ViewModel must
 * not be created until then.
 */
class AppVisibility {

    @Volatile var isForeground: Boolean = false
        private set

    /** Counts moves to the background (onStop). */
    @Volatile var backgroundEntries: Int = 0
        private set

    private val _foregroundEntries = MutableStateFlow(0)

    /** Counts returns to the foreground (onStart), including recreated activities. */
    val foregroundEntries: StateFlow<Int> = _foregroundEntries.asStateFlow()

    fun onStart() {
        isForeground = true
        _foregroundEntries.update { it + 1 }
    }

    fun onStop() {
        isForeground = false
        backgroundEntries++
    }
}
