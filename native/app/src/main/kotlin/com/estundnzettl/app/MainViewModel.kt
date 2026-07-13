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

/** One-shot Toast-Nachricht (i18n-Key + Argumente). */
data class UiMessage(val key: String, val args: List<Pair<String, Any?>> = emptyList())

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
)

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val db = (application as EStundnzettlApp).database
    private val entriesRepo = EntriesRepository(db)
    private val workCodesRepo = WorkCodesRepository(db)
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
        _state.value = _state.value.copy(
            userData = userData,
            locale = locale,
            calculationConfig = config,
            theme = theme,
            language = language,
            workCodes = codes,
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

    private fun emit(message: UiMessage) {
        _messages.tryEmit(message)
    }
}
