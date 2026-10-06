package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.OvertimeAccountConfig
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import java.time.YearMonth
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OvertimeAccountTest {

    /** Mo–Fr je 8h, keine Feiertage/Halbtage — Zahlen bleiben nachrechenbar. */
    private val workDays = listOf(0, 480, 480, 480, 480, 480, 0)
    private val user = UserData(workDays = workDays)
    private val sep = YearMonth.of(2026, 9)
    private val oct = YearMonth.of(2026, 10)

    private fun config(
        startMonth: String? = "2026-09",
        opening: Int = 0,
        enabled: Boolean = true,
    ): CalculationConfig = getBlankCalculationConfig(workDays).copy(
        overtimeAccount = OvertimeAccountConfig(enabled, startMonth, opening),
    )

    private fun work(date: LocalDate, net: Int = 480) = Entry(
        id = EntryId.of(date.toEpochDay()), type = EntryType.WORK, date = date.toString(),
        start = "07:00", end = "15:30", pause = 30, code = WorkCodes.OFFICE, netDuration = net,
    )

    private fun timeComp(date: LocalDate, net: Int = 480) = Entry(
        id = EntryId.of(-date.toEpochDay()), type = EntryType.TIME_COMP, date = date.toString(),
        netDuration = net,
    )

    /** Jeder Arbeitstag des Monats (bis [through]) mit genau dem Tagessoll. */
    private fun exactMonth(month: YearMonth, through: LocalDate = month.atEndOfMonth()): List<Entry> =
        (1..month.lengthOfMonth()).map { month.atDay(it) }
            .filter { !it.isAfter(through) && it.dayOfWeek.value <= 5 }
            .map { work(it) }

    private fun account(
        entries: List<Entry>,
        month: YearMonth,
        today: LocalDate,
        cfg: CalculationConfig = config(),
        userData: UserData = user,
    ) = calculateOvertimeAccount(entries, userData, month, today, null, cfg)

    // ─── Aktivierung ─────────────────────────────────────────

    @Test
    fun `ohne aktives Konto gibt es keinen Kontostand`() {
        val entries = exactMonth(sep)
        val today = LocalDate.of(2026, 10, 15)
        assertNull(account(entries, sep, today, getBlankCalculationConfig(workDays)))
        assertNull(account(entries, sep, today, config(enabled = false)))
        assertNull(account(entries, sep, today, config(startMonth = null)))
        assertNull(account(entries, sep, today, userData = user.copy(simpleMode = true)))
    }

    @Test
    fun `Standard-Konfigurationen bringen kein Konto mit`() {
        val defaults = listOf(
            getDefaultCalculationConfig(austriaLocale, workDays),
            getBlankCalculationConfig(workDays),
        )
        defaults.forEach { cfg ->
            assertNull(cfg.overtimeAccount)
            assertNull(account(exactMonth(sep), sep, LocalDate.of(2026, 10, 15), cfg))
        }
    }

    @Test
    fun `Monate vor dem Startmonat haben kein Konto`() {
        assertNull(account(emptyList(), YearMonth.of(2026, 8), LocalDate.of(2026, 10, 15)))
    }

    // ─── Übertrag & Verbrauch ────────────────────────────────

    @Test
    fun `Anfangsstand und Monatssaldo werden in den Folgemonat uebertragen`() {
        val overtimeDay = LocalDate.of(2026, 9, 15)
        val entries = exactMonth(sep).map { if (it.date == overtimeDay.toString()) work(overtimeDay, 600) else it }
        val today = LocalDate.of(2026, 11, 2)
        val cfg = config(opening = 300)

        val september = account(entries, sep, today, cfg)!!
        assertEquals(300, september.openingMinutes)
        assertEquals(120, september.balanceMinutes)
        assertEquals(0, september.timeCompMinutes)
        assertEquals(420, september.closingMinutes)
        assertTrue(september.isComplete)

        val october = account(entries, oct, today, cfg)!!
        assertEquals(420, october.openingMinutes)
    }

    @Test
    fun `Zeitausgleich baut das Konto ab ohne den Monatssaldo zu aendern`() {
        val zaDay = LocalDate.of(2026, 10, 9)
        val entries = exactMonth(oct).filter { it.date != zaDay.toString() } + timeComp(zaDay)
        val result = account(entries, oct, LocalDate.of(2026, 11, 3), config("2026-10", opening = 600))!!

        assertEquals(600, result.openingMinutes)
        assertEquals(0, result.balanceMinutes)
        assertEquals(480, result.timeCompMinutes)
        assertEquals(120, result.closingMinutes)
    }

    @Test
    fun `Minusstunden werden ebenfalls uebertragen`() {
        val shortDay = LocalDate.of(2026, 9, 1)
        val entries = exactMonth(sep).map { if (it.date == shortDay.toString()) work(shortDay, 240) else it }
        val result = account(entries, oct, LocalDate.of(2026, 10, 1), config(opening = 60))!!
        assertEquals(-180, result.openingMinutes)
    }

    // ─── Laufender Monat ─────────────────────────────────────

    @Test
    fun `laufender Monat zaehlt heute erst nach dem ersten Eintrag`() {
        val today = LocalDate.of(2026, 10, 7) // Mittwoch
        val untilYesterday = exactMonth(oct, through = today.minusDays(1))

        val morning = account(untilYesterday, oct, today, config("2026-10"))!!
        assertEquals(LocalDate.of(2026, 10, 6), morning.evaluatedThrough)
        assertEquals(0, morning.balanceMinutes)
        assertFalse(morning.isComplete)

        val evening = account(untilYesterday + work(today, 540), oct, today, config("2026-10"))!!
        assertEquals(today, evening.evaluatedThrough)
        assertEquals(60, evening.balanceMinutes)
    }

    @Test
    fun `geplanter Zeitausgleich in der Zukunft zaehlt noch nicht`() {
        val today = LocalDate.of(2026, 10, 7)
        val entries = exactMonth(oct, through = today) + timeComp(LocalDate.of(2026, 10, 16))
        val result = account(entries, oct, today, config("2026-10", opening = 480))!!
        assertEquals(0, result.timeCompMinutes)
        assertEquals(480, result.closingMinutes)
    }

    @Test
    fun `nur noch Tage ohne Soll bis Monatsende schliessen den Monat ab`() {
        val friday = LocalDate.of(2026, 10, 30) // 31.10. ist ein Samstag
        val result = account(exactMonth(oct, through = friday), oct, friday, config("2026-10"))!!
        assertTrue(result.isComplete)
        assertEquals(0, result.balanceMinutes)
    }

    @Test
    fun `zukuenftiger Monat zeigt nur den Uebertrag`() {
        val today = LocalDate.of(2026, 10, 7)
        val entries = exactMonth(oct, through = today.minusDays(1))
        val result = account(entries, YearMonth.of(2026, 12), today, config("2026-10", opening = 90))!!
        assertEquals(90, result.openingMinutes)
        assertEquals(90, result.closingMinutes)
        assertEquals(0, result.balanceMinutes)
        assertFalse(result.isComplete)
    }

    // ─── Konsistenz mit Dashboard/Bericht ────────────────────

    @Test
    fun `abgeschlossener Monat bucht exakt den Dashboard-Saldo`() {
        val atDays = listOf(0, 510, 510, 510, 510, 270, 0)
        val atUser = UserData(workDays = atDays)
        val dec = YearMonth.of(2025, 12)
        val cfg = getDefaultCalculationConfig(austriaLocale, atDays).copy(
            overtimeAccount = OvertimeAccountConfig(true, "2025-12", 0),
        )
        val entries = (1..31).map { dec.atDay(it) }
            .filter { it.dayOfWeek.value <= 4 }
            .map { work(it, 540) } +
            timeComp(LocalDate.of(2025, 12, 19), 270)
        val today = LocalDate.of(2026, 1, 10)

        val dashboard = deriveAppData(entries, atUser, 2025, 12, entries, today, austriaLocale, cfg)
        val result = calculateOvertimeAccount(entries, atUser, dec, today, austriaLocale, cfg)!!

        assertEquals(dashboard.stats.totalSaldo, result.balanceMinutes)
        assertEquals(dashboard.stats.timeComp, result.timeCompMinutes)
        assertEquals(result, dashboard.overtimeAccount)
    }

    // ─── Eingabe des Anfangsstands ───────────────────────────

    @Test
    fun `Anfangsstand-Eingabe akzeptiert Vorzeichen, Doppelpunkt und Dezimalstunden`() {
        assertEquals(750, parseSignedDurationInput("12:30"))
        assertEquals(-255, parseSignedDurationInput("-4:15"))
        assertEquals(-255, parseSignedDurationInput("−4:15"))
        assertEquals(480, parseSignedDurationInput("+8"))
        assertEquals(450, parseSignedDurationInput("7,5"))
        assertEquals(-90, parseSignedDurationInput(" -1.5 "))
        assertEquals(0, parseSignedDurationInput("0"))
        assertNull(parseSignedDurationInput(""))
        assertNull(parseSignedDurationInput("12:75"))
        assertNull(parseSignedDurationInput("abc"))
        assertNull(parseSignedDurationInput("99999"))
    }

    @Test
    fun `Anfangsstand-Format ist umkehrbar`() {
        listOf(0, 45, 750, -255, -6000).forEach { minutes ->
            assertEquals(minutes, parseSignedDurationInput(formatSignedDurationInput(minutes)))
        }
        assertEquals("-4:15", formatSignedDurationInput(-255))
    }

    // ─── PDF-Archiv-Hash ─────────────────────────────────────

    @Test
    fun `Archiv-Hash reagiert auf Uebertrag und Monatsabschluss`() {
        val entries = exactMonth(sep)
        val base = OvertimeAccountMonth(sep, 0, 0, 0, 0, sep.atEndOfMonth())
        fun hash(account: OvertimeAccountMonth?) = hashMonthContent(
            entries, user, 2026, 9, null, config(), LocalDate.of(2026, 10, 1),
            overtimeAccount = account,
        )
        assertEquals(hash(null), hashMonthContent(entries, user, 2026, 9, null, config(), LocalDate.of(2026, 10, 1)))
        assertNotEquals(hash(base), hash(base.copy(openingMinutes = 60)))
        assertNotEquals(hash(base), hash(base.copy(evaluatedThrough = LocalDate.of(2026, 9, 20))))
    }
}
