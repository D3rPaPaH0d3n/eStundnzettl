package com.estundnzettl.app

import android.os.Bundle
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.rememberCoroutineScope
import com.estundnzettl.app.data.BackupRepository
import com.estundnzettl.app.data.CrashRecoveryStore
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.AppHeader
import com.estundnzettl.app.ui.AppErrorScreen
import com.estundnzettl.app.ui.MigrationRecoveryScreen
import com.estundnzettl.app.ui.DashboardScreen
import com.estundnzettl.app.ui.EntryFormScreen
import com.estundnzettl.app.ui.LiveTimerBar
import com.estundnzettl.app.ui.ReportScreen
import com.estundnzettl.app.ui.settings.SettingsScreen
import com.estundnzettl.app.ui.theme.EStundnzettlTheme
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.google.android.play.core.review.ReviewManagerFactory
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()
    @Volatile private var appReady = false

    /** Erster onResume gehört zum App-Start — der zählt nicht als "Resume". */
    private var resumedOnce = false

    override fun onResume() {
        super.onResume()
        if (resumedOnce && appReady) {
            viewModel.onAppResume()
        } else {
            resumedOnce = true
        }
    }

    override fun onStop() {
        super.onStop()
        // Background-Backup wie der appStateChange-Listener der Web-App
        if (appReady) viewModel.onAppBackground()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val crashStore = CrashRecoveryStore(this)
        val crashReport = crashStore.read()
        setContent {
            if (crashReport != null) {
                val recoveryI18n = remember { I18n.load(this, I18n.DEFAULT_LANGUAGE) }
                EStundnzettlTheme(
                    themeSetting = "system",
                    materialYou = false,
                    i18n = recoveryI18n,
                    darkTopBar = false,
                ) {
                    AppErrorScreen(
                        onRestart = {
                            crashStore.clear()
                            recreate()
                        },
                        onCopyDiagnostic = {
                            getSystemService(ClipboardManager::class.java).setPrimaryClip(
                                ClipData.newPlainText("eStundnzettl Diagnose", crashReport.diagnostic)
                            )
                        },
                        onContactSupport = {
                            val uri = Uri.parse(
                                "mailto:project@kainer.co.at?subject=" +
                                    Uri.encode("eStundnzettl Android-Fehler")
                            )
                            runCatching { startActivity(Intent(Intent.ACTION_SENDTO, uri)) }
                        },
                    )
                }
                return@setContent
            }

            var migrationAttempt by remember { mutableIntStateOf(0) }
            var migrationResult by remember {
                mutableStateOf<Result<MigrationRunResult>?>(null)
            }
            LaunchedEffect(migrationAttempt) {
                migrationResult = null
                val result = (application as EStundnzettlApp)
                    .runMigrations(this@MainActivity)
                appReady = result.isSuccess
                migrationResult = result
            }

            val migration = migrationResult
            if (migration == null) {
                val migrationI18n = remember {
                    I18n.load(
                        this,
                        I18n.resolveSystemLanguage(java.util.Locale.getDefault().language),
                    )
                }
                EStundnzettlTheme(
                    themeSetting = "system",
                    materialYou = false,
                    i18n = migrationI18n,
                    darkTopBar = false,
                ) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = LocalAppColors.current.accentStrong)
                    }
                }
                return@setContent
            }
            val migrationFailure = migration.exceptionOrNull()
            if (migrationFailure != null) {
                val migrationI18n = remember {
                    I18n.load(
                        this,
                        I18n.resolveSystemLanguage(java.util.Locale.getDefault().language),
                    )
                }
                EStundnzettlTheme(
                    themeSetting = "system",
                    materialYou = false,
                    i18n = migrationI18n,
                    darkTopBar = false,
                ) {
                    MigrationRecoveryScreen(
                        onRetry = { migrationAttempt++ },
                        onCopyDiagnostic = {
                            getSystemService(ClipboardManager::class.java).setPrimaryClip(
                                ClipData.newPlainText(
                                    "eStundnzettl Migration",
                                    migrationFailure.stackTraceToString(),
                                )
                            )
                        },
                        onContactSupport = {
                            val uri = Uri.parse(
                                "mailto:project@kainer.co.at?subject=" +
                                    Uri.encode("eStundnzettl Datenübernahme")
                            )
                            runCatching { startActivity(Intent(Intent.ACTION_SENDTO, uri)) }
                        },
                    )
                }
                return@setContent
            }
            val state by viewModel.state.collectAsStateWithLifecycle()
            val context = LocalContext.current
            val i18n = remember(state.language) { I18n.load(context, state.language) }

            EStundnzettlTheme(
                themeSetting = state.theme,
                materialYou = state.materialYouEnabled,
                i18n = i18n,
                darkTopBar = !state.onboarding.active,
            ) {
                // Meldungen aus dem ViewModel als Snackbar im App-Look
                // (Ersatz für die gestylten react-hot-toast-Toasts)
                val snackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }
                LaunchedEffect(Unit) {
                    viewModel.messages.collect { message ->
                        val text = if (message.raw) message.key
                        else i18n.t(message.key, *message.args.toTypedArray())
                        val tone = message.tone
                        snackbarHostState.showSnackbar(
                            message = tone.name + TOAST_SEPARATOR + text,
                            duration = when (message.duration) {
                                UiMessageDuration.SHORT -> androidx.compose.material3.SnackbarDuration.Short
                                UiMessageDuration.LONG -> androidx.compose.material3.SnackbarDuration.Long
                                UiMessageDuration.UNTIL_DISMISSED -> androidx.compose.material3.SnackbarDuration.Indefinite
                            },
                        )
                    }
                }
                LaunchedEffect(Unit) { viewModel.onUiReady() }

                // Google rendert diesen Dialog unverändert. Es gibt bewusst
                // keine vorgeschaltete Zufriedenheitsfrage oder Spendenwerbung.
                val reviewManager = remember { ReviewManagerFactory.create(this@MainActivity) }
                LaunchedEffect(
                    state.requestInAppReview,
                    state.onboarding.active,
                    state.showWhatsNew,
                    state.showNativeWelcome,
                    state.showTour,
                    state.form.isLiveEntry,
                ) {
                    val canLaunchReview = state.requestInAppReview &&
                        !state.onboarding.active &&
                        !state.showWhatsNew &&
                        !state.showNativeWelcome &&
                        !state.showTour &&
                        !state.form.isLiveEntry
                    if (canLaunchReview) {
                        viewModel.markInAppReviewRequested()
                        reviewManager.requestReviewFlow().addOnSuccessListener { reviewInfo ->
                            reviewManager.launchReviewFlow(this@MainActivity, reviewInfo)
                        }
                    }
                }

                // Google-Consent-Dialoge (AuthorizationClient-Resolution)
                val googleAuthLauncher = rememberLauncherForActivityResult(
                    ActivityResultContracts.StartIntentSenderForResult(),
                ) { result -> viewModel.onGoogleAuthResult(result.resultCode, result.data) }
                LaunchedEffect(Unit) {
                    viewModel.googleAuthIntents.collect { pendingIntent ->
                        googleAuthLauncher.launch(
                            androidx.activity.result.IntentSenderRequest.Builder(pendingIntent.intentSender).build(),
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .imePadding(),
                ) {
                    if (state.onboarding.active) {
                        com.estundnzettl.app.ui.onboarding.OnboardingScreen(viewModel)
                    } else {
                        MainScreen(viewModel)
                    }

                    androidx.compose.material3.SnackbarHost(
                        hostState = snackbarHostState,
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(
                                top = if (state.onboarding.active) 72.dp else 136.dp,
                                start = 16.dp,
                                end = 16.dp,
                            ),
                    ) { snackbarData ->
                        AppToast(snackbarData)
                    }
                }
            }
        }
    }
}

/**
 * Schwebende App-Meldung statt der Material-Standard-Snackbar.
 * Sie sitzt unter dem dunklen Header und damit weder über dem FAB noch
 * direkt auf der Android-Navigationsleiste.
 */
private const val TOAST_SEPARATOR = "\u001F"

@Composable
private fun AppToast(snackbarData: androidx.compose.material3.SnackbarData) {
    val colors = LocalAppColors.current
    val encoded = snackbarData.visuals.message
    val toneName = encoded.substringBefore(TOAST_SEPARATOR)
    val message = encoded.substringAfter(TOAST_SEPARATOR, encoded)
    val tone = runCatching { UiMessageTone.valueOf(toneName) }.getOrDefault(UiMessageTone.INFO)
    val tint = when (tone) {
        UiMessageTone.SUCCESS -> colors.positive
        UiMessageTone.WARNING -> com.estundnzettl.app.ui.theme.Palette.Amber600
        UiMessageTone.ERROR -> colors.danger
        else -> colors.info
    }
    val icon = when (tone) {
        UiMessageTone.SUCCESS -> androidx.compose.material.icons.Icons.Outlined.CheckCircle
        UiMessageTone.WARNING -> androidx.compose.material.icons.Icons.Outlined.WarningAmber
        UiMessageTone.ERROR -> androidx.compose.material.icons.Icons.Outlined.ErrorOutline
        else -> androidx.compose.material.icons.Icons.Outlined.Info
    }
    androidx.compose.material3.Surface(
        color = colors.surface,
        contentColor = colors.textPrimary,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, tint.copy(alpha = 0.4f)),
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp)
            .shadow(
                elevation = 12.dp,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
                clip = false,
            )
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(16.dp)),
    ) {
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .clip(androidx.compose.foundation.shape.CircleShape)
                    .background(tint.copy(alpha = 0.14f))
                    .padding(8.dp),
                contentAlignment = Alignment.Center,
            ) {
                androidx.compose.material3.Icon(
                    icon,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.size(20.dp),
                )
            }
            Text(
                text = message,
                color = colors.textPrimary,
                fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                modifier = Modifier.weight(1f),
            )
            if (tone == UiMessageTone.ERROR || tone == UiMessageTone.WARNING) {
                androidx.compose.material3.IconButton(onClick = snackbarData::dismiss) {
                    androidx.compose.material3.Icon(
                        androidx.compose.material.icons.Icons.Outlined.Close,
                        contentDescription = LocalI18n.current.t("common.close"),
                        tint = colors.textMuted,
                        modifier = Modifier.size(20.dp),
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
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    // Hardware-Back: von Unteransichten zurück zum Dashboard
    BackHandler(enabled = state.view != "dashboard") {
        viewModel.setView("dashboard")
    }

    // Header-Titel — bewusst hartkodiert wie getHeaderTitle in useAppState.ts
    val headerTitle = when (state.view) {
        "settings" -> t.t("header.settingsTitle")
        "add" -> if (state.form.editingEntry != null) {
            t.t("header.editEntryTitle")
        } else {
            t.t("header.newEntryTitle")
        }
        "report" -> t.t("header.reportTitle")
        else -> "eStundnzettl"
    }

    // Lösch-Bestätigung (Port von ConfirmModal + app.deleteEntry*)
    state.deleteTarget?.let {
        com.estundnzettl.app.ui.AppConfirmDialog(
            title = t.t("app.deleteEntryTitle"),
            message = t.t("app.deleteEntryMessage"),
            confirmLabel = t.t("common.delete"),
            dismissLabel = t.t("common.cancel"),
            onConfirm = viewModel::confirmDelete,
            onDismiss = viewModel::cancelDelete,
            destructive = true,
        )
    }

    // App-Tour: Ziel-Registry (Spotlight-Positionen) + aktueller Schritt.
    // Blur nur bei Schritten ohne markiertes Ziel — mit Spotlight bleibt
    // der Inhalt scharf (wie AppTour.tsx: backdrop-blur nur ohne Target).
    val tourTargets = remember { com.estundnzettl.app.ui.TourTargetRegistry() }
    var tourIndex by remember { androidx.compose.runtime.mutableIntStateOf(0) }
    LaunchedEffect(state.showTour) {
        if (state.showTour) tourIndex = 0
    }
    val tourBlur = if (
        (state.showTour && !com.estundnzettl.app.ui.appTourStepHasTarget(tourIndex)) ||
        tourTargets.settingsTourBlur.value
    ) {
        Modifier.blur(4.dp)
    } else {
        Modifier
    }

    androidx.compose.runtime.CompositionLocalProvider(
        com.estundnzettl.app.ui.LocalTourTargets provides tourTargets,
    ) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(modifier = Modifier.fillMaxSize().then(tourBlur)) {
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

            // Update-Hinweis für Sideload-Installationen (GitHub-Release)
            val bannerContext = androidx.compose.ui.platform.LocalContext.current
            val release = state.updateAvailable
            if (state.view == "dashboard" && release != null) {
                com.estundnzettl.app.ui.UpdateAvailableBanner(
                    release = release,
                    onOpen = {
                        runCatching {
                            bannerContext.startActivity(
                                android.content.Intent(
                                    android.content.Intent.ACTION_VIEW,
                                    android.net.Uri.parse(release.url),
                                ),
                            )
                        }
                    },
                    onDismiss = viewModel::dismissUpdateBanner,
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
                modifier = Modifier.align(Alignment.BottomEnd).then(tourBlur),
            )
        }

        // Dokumente-Verwaltung pro Eintrag (Port von AttachmentManager)
        if (state.attachmentEntry != null) {
            com.estundnzettl.app.ui.AttachmentSheet(viewModel)
        }

        // Einmalige App-Tour nach dem Onboarding — Overlay mit Spotlight
        // auf FAB/Bericht/Einstellungen (Port von AppTour.tsx)
        if (state.showTour && !state.showWhatsNew) {
            com.estundnzettl.app.ui.AppTourOverlay(
                i18n = t,
                index = tourIndex,
                onIndexChange = { tourIndex = it },
                onClose = viewModel::closeTour,
            )
        }

        // Einmalige Einstellungen-Tour — markiert die Sektionen per
        // Spotlight und scrollt sie mittig (Port von SettingsTourPopup.tsx)
        if (state.view == "settings" && !state.loading) {
            com.estundnzettl.app.ui.SettingsTourOverlay(viewModel)
        }

        // Einmaliges Willkommens-Popup nach der Capacitor-Migration
        if (state.showNativeWelcome && !state.loading) {
            com.estundnzettl.app.ui.NativeWelcomeDialog(viewModel)
        }

        // Nach einem echten App-Update einmalig die aktuelle Version zeigen.
        // Onboarding, Migration und Auto-Checkout haben bewusst Vorrang.
        if (
            state.showWhatsNew &&
            !state.loading &&
            !state.showNativeWelcome &&
            !state.showTour &&
            !state.requestInAppReview &&
            !state.form.isLiveEntry
        ) {
            com.estundnzettl.app.ui.ChangelogSheet(
                onDismiss = viewModel::dismissWhatsNew,
                focusVersion = state.whatsNewVersion,
                automatic = true,
            )
        }
    }
    }
}
