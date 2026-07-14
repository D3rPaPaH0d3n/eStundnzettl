package com.estundnzettl.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.togetherWith
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
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.rememberCoroutineScope
import com.estundnzettl.app.data.BackupRepository
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.AppHeader
import com.estundnzettl.app.ui.DashboardScreen
import com.estundnzettl.app.ui.EntryFormScreen
import com.estundnzettl.app.ui.LiveTimerBar
import com.estundnzettl.app.ui.ReportScreen
import com.estundnzettl.app.ui.settings.SettingsScreen
import com.estundnzettl.app.ui.theme.EStundnzettlTheme
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    /** Erster onResume gehört zum App-Start — der zählt nicht als "Resume". */
    private var resumedOnce = false

    override fun onResume() {
        super.onResume()
        if (resumedOnce) {
            viewModel.onAppResume()
        } else {
            resumedOnce = true
        }
    }

    override fun onStop() {
        super.onStop()
        // Background-Backup wie der appStateChange-Listener der Web-App
        viewModel.onAppBackground()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val state by viewModel.state.collectAsState()
            val context = LocalContext.current
            val i18n = remember(state.language) { I18n.load(context, state.language) }

            EStundnzettlTheme(
                themeSetting = state.theme,
                materialYou = state.materialYouEnabled,
                i18n = i18n,
            ) {
                // Meldungen aus dem ViewModel als Snackbar im App-Look
                // (Ersatz für die gestylten react-hot-toast-Toasts)
                val snackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }
                LaunchedEffect(Unit) {
                    viewModel.messages.collect { message ->
                        val text = if (message.raw) message.key
                        else i18n.t(message.key, *message.args.toTypedArray())
                        snackbarHostState.showSnackbar(text)
                    }
                }

                // Google-Consent-Dialoge (AuthorizationClient-Resolution)
                val googleAuthLauncher = rememberLauncherForActivityResult(
                    ActivityResultContracts.StartIntentSenderForResult(),
                ) { result -> viewModel.onGoogleAuthResult(result.data) }
                LaunchedEffect(Unit) {
                    viewModel.googleAuthIntents.collect { pendingIntent ->
                        googleAuthLauncher.launch(
                            androidx.activity.result.IntentSenderRequest.Builder(pendingIntent.intentSender).build(),
                        )
                    }
                }

                Box(modifier = Modifier.fillMaxSize()) {
                    if (state.onboarding.active) {
                        com.estundnzettl.app.ui.onboarding.OnboardingScreen(viewModel)
                    } else {
                        MainScreen(viewModel)
                    }

                    // Bewertungs-/Spenden-Hinweis (einmalig, 5 Tage nach Erstnutzung)
                    if (state.showSupportPrompt && !state.onboarding.active) {
                        com.estundnzettl.app.ui.SupportPromptDialog(viewModel)
                    }

                    androidx.compose.material3.SnackbarHost(
                        hostState = snackbarHostState,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = 96.dp),
                    )
                }
            }
        }
    }
}

/** Settings-Route mit SAF-Export/-Import (Storage Access Framework). */
@Composable
private fun SettingsRoute(viewModel: MainViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val t = LocalI18n.current

    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    val content = viewModel.createBackupFileContent()
                    context.contentResolver.openOutputStream(uri)?.use { stream ->
                        stream.write(content.toByteArray(Charsets.UTF_8))
                    }
                }.onSuccess {
                    viewModel.showRawMessage("✅ " + t.t("settings.backup.export"))
                }.onFailure {
                    viewModel.showRawMessage(t.t("settings.toast.fileReadError"))
                }
            }
        }
    }

    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    context.contentResolver.openInputStream(uri)?.use { stream ->
                        stream.bufferedReader().readText()
                    }
                }.onSuccess { text ->
                    if (text != null) viewModel.importBackupText(text)
                }.onFailure {
                    viewModel.showRawMessage(t.t("settings.toast.fileReadError"))
                }
            }
        }
    }

    SettingsScreen(
        viewModel = viewModel,
        onExportBackup = { exportLauncher.launch(BackupRepository.FILENAME) },
        onImportBackup = { importLauncher.launch(arrayOf("application/json", "text/plain", "*/*")) },
    )
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
            // Der Bericht ist im Original ein Vollbild-Overlay mit eigener
            // Toolbar — der App-Header entfällt dort komplett.
            if (state.view != "report") {
                AppHeader(
                    view = state.view,
                    headerTitle = headerTitle,
                    onNavigateBack = { viewModel.setView("dashboard") },
                    onOpenSettings = { viewModel.setView("settings") },
                    onOpenReport = { viewModel.setView("report") },
                )
            }

            // View-Wechsel mit Übergang (Pendant zu den framer-motion-
            // Transitions der Web-App): sanftes Einblenden + leichtes
            // Hochgleiten der neuen Ansicht.
            androidx.compose.animation.AnimatedContent(
                targetState = if (state.loading || state.appData == null) "loading" else state.view,
                transitionSpec = {
                    (androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(220)) +
                        androidx.compose.animation.slideInVertically(
                            androidx.compose.animation.core.tween(220),
                        ) { it / 24 })
                        .togetherWith(androidx.compose.animation.fadeOut(androidx.compose.animation.core.tween(120)))
                },
                label = "viewTransition",
            ) { view ->
                when (view) {
                    "loading" -> com.estundnzettl.app.ui.SkeletonScreen()

                    "add" -> EntryFormScreen(
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

                    "settings" -> SettingsRoute(viewModel)

                    "report" -> ReportScreen(viewModel)

                    "dashboard" -> DashboardScreen(
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
                        attachmentCounts = remember(state.attachments) {
                            state.attachments.groupingBy { it.entryId }.eachCount()
                        },
                        onManageAttachments = viewModel::openAttachments,
                    )

                    else -> {}
                }
            }
        }

        // Import-Konflikt: Backup enthält auch Einstellungen → User entscheidet
        state.pendingImport?.let { pending ->
            AlertDialog(
                onDismissRequest = { viewModel.cancelImport() },
                title = { Text(t.t("modals.importConflict.title")) },
                text = {
                    Column {
                        Text(
                            t.t("modals.importConflict.description")
                                .replace("<b>", "").replace("</b>", ""),
                        )
                        Text(
                            t.t("modals.importConflict.entriesLabel") + ": " + pending.entryCount,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                        Text(
                            t.t("modals.importConflict.warning"),
                            color = colors.danger,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = { viewModel.confirmImport("ALL") }) {
                        Text(t.t("modals.importConflict.importAll"), color = colors.danger)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.confirmImport("ENTRIES_ONLY") }) {
                        Text(t.t("modals.importConflict.entriesOnly"))
                    }
                },
            )
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

        // Dokumente-Verwaltung pro Eintrag (Port von AttachmentManager)
        if (state.attachmentEntry != null) {
            com.estundnzettl.app.ui.AttachmentSheet(viewModel)
        }

        // Einmalige App-Tour nach dem Onboarding
        if (state.showTour) {
            com.estundnzettl.app.ui.AppTourDialog(i18n = t, onClose = viewModel::closeTour)
        }
    }
}
