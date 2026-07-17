package com.estundnzettl.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.estundnzettl.app.data.EntriesRepository
import com.estundnzettl.app.data.replaceFullSnapshot
import com.estundnzettl.app.data.EntryIdGenerator
import com.estundnzettl.app.data.SettingsRepository
import com.estundnzettl.app.data.WorkCodesRepository
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.Haptics
import com.estundnzettl.core.calc.AppData
import com.estundnzettl.core.calc.EntryFormInput
import com.estundnzettl.core.calc.SaveEntryResult
import com.estundnzettl.core.calc.WorkCodes
import com.estundnzettl.core.calc.deriveAppData
import com.estundnzettl.core.calc.getDefaultTimesForDate
import com.estundnzettl.core.calc.prepareEntryToSave
import com.estundnzettl.core.config.toJson
import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.locale.holidays.toDateString
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.Locale as JavaLocale

internal fun autoCheckoutDays(startDate: LocalDate, today: LocalDate): Int =
    ChronoUnit.DAYS.between(startDate, today).toInt().coerceAtLeast(1)

internal enum class WhatsNewDecision { SHOW, MARK_CURRENT, NONE }

internal class AttachmentValidationException(val translationKey: String) : Exception()

internal fun decideWhatsNew(
    lastSeenVersionCode: Int?,
    currentVersionCode: Int,
    hasExistingProfile: Boolean,
    hasCurrentChangelog: Boolean,
): WhatsNewDecision = when {
    !hasCurrentChangelog -> WhatsNewDecision.MARK_CURRENT
    lastSeenVersionCode == null && hasExistingProfile -> WhatsNewDecision.SHOW
    lastSeenVersionCode == null -> WhatsNewDecision.MARK_CURRENT
    currentVersionCode > lastSeenVersionCode -> WhatsNewDecision.SHOW
    else -> WhatsNewDecision.NONE
}

/** Formular-Zustand — Port von useFormState. */
data class FormUiState(
    val entryType: String = "work",
    val formDate: String = LocalDate.now().toDateString(),
    val startTime: String = "06:00",
    val endTime: String = "16:30",
    val pauseDuration: Int = 30,
    val project: String = "",
    val code: Int = 1,
    val editingEntry: Entry? = null,
    val isLiveEntry: Boolean = false,
    val specialManualMode: Boolean = false,
)

/** Live-Timer-Zustand — Persistenz-Shape identisch zur TS-App. */
@Serializable
data class TimerUiState(
    val isRunning: Boolean = false,
    val isPaused: Boolean = false,
    val startTime: String? = null,        // ISO string
    val pauseStartTime: String? = null,   // ISO string
    val accumulatedPause: Long = 0,       // milliseconds
)

/** One-shot Toast-Nachricht (i18n-Key + Argumente, oder bereits übersetzter Text). */
enum class UiMessageTone { SUCCESS, INFO, WARNING, ERROR }

enum class UiMessageDuration { SHORT, LONG, UNTIL_DISMISSED }

data class UiMessage(
    val key: String,
    val args: List<Pair<String, Any?>> = emptyList(),
    /** true = `key` ist bereits der fertige Anzeigetext. */
    val raw: Boolean = false,
    val tone: UiMessageTone = toneForMessageKey(key),
    val duration: UiMessageDuration = when (tone) {
        UiMessageTone.ERROR, UiMessageTone.WARNING -> UiMessageDuration.LONG
        else -> UiMessageDuration.SHORT
    },
)

/**
 * Übergang für vorhandene i18n-Aufrufe: Die Darstellungsart hängt nur vom
 * stabilen Übersetzungsschlüssel ab, niemals vom deutschen/englischen Text.
 * Neue Aufrufer sollen den Tone direkt am UiMessage angeben.
 */
internal fun toneForMessageKey(key: String): UiMessageTone = when (key) {
    "toasts.entry.startEqualsEnd", "toasts.entry.overlap",
    "settings.backup.toast.pollingTimeout", "settings.backup.toast.ncConnectFirst",
    "settings.backup.toast.gdriveCancelled", "onboarding.toast.nameRequired",
    "onboarding.toast.localeRequired", "onboarding.toast.backupNotFound",
    "onboarding.toast.ncRestoreNotFound", "onboarding.toast.restoreProfileNeeded" ->
        UiMessageTone.WARNING

    "toasts.entry.saved", "toasts.entry.updated", "toasts.entry.deleted",
    "toasts.timer.started", "toasts.timer.captured", "toasts.appReset",
    "settings.language.toast", "settings.toast.materialYouOn", "settings.toast.materialYouOff",
    "settings.toast.expertOn", "settings.toast.expertOff", "settings.toast.timeUpdated",
    "settings.toast.restoreSuccess", "settings.data.toast.demoLoaded",
    "settings.backup.toast.ncConnectedAs", "settings.backup.toast.ncDisconnected",
    "settings.backup.toast.ncTestOk", "settings.backup.toast.gdriveConnected",
    "onboarding.toast.demoLoaded" -> UiMessageTone.SUCCESS

    else -> when {
        key.endsWith("Failed", ignoreCase = true) ||
            key.endsWith("Error", ignoreCase = true) ||
            key.contains("invalid", ignoreCase = true) ||
            key.contains("integrityMismatch", ignoreCase = true) ||
            key.contains("folderAccessError", ignoreCase = true) ||
            key.contains("unavailable", ignoreCase = true) -> UiMessageTone.ERROR
        else -> UiMessageTone.INFO
    }
}

data class MainUiState(
    val loading: Boolean = true,
    val view: String = "dashboard",
    val currentMonth: YearMonth = YearMonth.now(),
    val appData: AppData? = null,
    val userData: UserData? = null,
    val workCodes: List<WorkCode> = emptyList(),
    val locale: AppLocale = getLocale(null),
    val calculationConfig: CalculationConfig? = null,
    val theme: String = "system",
    val language: String = I18n.DEFAULT_LANGUAGE,
    val form: FormUiState = FormUiState(),
    val timer: TimerUiState = TimerUiState(),
    /** Entry, dessen Löschung gerade bestätigt werden soll. */
    val deleteTarget: Entry? = null,
    val materialYouEnabled: Boolean = false,
    /** Backup-Analyse, die auf die Import-Entscheidung (ALL/ENTRIES_ONLY) wartet. */
    val pendingImport: com.estundnzettl.core.backup.BackupAnalysis? = null,
    val onboarding: OnboardingUiState = OnboardingUiState(),
    /** Alle Anhänge (Metadaten) — Pendant zum useAttachments-State. */
    val attachments: List<com.estundnzettl.core.model.Attachment> = emptyList(),
    /** MRU-Label-Vorschläge für neue Anhänge. */
    val labelSuggestions: List<String> = emptyList(),
    /** Entry, dessen Anhänge gerade verwaltet werden (AttachmentManager offen). */
    val attachmentEntry: Entry? = null,
    /** App-Tour sichtbar (einmalig nach dem Onboarding). */
    val showTour: Boolean = false,
    /** Bewertungs-/Spenden-Hinweis (frühestens 5 Tage nach Erstnutzung). */
    val showSupportPrompt: Boolean = false,
    /** Nextcloud-Verbindungszustand für Backup-/Archiv-UI. */
    val nextcloud: NextcloudUiState = NextcloudUiState(),
    /** Google-Drive-Verbindungszustand (Backup + PDF-Archiv getrennt). */
    val googleDrive: GoogleDriveUiState = GoogleDriveUiState(),
    /** Neueres GitHub-Release (nur Sideload-Installationen). */
    val updateAvailable: com.estundnzettl.app.data.UpdateCheck.Release? = null,
    /** Einmaliges Willkommens-Popup nach der Migration von der Capacitor-App. */
    val showNativeWelcome: Boolean = false,
    /** Nach einem Update einmalig sichtbares Änderungsprotokoll. */
    val showWhatsNew: Boolean = false,
    val whatsNewVersion: String? = null,
)

data class NextcloudUiState(
    val connected: Boolean = false,
    val user: String = "",
    val connecting: Boolean = false,
)

data class GoogleDriveUiState(
    val backupConnected: Boolean = false,
    val backupEmail: String = "",
    val pdfConnected: Boolean = false,
    val pdfEmail: String = "",
    val playServices: GooglePlayServicesStatus = GooglePlayServicesStatus.CHECKING,
)

enum class GooglePlayServicesStatus {
    CHECKING, AVAILABLE, MISSING, UPDATE_REQUIRED, DISABLED, INVALID, UNAVAILABLE,
}

internal fun googlePlayServicesStatus(errorCode: Int): GooglePlayServicesStatus = when (errorCode) {
    0 -> GooglePlayServicesStatus.AVAILABLE
    1 -> GooglePlayServicesStatus.MISSING
    2 -> GooglePlayServicesStatus.UPDATE_REQUIRED
    3 -> GooglePlayServicesStatus.DISABLED
    9 -> GooglePlayServicesStatus.INVALID
    else -> GooglePlayServicesStatus.UNAVAILABLE
}

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val db = (application as EStundnzettlApp).database
    private val entriesRepo = EntriesRepository(db)
    private val workCodesRepo = WorkCodesRepository(db)
    private val attachmentsRepo = com.estundnzettl.app.data.AttachmentsRepository(db)
    val settings = SettingsRepository(db.settingsDao())
    private val secrets = com.estundnzettl.app.data.SecretStore(application)
    private val nextcloudManager = com.estundnzettl.app.data.NextcloudManager(settings, secrets)
    private val googleDrive = com.estundnzettl.app.data.GoogleDriveManager(application, settings)
    private val pdfArchive =
        com.estundnzettl.app.data.PdfArchiveManager(application, settings, nextcloudManager, googleDrive)

    private val timerJson = Json { ignoreUnknownKeys = true }

    private val _state = MutableStateFlow(MainUiState())
    val state: StateFlow<MainUiState> = _state.asStateFlow()

    private val _messages = MutableSharedFlow<UiMessage>(extraBufferCapacity = 8)
    val messages: SharedFlow<UiMessage> = _messages.asSharedFlow()

    private var allEntries: List<Entry> = emptyList()

    init {
        viewModelScope.launch {
            // Erst laden, wenn die Capacitor-Datenübernahme durch ist —
            // sonst racet die Onboarding-Entscheidung gegen den Import.
            (getApplication<android.app.Application>() as? EStundnzettlApp)
                ?.legacyImport?.join()

            // Einmaliges Willkommens-Popup für Umsteiger von der
            // Capacitor-Version (Migration gelaufen, Popup noch nie gezeigt)
            if (settings.getString(com.estundnzettl.app.data.LegacyDbImporter.MIGRATION_MARKER_KEY) != null &&
                settings.getString(KEY_NATIVE_WELCOME_SEEN) != "1"
            ) {
                _state.value = _state.value.copy(showNativeWelcome = true)
            }

            // GitHub-Update-Check (nur Sideload; Debug-Builds prüfen nie)
            launch {
                val release = com.estundnzettl.app.data.UpdateCheck.check(
                    getApplication(),
                    settings,
                    currentVersion = com.estundnzettl.app.BuildConfig.VERSION_NAME,
                    isDebugBuild = com.estundnzettl.app.BuildConfig.DEBUG,
                )
                if (release != null) {
                    _state.value = _state.value.copy(updateAvailable = release)
                }
            }
            loadSettings()
            restoreTimer()
            // Onboarding zeigen, wenn noch kein Profil existiert (leerer
            // Name = Onboarding-Check der Web-App).
            if (_state.value.userData?.name.isNullOrBlank()) {
                _state.value = _state.value.copy(onboarding = OnboardingUiState(active = true))
            }
            prepareWhatsNew()
            refreshAttachments()
            refreshNextcloudState(connecting = false)
            refreshGoogleState()
            // Startup-Check des PDF-Archivs (verzögert wie in der TS-App,
            // damit DB-/Settings-Loads abgeschlossen sind)
            viewModelScope.launch {
                kotlinx.coroutines.delay(3000)
                autoPdfArchiveRun("startup")
                maybeShowSupportPrompt()
            }
            entriesRepo.observeAll().collect { entries ->
                allEntries = entries
                recompute()
                _state.value = _state.value.copy(loading = false)
                // Debounced Auto-Save wie useAutoBackup (2 s nach Änderung)
                scheduleAutoBackup()
            }
        }
    }

    private suspend fun loadSettings() {
        val userData = settings.getUserData()
        val localeId = settings.getLocaleId()
        val locale = getLocale(localeId)
        val config = settings.getCalculationConfig(userData?.workDays)
        val theme = settings.getTheme()
        val language = settings.getString(SettingsRepository.Keys.LANGUAGE)
            ?: I18n.resolveSystemLanguage(JavaLocale.getDefault().language)
        val codes = workCodesRepo.getAll()
        val materialYou = settings.getBoolean("material_you_enabled")
        _state.value = _state.value.copy(
            userData = userData,
            locale = locale,
            calculationConfig = config,
            theme = theme,
            language = language,
            workCodes = codes,
            materialYouEnabled = materialYou,
        )
    }

    private fun recompute() {
        val s = _state.value
        val month = s.currentMonth
        val monthEntries = allEntries.filter { entry ->
            entry.date.startsWith("%04d-%02d".format(month.year, month.monthValue))
        }
        val appData = deriveAppData(
            entries = monthEntries,
            userData = s.userData,
            viewYear = month.year,
            viewMonth1Based = month.monthValue,
            allEntries = allEntries,
            today = LocalDate.now(),
            locale = s.locale,
            config = s.calculationConfig,
        )
        _state.value = s.copy(appData = appData)
    }

    // ─── Navigation & Monat ──────────────────────────────────

    fun setView(view: String) {
        _state.value = _state.value.copy(view = view)
        if (view == "dashboard") {
            _state.value = _state.value.copy(
                form = _state.value.form.copy(editingEntry = null)
            )
        }
    }

    fun changeMonth(delta: Long) {
        _state.value = _state.value.copy(currentMonth = _state.value.currentMonth.plusMonths(delta))
        recompute()
    }

    fun setMonth(month: YearMonth) {
        _state.value = _state.value.copy(currentMonth = month)
        recompute()
    }

    // ─── Bericht (PDF) ───────────────────────────────────────

    /** Rohliste aller Einträge (unkorrigiert) — für den PDF-Bericht. */
    fun rawAllEntries(): List<Entry> = allEntries

    /** Alle Attachments — der Bericht filtert selbst nach Zeitraum. */
    suspend fun getAllAttachments(): List<com.estundnzettl.core.model.Attachment> =
        attachmentsRepo.getAll()

    // ─── Automatisches PDF-Archiv ────────────────────────────

    private fun pdfArchiveData() = com.estundnzettl.app.data.PdfArchiveManager.Data(
        entries = allEntries,
        userData = _state.value.userData,
        workCodes = _state.value.workCodes,
        locale = _state.value.locale,
        calculationConfig = _state.value.calculationConfig,
    )

    /** Auto-Trigger (Startup/Resume) — Fehler landen nur im Log/Setting. */
    fun autoPdfArchiveRun(source: String) {
        // Nie mit halb geladenen Daten laufen: Ein leerer Entry-Stand
        // würde sonst Hash + Archiv-PDF mit leerem Monat überschreiben.
        if (_state.value.loading) return
        viewModelScope.launch { pdfArchive.performRun(pdfArchiveData(), source) }
    }

    /** Manueller "Jetzt ausführen"-Lauf aus den Einstellungen. */
    suspend fun runPdfArchiveNow(): com.estundnzettl.app.data.PdfArchiveManager.RunOutcome =
        pdfArchive.performRun(pdfArchiveData(), source = "manual", force = true)

    /** App kam aus dem Hintergrund zurück (Port des appStateChange-Listeners). */
    fun onAppResume() {
        autoPdfArchiveRun("resume")
    }

    // ─── Formular ────────────────────────────────────────────

    fun updateForm(transform: (FormUiState) -> FormUiState) {
        _state.value = _state.value.copy(form = transform(_state.value.form))
    }

    private fun defaultCode(): Int {
        val codes = _state.value.workCodes
        return if (codes.isNotEmpty()) codes[0].id else 1
    }

    /** Port von startNewEntry (useEntryActions). */
    fun startNewEntry() {
        val formDate = LocalDate.now().toDateString()
        val (start, end) = getDefaultTimesForDate(allEntries, formDate)
        _state.value = _state.value.copy(
            form = FormUiState(
                entryType = "work",
                formDate = formDate,
                startTime = start,
                endTime = end,
                pauseDuration = 30,
                project = "",
                code = defaultCode(),
            ),
            view = "add",
        )
    }

    /** Port von startEdit (useEntryActions). */
    fun startEdit(entry: Entry) {
        val isDrive = entry.type == EntryType.WORK && entry.code == WorkCodes.DRIVE
        val isSpecial = entry.type == EntryType.VACATION || entry.type == EntryType.SICK ||
            entry.type == EntryType.TIME_COMP
        val specialManual = isSpecial && !entry.start.isNullOrEmpty() && !entry.end.isNullOrEmpty()

        var form = FormUiState(
            entryType = if (isDrive) "drive" else entry.type.wireName,
            formDate = entry.date,
            editingEntry = entry,
            specialManualMode = specialManual,
            code = entry.code ?: defaultCode(),
        )
        form = when {
            entry.type == EntryType.WORK -> form.copy(
                startTime = entry.start ?: "06:00",
                endTime = entry.end ?: "16:30",
                pauseDuration = if (isDrive) 0 else entry.pause,
                project = entry.project ?: "",
            )
            specialManual -> form.copy(
                startTime = entry.start!!,
                endTime = entry.end!!,
                pauseDuration = 0,
                project = "",
            )
            else -> form.copy(pauseDuration = 0, project = "")
        }
        _state.value = _state.value.copy(form = form, view = "add")
    }

    /** Neues Datum im Formular → Default-Zeiten anpassen (EntryForm-Effekt). */
    fun onFormDateChanged(date: String) {
        val s = _state.value
        var form = s.form.copy(formDate = date)
        val isWorkLike = form.entryType == "work" || form.entryType == "drive"
        if (form.editingEntry == null && !form.isLiveEntry && isWorkLike) {
            val (start, end) = getDefaultTimesForDate(allEntries, date)
            form = form.copy(startTime = start, endTime = end)
        }
        _state.value = s.copy(form = form)
    }

    /** Port von handleSaveEntry — Validierung/Ableitung liegt im Core. */
    fun saveEntry() {
        val s = _state.value
        val form = s.form
        val result = prepareEntryToSave(
            form = EntryFormInput(
                entryType = form.entryType,
                formDate = form.formDate,
                startTime = form.startTime,
                endTime = form.endTime,
                pauseDuration = form.pauseDuration,
                project = form.project,
                code = form.code,
                specialManualMode = form.specialManualMode,
                editingEntry = form.editingEntry,
            ),
            entries = allEntries,
            userData = s.userData,
            workCodes = s.workCodes,
            newEntryId = EntryIdGenerator.next(),
            locale = s.locale,
            config = s.calculationConfig,
        )

        when (result) {
            is SaveEntryResult.StartEqualsEnd -> emit(UiMessage("toasts.entry.startEqualsEnd"))
            is SaveEntryResult.Overlap -> emit(UiMessage("toasts.entry.overlap"))
            is SaveEntryResult.Success -> viewModelScope.launch {
                val editing = form.editingEntry != null
                try {
                    entriesRepo.upsert(result.entry)
                } catch (_: Exception) {
                    emit(UiMessage(if (editing) "toasts.entry.updateFailed" else "toasts.entry.saveFailed"))
                    return@launch
                }
                result.lastCodeToSave?.let { code ->
                    runCatching { settings.setRaw("last_code", JsonPrimitive(code)) }
                }
                emit(UiMessage(if (editing) "toasts.entry.updated" else "toasts.entry.saved"))
                _state.value = _state.value.copy(
                    form = _state.value.form.copy(
                        editingEntry = null, project = "", entryType = "work",
                        specialManualMode = false, isLiveEntry = false,
                    ),
                    view = "dashboard",
                )
            }
        }
    }

    // ─── Löschen ─────────────────────────────────────────────

    fun requestDeleteEntry(entry: Entry) {
        _state.value = _state.value.copy(deleteTarget = entry)
    }

    fun cancelDelete() {
        _state.value = _state.value.copy(deleteTarget = null)
    }

    fun confirmDelete() {
        val target = _state.value.deleteTarget ?: return
        _state.value = _state.value.copy(deleteTarget = null)
        val id = (target.id as? EntryId.Numeric)?.value ?: return
        viewModelScope.launch {
            try {
                // Dateien der zugehörigen Anhänge merken; die Metadaten
                // löscht deleteWithAttachments atomar mit dem Entry.
                val orphanedFiles = _state.value.attachments
                    .filter { it.entryId == target.id }
                    .map { it.storagePath }
                entriesRepo.delete(id)
                orphanedFiles.forEach { deleteAttachmentFile(it) }
                refreshAttachments()
                emit(UiMessage("toasts.entry.deleted"))
            } catch (_: Exception) {
                emit(UiMessage("toasts.entry.deleteFailed"))
            }
        }
    }

    // ─── Live-Timer (Port von useLiveTimer + useTimerActions) ──

    private suspend fun restoreTimer() {
        val raw = runCatching { settings.getRaw("live_timer") }.getOrNull() ?: return
        val timer = runCatching {
            timerJson.decodeFromString(TimerUiState.serializer(), raw.toString())
        }.getOrNull() ?: return
        _state.value = _state.value.copy(timer = timer)

        // Auto-Checkout: Timer lief über den Tag hinaus → bei 23:59 des
        // Start-Tags beenden und Formular vorbefüllen.
        if (timer.isRunning && timer.startTime != null) {
            val start = LocalDateTime.ofInstant(Instant.parse(timer.startTime), ZoneId.systemDefault())
            val today = LocalDate.now()
            if (start.toLocalDate() != today) {
                val daysMissed = autoCheckoutDays(start.toLocalDate(), today)
                val pauseMinutes = Math.round(timer.accumulatedPause / 1000.0 / 60.0).toInt()
                persistTimer(TimerUiState())
                _state.value = _state.value.copy(
                    timer = TimerUiState(),
                    form = FormUiState(
                        entryType = "work",
                        formDate = start.toLocalDate().toDateString(),
                        startTime = "%02d:%02d".format(start.hour, start.minute),
                        endTime = "23:59",
                        pauseDuration = pauseMinutes,
                        project = "",
                        code = defaultCode(),
                        isLiveEntry = true,
                    ),
                    view = "add",
                )
                Haptics.heavy(getApplication())
                emit(
                    UiMessage(
                        key = "toasts.autoCheckout",
                        args = listOf("count" to daysMissed),
                        tone = UiMessageTone.WARNING,
                    )
                )
            }
        }
    }

    private fun persistTimer(timer: TimerUiState) {
        _state.value = _state.value.copy(timer = timer)
        viewModelScope.launch {
            runCatching {
                settings.setRaw(
                    "live_timer",
                    Json.parseToJsonElement(timerJson.encodeToString(TimerUiState.serializer(), timer)),
                )
            }
        }
    }

    fun startTimer() {
        persistTimer(
            TimerUiState(
                isRunning = true,
                isPaused = false,
                startTime = Instant.now().toString(),
            )
        )
        emit(UiMessage("toasts.timer.started"))
    }

    fun pauseTimer() {
        val timer = _state.value.timer
        if (!timer.isRunning || timer.isPaused) return
        persistTimer(timer.copy(isPaused = true, pauseStartTime = Instant.now().toString()))
    }

    fun resumeTimer() {
        val timer = _state.value.timer
        if (!timer.isPaused || timer.pauseStartTime == null) return
        val pauseMs = Instant.now().toEpochMilli() - Instant.parse(timer.pauseStartTime).toEpochMilli()
        persistTimer(
            timer.copy(
                isPaused = false,
                pauseStartTime = null,
                accumulatedPause = timer.accumulatedPause + pauseMs,
            )
        )
    }

    /** Stop → Formular vorbefüllen und in die Eingabe wechseln. */
    fun stopTimer() {
        val timer = _state.value.timer
        val startIso = timer.startTime ?: return
        val now = Instant.now()

        var pauseMs = timer.accumulatedPause
        if (timer.isPaused && timer.pauseStartTime != null) {
            pauseMs += now.toEpochMilli() - Instant.parse(timer.pauseStartTime).toEpochMilli()
        }
        val pauseMinutes = Math.round(pauseMs / 1000.0 / 60.0).toInt()

        val zone = ZoneId.systemDefault()
        val start = LocalDateTime.ofInstant(Instant.parse(startIso), zone)
        val end = LocalDateTime.ofInstant(now, zone)

        persistTimer(TimerUiState())

        _state.value = _state.value.copy(
            form = FormUiState(
                entryType = "work",
                formDate = start.toLocalDate().toDateString(),
                startTime = "%02d:%02d".format(start.hour, start.minute),
                endTime = "%02d:%02d".format(end.hour, end.minute),
                pauseDuration = pauseMinutes,
                project = "",
                code = defaultCode(),
                isLiveEntry = true,
            ),
            view = "add",
        )
        emit(UiMessage("toasts.timer.captured"))
    }

    // ─── Work Codes ──────────────────────────────────────────

    /** Quick-Add einer neuen Tätigkeit (Port von addWorkCode). */
    fun addWorkCode(label: String): Boolean {
        val trimmed = label.trim()
        if (trimmed.isEmpty()) return false
        val nextId = (_state.value.workCodes.maxOfOrNull { it.id } ?: 0) + 1
        viewModelScope.launch {
            workCodesRepo.upsert(WorkCode(nextId, trimmed))
            _state.value = _state.value.copy(workCodes = workCodesRepo.getAll())
        }
        return true
    }

    // ─── Settings-Aktionen (Port der Settings/*-Sektionen) ────

    /** UserData ändern und persistieren; weeklyTargetMinutes bleibt synchron. */
    fun setUserData(transform: (UserData) -> UserData) {
        val current = _state.value.userData ?: UserData()
        val next = transform(current)
        _state.value = _state.value.copy(userData = next)
        viewModelScope.launch {
            settings.setUserData(next)
            if (next.workDays != current.workDays && next.workDays != null) {
                val config = _state.value.calculationConfig
                if (config != null) {
                    patchCalculationConfig { it.copy(weeklyTargetMinutes = next.workDays!!.sum()) }
                    return@launch
                }
            }
            recompute()
        }
    }

    fun setTheme(theme: String) {
        _state.value = _state.value.copy(theme = theme)
        viewModelScope.launch { settings.setTheme(theme) }
    }

    fun setLanguage(language: String) {
        _state.value = _state.value.copy(language = language)
        viewModelScope.launch { settings.setString(SettingsRepository.Keys.LANGUAGE, language) }
        emit(UiMessage("settings.language.toast"))
    }

    fun setMaterialYou(enabled: Boolean) {
        _state.value = _state.value.copy(materialYouEnabled = enabled)
        viewModelScope.launch { settings.setBoolean("material_you_enabled", enabled) }
        emit(UiMessage(if (enabled) "settings.toast.materialYouOn" else "settings.toast.materialYouOff"))
    }

    /**
     * Locale wechseln; optional die Berechnungsregeln auf die neuen
     * Locale-Defaults zurücksetzen (resetCalculationConfigToLocale).
     */
    fun setLocaleId(localeId: String, resetConfig: Boolean) {
        val locale = getLocale(localeId)
        _state.value = _state.value.copy(locale = locale)
        viewModelScope.launch {
            settings.setLocaleId(locale.id)
            if (resetConfig) {
                val workDays = _state.value.userData?.workDays
                val fresh = com.estundnzettl.core.calc.getDefaultCalculationConfig(locale, workDays)
                _state.value = _state.value.copy(calculationConfig = fresh)
                settings.setCalculationConfig(fresh)
            }
            recompute()
        }
    }

    fun patchCalculationConfig(transform: (CalculationConfig) -> CalculationConfig) {
        val current = _state.value.calculationConfig ?: return
        val next = transform(current)
        _state.value = _state.value.copy(calculationConfig = next)
        viewModelScope.launch {
            settings.setCalculationConfig(next)
            recompute()
        }
    }

    /** Aufzeichnungsart wechseln — Port von RecordingModeSettings.setSimpleMode. */
    fun setSimpleMode(nextSimpleMode: Boolean) {
        val s = _state.value
        val userData = s.userData ?: UserData()
        if (nextSimpleMode == userData.simpleMode) return

        val targetLocale = if (!nextSimpleMode && s.locale.id == "neutral") {
            getLocale(com.estundnzettl.core.locale.DEFAULT_LOCALE_ID)
        } else {
            s.locale
        }
        val nextWorkDays = if (!nextSimpleMode && userData.workDays?.any { it > 0 } != true) {
            targetLocale.defaultWorkDays
        } else {
            userData.workDays
        }

        if (!nextSimpleMode && targetLocale.id != s.locale.id) {
            setLocaleId(targetLocale.id, resetConfig = false)
        }
        if (!nextSimpleMode) {
            val fresh = com.estundnzettl.core.calc.getDefaultCalculationConfig(targetLocale, nextWorkDays)
            _state.value = _state.value.copy(calculationConfig = fresh)
            viewModelScope.launch { settings.setCalculationConfig(fresh) }
        }
        setUserData { it.copy(simpleMode = nextSimpleMode, workDays = nextWorkDays) }
        emit(UiMessage(
            if (nextSimpleMode) "settings.recordingMode.toastSimple"
            else "settings.recordingMode.toastCalculated"
        ))
    }

    fun setExpertMode(enabled: Boolean) {
        setUserData { it.copy(expertMode = enabled) }
        emit(UiMessage(if (enabled) "settings.toast.expertOn" else "settings.toast.expertOff"))
    }

    /** Arbeitszeitmodell-Preset anwenden — Port von handlePresetSelect. */
    fun applyWorkModel(model: com.estundnzettl.core.model.WorkModel) {
        setUserData {
            if (model.id != "custom") it.copy(workModelId = model.id, workDays = model.days)
            else it.copy(workModelId = model.id)
        }
        emit(UiMessage(
            if (model.id == "custom") "settings.data.toast.customActivated"
            else "settings.data.toast.templateApplied"
        ))
    }

    fun setWorkDayMinutes(dayIndex: Int, minutes: Int) {
        val workDays = (_state.value.userData?.workDays ?: List(7) { 0 }).toMutableList()
        if (dayIndex !in workDays.indices) return
        workDays[dayIndex] = minutes
        setUserData { it.copy(workDays = workDays) }
        emit(UiMessage("settings.toast.timeUpdated"))
    }

    // ─── Work Codes ──────────────────────────────────────────

    private fun refreshWorkCodes() {
        viewModelScope.launch {
            _state.value = _state.value.copy(workCodes = workCodesRepo.getAll())
        }
    }

    fun updateWorkCode(id: Int, label: String): Boolean {
        val trimmed = label.trim()
        if (trimmed.isEmpty()) return false
        viewModelScope.launch {
            workCodesRepo.upsert(WorkCode(id, trimmed))
            refreshWorkCodes()
        }
        return true
    }

    fun deleteWorkCode(id: Int) {
        viewModelScope.launch {
            workCodesRepo.delete(id)
            refreshWorkCodes()
        }
    }

    fun loadWorkCodePreset(presetId: String): Boolean {
        val preset = com.estundnzettl.core.model.WORK_CODE_PRESETS.firstOrNull { it.id == presetId }
            ?: return false
        viewModelScope.launch {
            workCodesRepo.replaceAll(preset.codes)
            refreshWorkCodes()
        }
        return true
    }

    fun clearAllWorkCodes() {
        viewModelScope.launch {
            workCodesRepo.replaceAll(emptyList())
            refreshWorkCodes()
        }
    }

    // ─── Neuberechnung & Danger Zone ─────────────────────────

    fun recalculateAllEntries() {
        val s = _state.value
        viewModelScope.launch {
            try {
                val result = entriesRepo.recalculateAll(s.userData, s.locale, s.calculationConfig)
                emit(
                    if (result.fixed > 0) UiMessage(
                        "settings.calc.toast.recalcFixed",
                        listOf("fixed" to result.fixed, "total" to result.total),
                    ) else UiMessage(
                        "settings.calc.toast.recalcAllCorrect",
                        listOf("total" to result.total),
                    )
                )
            } catch (_: Exception) {
                emit(UiMessage("settings.calc.toast.recalcError"))
            }
        }
    }

    /** Alles löschen: Einträge + Attachments + Profil-Reset (deleteAllMessage). */
    fun deleteAllData() {
        viewModelScope.launch {
            try {
                // Sicherheits-Backup vor dem Löschen in den App-Cache
                // (Port des pre_delete_backup der Web-App — best-effort)
                runCatching {
                    val file = java.io.File(
                        getApplication<Application>().cacheDir,
                        "estundnzettl_pre_delete_backup.json",
                    )
                    file.writeText(createBackupFileContent(), Charsets.UTF_8)
                }

                entriesRepo.deleteAll()
                runCatching { attachmentsDir().deleteRecursively() }
                val resetUser = UserData()
                settings.setUserData(resetUser)
                runCatching { db.settingsDao().delete("last_code") }
                refreshAttachments()
                reloadAfterImport()

                // Zurück in den Einrichtungs-Assistenten (wie die Web-App,
                // deren Router bei leerem Profilnamen den Wizard zeigt)
                _state.value = _state.value.copy(
                    userData = resetUser,
                    view = "dashboard",
                    onboarding = OnboardingUiState(active = true),
                )
                emit(UiMessage("toasts.appReset"))
            } catch (_: Exception) {
                emit(UiMessage("toasts.entry.deleteAllFailed"))
            }
        }
    }

    // ─── Backup Export / Import ──────────────────────────────

    private val backupRepo by lazy { com.estundnzettl.app.data.BackupRepository(db, settings) }

    /** Datei-Inhalt für den manuellen Export (checksummter v7-Payload). */
    suspend fun createBackupFileContent(): String =
        backupRepo.toFileContent(backupRepo.createBackupPayload())

    /** Import: analysieren; mit Settings → Konflikt-Dialog, sonst direkt anwenden. */
    fun importBackupText(text: String) {
        val analysis = backupRepo.analyze(text)
        if (!analysis.valid) {
            emit(UiMessage("settings.toast.invalidBackup"))
            return
        }
        if (analysis.integrity == com.estundnzettl.core.backup.BackupIntegrity.MISMATCH) {
            emit(UiMessage("settings.toast.integrityMismatch"))
        }
        if (analysis.hasSettings) {
            _state.value = _state.value.copy(pendingImport = analysis)
        } else {
            viewModelScope.launch {
                val ok = backupRepo.apply(analysis, "ALL")
                if (ok) {
                    reloadAfterImport()
                    emit(UiMessage(
                        "settings.toast.entriesImported",
                        listOf("count" to analysis.entryCount),
                    ))
                } else {
                    emit(UiMessage("settings.toast.restoreError"))
                }
            }
        }
    }

    fun confirmImport(mode: String) {
        val pending = _state.value.pendingImport ?: return
        _state.value = _state.value.copy(pendingImport = null)
        viewModelScope.launch {
            val ok = backupRepo.apply(pending, mode)
            if (ok) {
                reloadAfterImport()
                emit(UiMessage("settings.toast.restoreSuccess"))
            } else {
                emit(UiMessage("settings.toast.restoreError"))
            }
        }
    }

    fun cancelImport() {
        _state.value = _state.value.copy(pendingImport = null)
    }

    private suspend fun reloadAfterImport() {
        // Große Schreiboperation (Restore/Import/Demo/Reset) sofort in
        // die Hauptdatei checkpointen — nicht nur im WAL lassen
        db.checkpoint()
        loadSettings()
        recompute()
        refreshAttachments()
    }

    // ─── Anhänge (Port von useAttachments.ts) ────────────────

    companion object {
        private const val KEY_NATIVE_WELCOME_SEEN = "estundnzettl_native_welcome_seen_v1"
        private const val KEY_CHANGELOG_VERSION_CODE = "last_seen_changelog_version_code"
        private const val KEY_CHANGELOG_VERSION_NAME = "last_seen_changelog_version_name"
        private const val ATTACHMENTS_DIR = "attachments"
        private const val MAX_ATTACHMENT_SIZE = 10L * 1024 * 1024
        private val ALLOWED_ATTACHMENT_TYPES = setOf(
            "application/pdf", "image/jpeg", "image/png", "image/webp",
        )
        private const val TOUR_SEEN_KEY = "estundnzettl_tour_seen"
    }

    private fun attachmentsDir(): java.io.File =
        java.io.File(getApplication<Application>().filesDir, ATTACHMENTS_DIR).apply { mkdirs() }

    private suspend fun refreshAttachments() {
        runCatching {
            val all = attachmentsRepo.getAll()
                .sortedByDescending { it.createdAt }
            val labels = attachmentsRepo.getLabelSuggestions()
            _state.value = _state.value.copy(attachments = all, labelSuggestions = labels)
        }
    }

    fun openAttachments(entry: Entry) {
        _state.value = _state.value.copy(attachmentEntry = entry)
    }

    fun closeAttachments() {
        _state.value = _state.value.copy(attachmentEntry = null)
    }

    /**
     * Anhang anlegen: Datei aus der SAF-Uri in den App-Speicher kopieren,
     * Metadaten in SQLite, Label in die MRU-Liste. Validierung wie die
     * Web-App (max. 10 MB; PDF/JPEG/PNG/WebP). Wirft bei Fehlern mit
     * anzeigbarer Meldung.
     */
    suspend fun addAttachment(entryId: EntryId, uri: android.net.Uri, label: String) {
        val context = getApplication<Application>()
        val trimmedLabel = label.trim()
        if (trimmedLabel.isEmpty()) {
            throw AttachmentValidationException("attachments.toast.labelRequired")
        }

        val resolver = context.contentResolver
        val mimeType = resolver.getType(uri) ?: "application/octet-stream"
        if (mimeType !in ALLOWED_ATTACHMENT_TYPES) {
            throw AttachmentValidationException("attachments.toast.invalidType")
        }

        var displayName = "dokument"
        var size = -1L
        resolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIdx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                val sizeIdx = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
                if (nameIdx >= 0) cursor.getString(nameIdx)?.let { displayName = it }
                if (sizeIdx >= 0 && !cursor.isNull(sizeIdx)) size = cursor.getLong(sizeIdx)
            }
        }

        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw AttachmentValidationException("attachments.toast.readError")
        if (size < 0) size = bytes.size.toLong()
        if (size > MAX_ATTACHMENT_SIZE) {
            throw AttachmentValidationException("attachments.toast.fileTooLarge")
        }

        val id = "att_${System.currentTimeMillis()}_${(1..6).map { "abcdefghijklmnopqrstuvwxyz0123456789".random() }.joinToString("")}"
        val extension = displayName.substringAfterLast('.', "bin").lowercase()
        val fileName = displayName.replace(Regex("[^a-zA-Z0-9._-]"), "_").ifEmpty { "dokument" }
        val storagePath = "$ATTACHMENTS_DIR/$id.$extension"

        val file = java.io.File(attachmentsDir(), "$id.$extension")
        file.writeBytes(bytes)

        val attachment = com.estundnzettl.core.model.Attachment(
            id = id,
            entryId = entryId,
            label = trimmedLabel,
            fileName = fileName,
            mimeType = mimeType,
            storagePath = storagePath,
            fileSize = size,
            createdAt = java.time.Instant.now().toString(),
        )

        try {
            attachmentsRepo.upsert(attachment)
        } catch (_: Exception) {
            runCatching { file.delete() }
            throw AttachmentValidationException("attachments.toast.addError")
        }
        attachmentsRepo.pushLabelSuggestion(trimmedLabel)
        refreshAttachments()
    }

    suspend fun removeAttachment(attachmentId: String) {
        val removed = _state.value.attachments.firstOrNull { it.id == attachmentId } ?: return
        attachmentsRepo.delete(attachmentId)
        deleteAttachmentFile(removed.storagePath)
        refreshAttachments()
    }

    /** Datei-Inhalt eines Anhangs (für Teilen/Report-Bundle). */
    fun attachmentFile(attachment: com.estundnzettl.core.model.Attachment): java.io.File =
        java.io.File(getApplication<Application>().filesDir, attachment.storagePath)

    private fun deleteAttachmentFile(storagePath: String) {
        runCatching {
            java.io.File(getApplication<Application>().filesDir, storagePath).delete()
        }
    }

    // ─── Demo-Daten (Port von DataSettings.handleConfirmDemoData) ──

    fun loadDemoData() {
        viewModelScope.launch {
            try {
                val entries = com.estundnzettl.core.calc.generateDemoEntries()
                db.replaceFullSnapshot(
                    com.estundnzettl.app.data.ImportSnapshot(
                        entries = entries,
                        userData = com.estundnzettl.core.calc.DEMO_USER.toJson(),
                        workCodes = com.estundnzettl.core.calc.DEMO_WORK_CODES,
                    ),
                )
                runCatching { db.settingsDao().delete("last_code") }
                reloadAfterImport()
                emit(UiMessage("settings.data.toast.demoLoaded"))
            } catch (_: Exception) {
                emit(UiMessage("settings.toast.demoLoadFailed"))
            }
        }
    }

    // ─── App-Tour (Port von useAppState-Tour-Handling) ───────

    private suspend fun maybeStartTour() {
        val seen = settings.getString(TOUR_SEEN_KEY) == "1"
        if (!seen) {
            kotlinx.coroutines.delay(350)
            _state.value = _state.value.copy(showTour = true)
        }
    }

    fun closeTour() {
        _state.value = _state.value.copy(showTour = false)
        viewModelScope.launch { settings.setString(TOUR_SEEN_KEY, "1") }
    }

    // ─── Support-Prompt (Port aus App.tsx) ───────────────────

    private suspend fun maybeShowSupportPrompt() {
        val dismissed = settings.getString("estundnzettl_support_prompt_dismissed_v1") == "true"
        if (dismissed) return
        if (_state.value.userData?.name.isNullOrBlank() || allEntries.isEmpty()) return

        val key = "estundnzettl_support_prompt_first_eligible_v1"
        val now = System.currentTimeMillis()
        val firstEligible = settings.getString(key)?.toLongOrNull() ?: 0L
        if (firstEligible <= 0) {
            settings.setString(key, now.toString())
            return
        }
        // Frühestens 5 Tage nach der ersten Eignung
        if (now - firstEligible < 5L * 24 * 60 * 60 * 1000) return
        if (!_state.value.onboarding.active) {
            _state.value = _state.value.copy(showSupportPrompt = true)
        }
    }

    fun dismissSupportPrompt() {
        _state.value = _state.value.copy(showSupportPrompt = false)
        viewModelScope.launch {
            settings.setString("estundnzettl_support_prompt_dismissed_v1", "true")
        }
    }

    // ─── Nextcloud (Port von useNextcloudBackup) ─────────────

    private val autoBackup by lazy {
        com.estundnzettl.app.data.AutoBackupManager(
            getApplication(), settings, backupRepo, nextcloudManager, googleDrive,
        )
    }

    /** Willkommens-Popup nach der Capacitor-Migration bestätigt. */
    fun dismissNativeWelcome() {
        _state.value = _state.value.copy(showNativeWelcome = false)
        viewModelScope.launch { settings.setString(KEY_NATIVE_WELCOME_SEEN, "1") }
    }

    /** Automatisches Änderungsprotokoll bestätigt; manuell bleibt es in den Einstellungen erreichbar. */
    fun dismissWhatsNew() {
        _state.value = _state.value.copy(showWhatsNew = false)
        viewModelScope.launch { markCurrentChangelogSeen() }
    }

    private suspend fun prepareWhatsNew() {
        val currentCode = BuildConfig.VERSION_CODE
        val currentName = BuildConfig.VERSION_NAME
        val lastSeenCode = settings.getString(KEY_CHANGELOG_VERSION_CODE)?.toIntOrNull()
        val hasEntry = runCatching {
            val raw = getApplication<Application>().assets
                .open("changelog/changelog.de.json")
                .bufferedReader().use { it.readText() }
            Json.parseToJsonElement(raw).jsonArray.any { item ->
                item.jsonObject["version"]?.jsonPrimitive?.content == currentName
            }
        }.getOrDefault(false)

        when (
            decideWhatsNew(
                lastSeenVersionCode = lastSeenCode,
                currentVersionCode = currentCode,
                hasExistingProfile = !_state.value.userData?.name.isNullOrBlank(),
                hasCurrentChangelog = hasEntry,
            )
        ) {
            WhatsNewDecision.SHOW -> _state.value = _state.value.copy(
                showWhatsNew = true,
                whatsNewVersion = currentName,
            )
            WhatsNewDecision.MARK_CURRENT -> markCurrentChangelogSeen()
            WhatsNewDecision.NONE -> Unit
        }
    }

    private suspend fun markCurrentChangelogSeen() {
        settings.setString(KEY_CHANGELOG_VERSION_CODE, BuildConfig.VERSION_CODE.toString())
        settings.setString(KEY_CHANGELOG_VERSION_NAME, BuildConfig.VERSION_NAME)
    }

    /** Update-Banner für genau diese Version wegklicken. */
    fun dismissUpdateBanner() {
        val tag = _state.value.updateAvailable?.tag ?: return
        _state.value = _state.value.copy(updateAvailable = null)
        viewModelScope.launch {
            settings.setString(com.estundnzettl.app.data.UpdateCheck.KEY_DISMISSED, tag)
        }
    }

    private var autoBackupJob: kotlinx.coroutines.Job? = null
    private var nextcloudPollJob: kotlinx.coroutines.Job? = null

    private suspend fun refreshNextcloudState(connecting: Boolean = _state.value.nextcloud.connecting) {
        val creds = runCatching { nextcloudManager.getCredentials() }.getOrNull()
        val enabled = settings.getBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED)
        _state.value = _state.value.copy(
            nextcloud = NextcloudUiState(
                connected = creds != null && enabled,
                user = creds?.user ?: "",
                connecting = connecting,
            ),
        )
    }

    /** Startet Login Flow v2; liefert die Browser-URL. Wirft bei Fehlern. */
    suspend fun nextcloudInitiate(serverUrl: String): String {
        val flow = com.estundnzettl.app.data.NextcloudClient.initiateLoginFlow(serverUrl)
        _state.value = _state.value.copy(nextcloud = _state.value.nextcloud.copy(connecting = true))
        startNextcloudPolling(flow.pollEndpoint, flow.token)
        return flow.loginUrl
    }

    /** Poll-Loop (3 s, max. 100 Versuche) — Port von startPolling. */
    private fun startNextcloudPolling(pollEndpoint: String, token: String) {
        nextcloudPollJob?.cancel()
        nextcloudPollJob = viewModelScope.launch {
            repeat(100) {
                kotlinx.coroutines.delay(3000)
                try {
                    when (val result = com.estundnzettl.app.data.NextcloudClient.pollLoginResult(pollEndpoint, token)) {
                        is com.estundnzettl.app.data.NextcloudClient.PollResult.Pending -> {}
                        is com.estundnzettl.app.data.NextcloudClient.PollResult.Complete -> {
                            nextcloudManager.persistLogin(result.server, result.loginName, result.appPassword)
                            runCatching {
                                com.estundnzettl.app.data.NextcloudClient
                                    .testConnection(result.server, result.loginName, result.appPassword)
                                com.estundnzettl.app.data.NextcloudClient
                                    .ensureFolderPath(result.server, result.loginName, result.appPassword,
                                        listOf(com.estundnzettl.app.data.NextcloudClient.BACKUP_FOLDER))
                            }
                            refreshNextcloudState(connecting = false)
                            emit(UiMessage("settings.backup.toast.ncConnectedAs", listOf("loginName" to result.loginName)))
                            return@launch
                        }
                    }
                } catch (e: Exception) {
                    refreshNextcloudState(connecting = false)
                    emit(UiMessage("settings.backup.toast.nextcloudLoginFailed"))
                    return@launch
                }
            }
            refreshNextcloudState(connecting = false)
            emit(UiMessage("settings.backup.toast.pollingTimeout"))
        }
    }

    fun cancelNextcloudConnect() {
        nextcloudPollJob?.cancel()
        viewModelScope.launch { refreshNextcloudState(connecting = false) }
    }

    fun disconnectNextcloud() {
        nextcloudPollJob?.cancel()
        viewModelScope.launch {
            nextcloudManager.disconnect()
            refreshNextcloudState(connecting = false)
            emit(UiMessage("settings.backup.toast.ncDisconnected"))
        }
    }

    fun testNextcloud() {
        viewModelScope.launch {
            val creds = nextcloudManager.getCredentials()
            if (creds == null) {
                emit(UiMessage("settings.backup.toast.ncConnectFirst"))
                return@launch
            }
            val result = com.estundnzettl.app.data.NextcloudClient
                .testConnection(creds.url, creds.user, creds.appPassword)
            if (result.isSuccess) {
                emit(UiMessage("settings.backup.toast.ncTestOk"))
            } else {
                emit(UiMessage("settings.backup.toast.ncTestFailed"))
            }
        }
    }

    // ─── Auto-Backup (Port von useAutoBackup) ────────────────

    /** Debounced Auto-Save 2 s nach Datenänderung. */
    private fun scheduleAutoBackup() {
        autoBackupJob?.cancel()
        autoBackupJob = viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            autoBackup.performBackup(com.estundnzettl.app.data.AutoBackupManager.Source.AUTO)
        }
    }

    /** App ging in den Hintergrund → Background-Backup (ohne Debounce). */
    fun onAppBackground() {
        viewModelScope.launch {
            // WAL in die Hauptdatei schreiben, bevor das System den
            // Prozess killen darf (schützt vor Datenverlust bei Updates)
            db.checkpoint()
            autoBackup.performBackup(com.estundnzettl.app.data.AutoBackupManager.Source.BACKGROUND)
        }
    }

    /** "Jetzt sichern" aus den Einstellungen. */
    suspend fun manualBackup(): com.estundnzettl.app.data.AutoBackupManager.Outcome =
        autoBackup.performBackup(com.estundnzettl.app.data.AutoBackupManager.Source.MANUAL)

    /** Toggle für das tägliche lokale Backup. */
    fun setLocalBackupEnabled(enabled: Boolean) {
        viewModelScope.launch {
            settings.setBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED, enabled)
        }
    }

    // ─── Google Drive (Port des GoogleDriveBackupPlugin-Flows) ──

    /** Consent-PendingIntents, die die Activity per IntentSender startet. */
    private val _googleAuthIntents =
        MutableSharedFlow<android.app.PendingIntent>(extraBufferCapacity = 2)
    val googleAuthIntents: SharedFlow<android.app.PendingIntent> = _googleAuthIntents.asSharedFlow()

    private var pendingGoogleScope: String? = null

    /** true → der nächste Consent-Callback gehört zum Onboarding-Restore. */
    private var pendingGoogleRestore = false

    private suspend fun refreshGoogleState() {
        val backupEmail = settings.getString(com.estundnzettl.app.data.GoogleDriveManager.KEY_ACCOUNT_EMAIL) ?: ""
        val pdfEmail = settings.getString(com.estundnzettl.app.data.GoogleDriveManager.KEY_PDF_ACCOUNT_EMAIL) ?: ""
        val playServices = runCatching {
            googlePlayServicesStatus(
                com.google.android.gms.common.GoogleApiAvailability.getInstance()
                    .isGooglePlayServicesAvailable(getApplication()),
            )
        }.getOrDefault(GooglePlayServicesStatus.UNAVAILABLE)
        _state.value = _state.value.copy(
            googleDrive = GoogleDriveUiState(
                backupConnected = backupEmail.isNotEmpty(),
                backupEmail = backupEmail,
                pdfConnected = pdfEmail.isNotEmpty(),
                pdfEmail = pdfEmail,
                playServices = playServices,
            ),
        )
    }

    /** Beim Öffnen der Backup-Karte erneut prüfen, falls Dienste aktiviert/aktualisiert wurden. */
    fun refreshGooglePlayServices() {
        viewModelScope.launch { refreshGoogleState() }
    }

    fun connectGoogleDrive(forPdfArchive: Boolean = false) {
        if (_state.value.googleDrive.playServices != GooglePlayServicesStatus.AVAILABLE) {
            emit(UiMessage("settings.backup.toast.gdriveUnavailable"))
            return
        }
        val scope = if (forPdfArchive) {
            com.estundnzettl.app.data.GoogleDriveManager.SCOPE_FILE
        } else {
            com.estundnzettl.app.data.GoogleDriveManager.SCOPE_APPDATA
        }
        viewModelScope.launch {
            try {
                val token = googleDrive.authorize(scope)
                onGoogleConnected(scope, token)
            } catch (e: com.estundnzettl.app.data.GoogleDriveManager.AuthRequiredException) {
                val intent = e.pendingIntent
                if (intent != null) {
                    pendingGoogleScope = scope
                    _googleAuthIntents.tryEmit(intent)
                } else {
                    emit(UiMessage("settings.backup.toast.gdriveUnavailable"))
                }
            } catch (e: Exception) {
                emit(UiMessage("settings.backup.toast.gdriveFailed"))
            }
        }
    }

    /** Ergebnis des Consent-Dialogs (von der Activity durchgereicht). */
    fun onGoogleAuthResult(intent: android.content.Intent?) {
        val scope = pendingGoogleScope ?: return
        pendingGoogleScope = null
        val forRestore = pendingGoogleRestore
        pendingGoogleRestore = false
        viewModelScope.launch {
            val token = googleDrive.tokenFromResultIntent(intent)
            if (token != null) {
                if (forRestore) {
                    finishGoogleDriveRestore(token)
                } else {
                    onGoogleConnected(scope, token)
                }
            } else {
                if (forRestore) updateOnboarding { it.copy(restoreLoading = false) }
                emit(UiMessage("settings.backup.toast.gdriveCancelled"))
            }
        }
    }

    private suspend fun onGoogleConnected(scope: String, token: String) {
        val email = googleDrive.fetchAccountEmail(token)
        if (scope == com.estundnzettl.app.data.GoogleDriveManager.SCOPE_APPDATA) {
            settings.setString(com.estundnzettl.app.data.GoogleDriveManager.KEY_ACCOUNT_EMAIL, email.ifEmpty { "Google" })
            settings.setBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED, true)
        } else {
            settings.setString(com.estundnzettl.app.data.GoogleDriveManager.KEY_PDF_ACCOUNT_EMAIL, email.ifEmpty { "Google" })
        }
        refreshGoogleState()
        emit(UiMessage("settings.backup.toast.gdriveConnected"))
    }

    fun disconnectGoogleDrive(forPdfArchive: Boolean = false) {
        viewModelScope.launch {
            if (forPdfArchive) {
                settings.setString(com.estundnzettl.app.data.GoogleDriveManager.KEY_PDF_ACCOUNT_EMAIL, "")
                settings.setBoolean(com.estundnzettl.app.data.PdfArchiveManager.KEY_GDRIVE, false)
            } else {
                settings.setString(com.estundnzettl.app.data.GoogleDriveManager.KEY_ACCOUNT_EMAIL, "")
                settings.setBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED, false)
                settings.setString(com.estundnzettl.app.data.AutoBackupManager.KEY_CLOUD_FAIL_COUNT, "0")
                settings.setString(com.estundnzettl.app.data.AutoBackupManager.KEY_CLOUD_LAST_ERROR, "")
                settings.setString(com.estundnzettl.app.data.AutoBackupManager.KEY_CLOUD_BACKOFF_UNTIL, "")
            }
            refreshGoogleState()
        }
    }

    // ─── Onboarding (Port von useOnboardingFlow.ts) ──────────

    private fun updateOnboarding(transform: (OnboardingUiState) -> OnboardingUiState) {
        _state.value = _state.value.copy(onboarding = transform(_state.value.onboarding))
    }

    /** "Nur Arbeitszeiten eintragen" — Simple-Modus-Schnellstart. */
    fun onboardingStartSimple() {
        updateOnboarding {
            it.copy(
                isRestoreFlow = false,
                restoreData = null,
                simpleMode = true,
                workDays = List(7) { 0 },
                localeId = "neutral",
                workCodePresetId = "allgemein",
                calcConfig = com.estundnzettl.core.calc.getBlankCalculationConfig(List(7) { 0 }),
                customCalc = false,
                step = 1,
            )
        }
    }

    fun onboardingStartNew() {
        updateOnboarding {
            it.copy(isRestoreFlow = false, restoreData = null, simpleMode = false, customCalc = false, step = 1)
        }
    }

    fun onboardingStartRestore() {
        updateOnboarding { it.copy(isRestoreFlow = true, step = 6) }
    }

    /** "Nur mal reinschnuppern (Demo)" — Port von handleDemoMode. */
    fun onboardingDemoMode() {
        viewModelScope.launch {
            try {
                val demoLocale = getLocale("at")
                val demoConfig = com.estundnzettl.core.calc
                    .getDefaultCalculationConfig(demoLocale, com.estundnzettl.core.calc.DEMO_USER.workDays)
                    .copy(vacationCarryoverDays = 3)

                db.replaceFullSnapshot(
                    com.estundnzettl.app.data.ImportSnapshot(
                        entries = com.estundnzettl.core.calc.generateDemoEntries(),
                        userData = com.estundnzettl.core.calc.DEMO_USER.toJson(),
                        workCodes = com.estundnzettl.core.calc.DEMO_WORK_CODES,
                    ),
                )
                runCatching {
                    settings.setLocaleId("at")
                    settings.setCalculationConfig(demoConfig)
                }

                loadSettings()
                reloadAfterImport()
                _state.value = _state.value.copy(
                    onboarding = OnboardingUiState(active = false),
                    view = "dashboard",
                )
                emit(UiMessage("onboarding.toast.demoLoaded"))
                maybeStartTour()
            } catch (_: Exception) {
                emit(UiMessage("settings.toast.demoLoadFailed"))
            }
        }
    }

    fun onboardingUpdate(transform: (OnboardingUiState) -> OnboardingUiState) = updateOnboarding(transform)

    fun onboardingNext() {
        val ob = _state.value.onboarding
        when {
            ob.step == 1 && ob.name.isBlank() -> {
                emit(UiMessage("onboarding.toast.nameRequired"))
                return
            }
            ob.step == 1 && ob.simpleMode -> {
                updateOnboarding { it.copy(step = 7) }
                return
            }
            ob.step == 2 && ob.localeId == null && !ob.customCalc -> {
                emit(UiMessage("onboarding.toast.localeRequired"))
                return
            }
        }

        var next = ob
        // Locale-Wahl belegt Default-WorkDays vor, wenn noch das
        // Initial-Modell (38,5h klassisch) aktiv ist.
        if (ob.step == 2 && ob.localeId != null) {
            if (ob.workDays == com.estundnzettl.core.model.WORK_MODELS[0].days) {
                next = next.copy(workDays = getLocale(ob.localeId).defaultWorkDays)
            }
        }
        // Beim Verlassen von WorkSchedule: weeklyTargetMinutes aktualisieren
        if (ob.step == 3) {
            val config = next.calcConfig
                ?: com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale(ob.localeId), next.workDays)
            next = next.copy(calcConfig = config.copy(weeklyTargetMinutes = next.workDays.sum()))
        }

        // Step 3 → 5 überspringt Calculation ohne Eigenen Plan
        val target = when {
            ob.step == 3 && !ob.customCalc -> 5
            else -> ob.step + 1
        }
        updateOnboarding { next.copy(step = target) }
    }

    fun onboardingBack() {
        val ob = _state.value.onboarding
        val target = when {
            ob.step == 6 && ob.isRestoreFlow -> 0
            ob.step == 7 && ob.simpleMode -> 1
            ob.step == 7 && ob.isRestoreFlow -> 6
            ob.step == 7 -> 6
            ob.step == 5 && !ob.customCalc -> 3
            else -> ob.step - 1
        }
        updateOnboarding { it.copy(step = target) }
    }

    /**
     * Backup-Inhalt analysieren und in den Flow übernehmen — gemeinsamer
     * Kern der Restore-Quellen (Toast-Keys wie useOnboardingRestore.ts).
     */
    private fun applyRestoreContent(content: String, invalidKey: String, loadedKey: String): Boolean {
        val analysis = backupRepo.analyze(content)
        if (!analysis.valid) {
            emit(UiMessage(invalidKey))
            return false
        }
        if (analysis.integrity == com.estundnzettl.core.backup.BackupIntegrity.MISMATCH) {
            emit(UiMessage("onboarding.toast.integrityMismatch"))
        }
        emit(UiMessage(loadedKey))
        updateOnboarding { it.copy(restoreData = analysis, step = 7) }
        return true
    }

    /** Restore-Datei geladen — Port von handleLocalFileRestore. */
    fun onboardingRestoreFromText(text: String) {
        applyRestoreContent(
            text,
            invalidKey = "onboarding.toast.backupInvalidFormat",
            loadedKey = "onboarding.toast.backupLoaded",
        )
    }

    /** Backup aus Google Drive laden — Port von handleGoogleDriveRestore. */
    fun onboardingGoogleDriveRestore() {
        viewModelScope.launch {
            updateOnboarding { it.copy(restoreLoading = true) }
            try {
                val token = googleDrive.authorize(com.estundnzettl.app.data.GoogleDriveManager.SCOPE_APPDATA)
                finishGoogleDriveRestore(token)
            } catch (e: com.estundnzettl.app.data.GoogleDriveManager.AuthRequiredException) {
                val intent = e.pendingIntent
                if (intent != null) {
                    // Consent nötig — restoreLoading bleibt aktiv, bis der
                    // Callback (onGoogleAuthResult) den Restore fortsetzt.
                    pendingGoogleScope = com.estundnzettl.app.data.GoogleDriveManager.SCOPE_APPDATA
                    pendingGoogleRestore = true
                    _googleAuthIntents.tryEmit(intent)
                } else {
                    updateOnboarding { it.copy(restoreLoading = false) }
                    emit(UiMessage("settings.backup.toast.gdriveUnavailable"))
                }
            } catch (e: Exception) {
                updateOnboarding { it.copy(restoreLoading = false) }
                emit(UiMessage("settings.backup.toast.gdriveFailed"))
            }
        }
    }

    /** Autorisiert: neuestes Drive-Backup herunterladen und übernehmen. */
    private suspend fun finishGoogleDriveRestore(token: String) {
        try {
            // Konto wie im Original nach dem Sign-in merken (Anzeige-Status;
            // die Sync-Flags kommen aus dem Backup selbst).
            val email = googleDrive.fetchAccountEmail(token)
            settings.setString(
                com.estundnzettl.app.data.GoogleDriveManager.KEY_ACCOUNT_EMAIL,
                email.ifEmpty { "Google" },
            )
            refreshGoogleState()

            val content = googleDrive.downloadLatestBackup(token)
            if (content == null) {
                emit(UiMessage("onboarding.toast.backupNotFound"))
                return
            }
            applyRestoreContent(
                content,
                invalidKey = "onboarding.toast.backupInvalid",
                loadedKey = "onboarding.toast.backupLoaded",
            )
        } catch (e: Exception) {
            emit(UiMessage("settings.backup.toast.gdriveFailed"))
        } finally {
            updateOnboarding { it.copy(restoreLoading = false) }
        }
    }

    /** Nach erfolgreichem NC-Login im Restore-Flow: Backup vom Server laden. */
    fun onboardingNextcloudRestore() {
        viewModelScope.launch {
            updateOnboarding { it.copy(restoreLoading = true) }
            try {
                val creds = nextcloudManager.getCredentials()
                if (creds == null) {
                    emit(UiMessage("onboarding.toast.ncLoginFailed"))
                    return@launch
                }
                val content = com.estundnzettl.app.data.NextcloudClient
                    .downloadBackup(creds.url, creds.user, creds.appPassword)
                if (content == null) {
                    emit(UiMessage("onboarding.toast.ncRestoreNotFound"))
                    return@launch
                }
                applyRestoreContent(
                    content,
                    invalidKey = "onboarding.toast.ncRestoreInvalid",
                    loadedKey = "onboarding.toast.ncRestoreLoaded",
                )
            } catch (e: Exception) {
                emit(UiMessage("onboarding.toast.ncLoginFailed"))
            } finally {
                updateOnboarding { it.copy(restoreLoading = false) }
            }
        }
    }

    /** Backup aus dem internen App-Ordner — Port von handleFolderRestore. */
    fun onboardingFolderRestore() {
        viewModelScope.launch {
            updateOnboarding { it.copy(restoreLoading = true) }
            try {
                val file = java.io.File(
                    getApplication<android.app.Application>().filesDir,
                    "${com.estundnzettl.app.data.NextcloudClient.BACKUP_FOLDER}/" +
                        com.estundnzettl.app.data.NextcloudClient.BACKUP_FILENAME,
                )
                if (!file.exists()) {
                    emit(UiMessage("onboarding.toast.backupNotFound"))
                    return@launch
                }
                applyRestoreContent(
                    file.readText(),
                    invalidKey = "onboarding.toast.backupInvalidShort",
                    loadedKey = "onboarding.toast.backupLoaded",
                )
            } catch (_: Exception) {
                emit(UiMessage("onboarding.toast.folderAccessError"))
            } finally {
                updateOnboarding { it.copy(restoreLoading = false) }
            }
        }
    }

    /** Abschluss — Port von finishSetup (ohne Cloud-Ziele, siehe Phase 5). */
    fun onboardingFinish() {
        val ob = _state.value.onboarding
        viewModelScope.launch {
            val backupUser = ob.restoreData?.settings as? kotlinx.serialization.json.JsonObject
            val backupName = (backupUser?.get("name") as? JsonPrimitive)
                ?.takeIf { it.isString }?.content?.trim() ?: ""

            // Backup ohne brauchbares Profil → in den Neu-Flow umleiten
            if (ob.isRestoreFlow && ob.restoreData != null && backupName.isEmpty() && ob.name.isBlank()) {
                emit(UiMessage("onboarding.toast.restoreProfileNeeded"))
                updateOnboarding { it.copy(isRestoreFlow = false, step = 1) }
                return@launch
            }

            // Restore-Flow: Backup ZUERST einspielen
            if (ob.restoreData != null) {
                val applied = backupRepo.apply(ob.restoreData, "ALL")
                if (!applied) {
                    emit(UiMessage("onboarding.toast.restoreError"))
                    return@launch
                }
            }

            // Profil persistieren — Feldbelegung wie finishSetup (inkl.
            // role/position und verschachteltem settings-Objekt).
            val userJson = if (ob.isRestoreFlow && backupUser != null) {
                kotlinx.serialization.json.buildJsonObject {
                    backupUser.forEach { (k, v) -> put(k, v) }
                    val backupWorkDays = backupUser["workDays"] as? kotlinx.serialization.json.JsonArray
                    if (backupWorkDays == null || backupWorkDays.size != 7) {
                        put("workDays", kotlinx.serialization.json.buildJsonArray {
                            ob.workDays.forEach { add(JsonPrimitive(it)) }
                        })
                    }
                    put("settings", kotlinx.serialization.json.buildJsonObject {
                        put("autoBackup", JsonPrimitive(ob.autoBackup))
                        put("theme", JsonPrimitive(ob.restoreData?.theme ?: "system"))
                    })
                }
            } else {
                kotlinx.serialization.json.buildJsonObject {
                    put("name", JsonPrimitive(ob.name))
                    put("company", JsonPrimitive(ob.company))
                    put("role", JsonPrimitive(ob.role))
                    put("position", JsonPrimitive(ob.role))
                    put("photo", ob.photo?.let { JsonPrimitive(it) } ?: kotlinx.serialization.json.JsonNull)
                    put("workDays", kotlinx.serialization.json.buildJsonArray {
                        ob.workDays.forEach { add(JsonPrimitive(it)) }
                    })
                    put("simpleMode", JsonPrimitive(ob.simpleMode))
                    ob.monthlyTargetMinutes?.let { put("monthlyTargetMinutes", JsonPrimitive(it)) }
                    put("settings", kotlinx.serialization.json.buildJsonObject {
                        put("autoBackup", JsonPrimitive(ob.autoBackup))
                        put("theme", JsonPrimitive("system"))
                    })
                }
            }

            runCatching {
                settings.setRaw(SettingsRepository.Keys.USER, userJson)
                settings.setBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED, ob.autoBackup)
                settings.setBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED, ob.localBackupEnabled)
            }

            if (!ob.isRestoreFlow && !ob.simpleMode) {
                val config = ob.calcConfig
                    ?: com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale(ob.localeId), ob.workDays)
                runCatching { settings.setCalculationConfig(config) }
            }
            if (!ob.isRestoreFlow && ob.localeId != null) {
                runCatching { settings.setLocaleId(ob.localeId) }
            }
            if (!ob.isRestoreFlow) {
                com.estundnzettl.core.model.WORK_CODE_PRESETS
                    .firstOrNull { it.id == ob.workCodePresetId }
                    ?.let { preset -> runCatching { workCodesRepo.replaceAll(preset.codes) } }
            }

            db.checkpoint()
            loadSettings()
            recompute()
            _state.value = _state.value.copy(
                onboarding = OnboardingUiState(active = false),
                view = "dashboard",
            )
            emit(UiMessage(
                if (ob.restoreData != null) "onboarding.toast.restoreSuccess"
                else "onboarding.toast.welcome"
            ))
            // Einmalige App-Tour nach dem Onboarding (Port von handleTourStart)
            maybeStartTour()
        }
    }

    /** Bereits übersetzten Text als Toast anzeigen (für UI-lokale Meldungen). */
    fun showRawMessage(
        text: String,
        tone: UiMessageTone = UiMessageTone.INFO,
        duration: UiMessageDuration = when (tone) {
            UiMessageTone.ERROR, UiMessageTone.WARNING -> UiMessageDuration.LONG
            else -> UiMessageDuration.SHORT
        },
    ) {
        _messages.tryEmit(UiMessage(text, raw = true, tone = tone, duration = duration))
    }

    private fun emit(message: UiMessage) {
        _messages.tryEmit(message)
    }
}
