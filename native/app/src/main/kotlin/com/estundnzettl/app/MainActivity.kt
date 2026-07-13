package com.estundnzettl.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.AppHeader
import com.estundnzettl.app.ui.DashboardScreen
import com.estundnzettl.app.ui.EntryFormScreen
import com.estundnzettl.app.ui.LiveTimerBar
import com.estundnzettl.app.ui.theme.EStundnzettlTheme
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val state by viewModel.state.collectAsState()
            val context = LocalContext.current
            val i18n = remember(state.language) { I18n.load(context, state.language) }

            EStundnzettlTheme(themeSetting = state.theme, i18n = i18n) {
                // Toast-Nachrichten aus dem ViewModel
                LaunchedEffect(Unit) {
                    viewModel.messages.collect { message ->
                        val text = i18n.t(message.key, *message.args.toTypedArray())
                        Toast.makeText(context, text, Toast.LENGTH_SHORT).show()
                    }
                }

                MainScreen(viewModel)
            }
        }
    }
}

@Composable
private fun MainScreen(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    // Hardware-Back: von Unteransichten zurück zum Dashboard
    BackHandler(enabled = state.view != "dashboard") {
        viewModel.setView("dashboard")
    }

    // Header-Titel — bewusst hartkodiert wie getHeaderTitle in useAppState.ts
    val headerTitle = when (state.view) {
        "settings" -> "Einstellungen"
        "add" -> if (state.form.editingEntry != null) "Eintrag bearbeiten" else "Neuer Eintrag"
        "report" -> "Bericht"
        else -> "eStundnzettl"
    }

    // Lösch-Bestätigung (Port von ConfirmModal + app.deleteEntry*)
    state.deleteTarget?.let {
        AlertDialog(
            onDismissRequest = { viewModel.cancelDelete() },
            title = { Text(t.t("app.deleteEntryTitle")) },
            text = { Text(t.t("app.deleteEntryMessage")) },
            confirmButton = {
                TextButton(onClick = { viewModel.confirmDelete() }) {
                    Text(t.t("common.delete"), color = colors.danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.cancelDelete() }) {
                    Text(t.t("common.cancel"))
                }
            },
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            AppHeader(
                view = state.view,
                headerTitle = headerTitle,
                onNavigateBack = { viewModel.setView("dashboard") },
                onOpenSettings = { viewModel.setView("settings") },
                onOpenReport = { viewModel.setView("report") },
            )

            when {
                state.loading || state.appData == null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = colors.accent)
                    }
                }

                state.view == "add" -> EntryFormScreen(
                    form = state.form,
                    userData = state.userData,
                    workCodes = state.workCodes,
                    uniqueProjects = state.appData!!.uniqueProjects,
                    lastWorkEntry = state.appData!!.lastWorkEntry,
                    language = state.language,
                    onUpdateForm = viewModel::updateForm,
                    onDateChanged = viewModel::onFormDateChanged,
                    onSave = viewModel::saveEntry,
                    onCancel = { viewModel.setView("dashboard") },
                    onAddWorkCode = viewModel::addWorkCode,
                )

                state.view == "settings" || state.view == "report" -> {
                    // Platzhalter — Settings und PDF-Bericht folgen in den
                    // nächsten Phasen des Rewrites.
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = if (state.view == "settings") "Einstellungen" else "Bericht",
                            color = colors.textPrimary,
                        )
                        Text(
                            text = "Folgt in der nächsten Phase des Rewrites.",
                            color = colors.textMuted,
                        )
                    }
                }

                else -> DashboardScreen(
                    currentMonth = state.currentMonth,
                    appData = state.appData!!,
                    userData = state.userData,
                    workCodes = state.workCodes,
                    locale = state.locale,
                    calculationConfig = state.calculationConfig,
                    language = state.language,
                    onChangeMonth = viewModel::changeMonth,
                    onSetMonth = viewModel::setMonth,
                    onEditEntry = viewModel::startEdit,
                    onDeleteEntry = viewModel::requestDeleteEntry,
                )
            }
        }

        // FAB + Live-Timer nur im Dashboard (wie die Web-App)
        if (state.view == "dashboard" && !state.loading) {
            LiveTimerBar(
                timer = state.timer,
                targetMinutes = state.appData?.todayTarget ?: 510,
                onCreateEntry = viewModel::startNewEntry,
                onStart = viewModel::startTimer,
                onStop = viewModel::stopTimer,
                onPause = viewModel::pauseTimer,
                onResume = viewModel::resumeTimer,
                modifier = Modifier.align(Alignment.BottomEnd),
            )
        }
    }
}
