package com.estundnzettl.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.estundnzettl.app.data.EntriesRepository
import com.estundnzettl.app.data.EntryIdGenerator
import com.estundnzettl.app.data.SettingsRepository
import com.estundnzettl.app.data.WorkCodesRepository
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.core.calc.AppData
import com.estundnzettl.core.calc.EntryFormInput
import com.estundnzettl.core.calc.SaveEntryResult
import com.estundnzettl.core.calc.WorkCodes
import com.estundnzettl.core.calc.deriveAppData
import com.estundnzettl.core.calc.getDefaultTimesForDate
import com.estundnzettl.core.calc.prepareEntryToSave
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
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import java.time.ZoneId
import java.util.Locale as JavaLocale

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
data class UiMessage(
    val key: String,
    val args: List<Pair<String, Any?>> = emptyList(),
    /** true = `key` ist bereits der fertige Anzeigetext. */
    val raw: Boolean = false,
)

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
)

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val db = (application as EStundnzettlApp).database
    private val entriesRepo = EntriesRepository(db)
    private val workCodesRepo = WorkCodesRepository(db)
    private val attachmentsRepo = com.estundnzettl.app.data.AttachmentsRepository(db)
    val settings = SettingsRepository(db.settingsDao())

    private val timerJson = Json { ignoreUnknownKeys = true }

    private val _state = MutableStateFlow(MainUiState())
    val state: StateFlow<MainUiState> = _state.asStateFlow()

    private val _messages = MutableSharedFlow<UiMessage>(extraBufferCapacity = 8)
    val messages: SharedFlow<UiMessage> = _messages.asSharedFlow()

    private var allEntries: List<Entry> = emptyList()

    init {
        viewModelScope.launch {
            loadSettings()
            restoreTimer()
            // Onboarding zeigen, wenn noch kein Profil existiert (leerer
            // Name = Onboarding-Check der Web-App).
            if (_state.value.userData?.name.isNullOrBlank()) {
                _state.value = _state.value.copy(onboarding = OnboardingUiState(active = true))
            }
            entriesRepo.observeAll().collect { entries ->
                allEntries = entries
                recompute()
                _state.value = _state.value.copy(loading = false)
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
                entriesRepo.delete(id)
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
                entriesRepo.deleteAll()
                val resetUser = UserData()
                settings.setUserData(resetUser)
                _state.value = _state.value.copy(userData = resetUser)
                emit(UiMessage("toasts.entry.deleted"))
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
        loadSettings()
        recompute()
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
            // Backup-Ziele (Cloud) folgen in Phase 5 → Step 6 im Neu-Flow überspringen
            ob.step == 5 -> 7
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
            ob.step == 7 -> 5
            ob.step == 5 && !ob.customCalc -> 3
            else -> ob.step - 1
        }
        updateOnboarding { it.copy(step = target) }
    }

    /** Restore-Datei geladen: analysieren und in den Flow übernehmen. */
    fun onboardingRestoreFromText(text: String) {
        val analysis = backupRepo.analyze(text)
        if (!analysis.valid) {
            emit(UiMessage("settings.toast.invalidBackup"))
            return
        }
        if (analysis.integrity == com.estundnzettl.core.backup.BackupIntegrity.MISMATCH) {
            emit(UiMessage("settings.toast.integrityMismatch"))
        }
        updateOnboarding { it.copy(restoreData = analysis, step = 7) }
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
                        put("autoBackup", JsonPrimitive(false))
                        put("theme", JsonPrimitive(ob.restoreData?.theme ?: "system"))
                    })
                }
            } else {
                kotlinx.serialization.json.buildJsonObject {
                    put("name", JsonPrimitive(ob.name))
                    put("company", JsonPrimitive(ob.company))
                    put("role", JsonPrimitive(ob.role))
                    put("position", JsonPrimitive(ob.role))
                    put("photo", kotlinx.serialization.json.JsonNull)
                    put("workDays", kotlinx.serialization.json.buildJsonArray {
                        ob.workDays.forEach { add(JsonPrimitive(it)) }
                    })
                    put("simpleMode", JsonPrimitive(ob.simpleMode))
                    put("settings", kotlinx.serialization.json.buildJsonObject {
                        put("autoBackup", JsonPrimitive(false))
                        put("theme", JsonPrimitive("system"))
                    })
                }
            }

            runCatching {
                settings.setRaw(SettingsRepository.Keys.USER, userJson)
                settings.setBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED, false)
                settings.setBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED, false)
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
        }
    }

    /** Bereits übersetzten Text als Toast anzeigen (für UI-lokale Meldungen). */
    fun showRawMessage(text: String) {
        _messages.tryEmit(UiMessage(text, raw = true))
    }

    private fun emit(message: UiMessage) {
        _messages.tryEmit(message)
    }
}
