/**
 * ReportPdfDocument
 *
 * Vector-PDF-Variante des Stundenzettels, gerendert mit
 * @react-pdf/renderer. Ersetzt die fruehere DOM-basierte Render-
 * Komponente (`ReportDocument`) als Single-Source-of-Truth fuer
 * Vorschau (`PrintReport`) und automatisches Archiv (`pdfArchive`).
 *
 * Vorteile gegenueber dem fruehheren html2canvas+jspdf-Ansatz:
 *  - durchsuchbarer/kopierbarer Vektortext statt Raster
 *  - kein Offscreen-DOM-Render-Hack, keine Memory-Spikes auf Mobile
 *  - identisches Aussehen in Preview und Export (gleiche Komponente)
 *  - native Page-Break-Logik mit wiederholtem Tabellenkopf (`fixed`)
 *
 * i18n: nutzt den i18n-Singleton direkt (`i18n.t`) statt
 * `useTranslation()`. Damit funktioniert die Komponente sowohl
 * im React-Tree als auch bei headless-Aufruf via `pdf().toBlob()`,
 * ohne dass ein I18nextProvider in den isolierten react-pdf-
 * Render-Baum injiziert werden muss.
 */

import React, { useMemo } from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import RobotoRegular from "@fontsource/roboto/files/roboto-latin-400-normal.woff?url";
import RobotoBold from "@fontsource/roboto/files/roboto-latin-700-normal.woff?url";
import RobotoLatinExtRegular from "@fontsource/roboto/files/roboto-latin-ext-400-normal.woff?url";
import RobotoLatinExtBold from "@fontsource/roboto/files/roboto-latin-ext-700-normal.woff?url";
import i18n from "../i18n";

// Roboto registrieren — Latin + Latin-Extended decken West-, Mittel-
// und Osteuropa ab (deutsche Umlaute, polnisch, tschechisch, ungarisch,
// rumaenisch, vietnamesisch). Die eingebauten PDF-Type-1-Fonts
// (Helvetica, Times) unterstuetzen nur WinAnsi und wuerden bei
// erweiterten Latin-Glyphen leere Kaesten produzieren — daher der
// Wechsel auf Roboto.
//
// Bewusst NICHT registriert: Cyrillic/Greek/CJK. Wer derartige Inhalte
// in Projektnamen/Notizen pflegt, muss das Font-Setup erweitern.
Font.register({
  family: "Roboto",
  fonts: [
    { src: RobotoRegular, fontWeight: 400 },
    { src: RobotoLatinExtRegular, fontWeight: 400 },
    { src: RobotoBold, fontWeight: 700 },
    { src: RobotoLatinExtBold, fontWeight: 700 },
  ],
});
import { formatTime, formatSignedTime } from "../utils";
import { getIntlLocale } from "../utils/formatLocale";
import { buildDayBalanceMetaMap } from "../utils/timeCalculations";
import { resolveEffectiveRules, getEffectivePdfDisplay } from "../utils/calculationConfig";
import { WORK_CODE } from "../hooks/constants";

import type { Entry, UserData, WorkCode, Attachment, CalculationConfig, PdfDisplayConfig } from "../types";
import type { Locale } from "../locales/types";

// ─── Stats-Shape (1:1 wie zuvor in ReportDocument) ─────────────────
interface OvertimeSplit {
  mehrarbeit: number;
  ueberstunden: number;
}
interface ReportStats {
  work: number;
  drive: number;
  vacation: number;
  sick: number;
  holiday: number;
  timeComp: number;
  totalIst: number;
  totalTarget: number;
  totalSaldo: number;
  normalstunden: number;
  overtimeSplit: OvertimeSplit;
}

interface Props {
  entries?: Entry[];
  userData?: UserData & { company?: string };
  monthDate: Date;
  filterMode?: "month" | number;
  stats?: ReportStats;
  workCodes?: WorkCode[];
  attachments?: Attachment[];
  customNote?: string;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
  /** Alle Einträge des Jahres — für die Urlaubstage-Bilanz im Footer. */
  allEntries?: Entry[];
}

// ─── Farbpalette (1:1 aus ReportDocument PRINT_STYLES) ─────────────
const C = {
  textBlack: "#000000",
  textDark: "#27272a",
  textMedium: "#52525b",
  textLight: "#a1a1aa",
  bgWhite: "#ffffff",
  bgGray: "#fafafa",
  bgZebra: "#f4f4f5",
  bgBlueLight: "#eff6ff",
  textBlue: "#1e40af",
  textRed: "#b91c1c",
  textGreen: "#15803d",
  textPurple: "#7e22ce",
  borderDark: "#27272a",
  borderLight: "#e4e4e7",
};

// A4 Portrait nutzbar ~ 559pt nach 18pt Padding je Seite.
// Spaltenbreiten in Punkt (orientiert an den ehemaligen rem-Werten).
const COL = {
  date: 60,
  time: 80,
  // project: flex
  code: 65,
  hours: 38,
  balance: 42,
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 22,
    paddingLeft: 18,
    paddingRight: 18,
    fontSize: 9,
    fontFamily: "Roboto",
    color: C.textBlack,
    backgroundColor: C.bgWhite,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: C.borderDark,
    paddingBottom: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: "Roboto", fontWeight: 700,
    color: C.textDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  company: {
    fontSize: 9,
    fontFamily: "Roboto", fontWeight: 700,
    color: C.textMedium,
    marginTop: 2,
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
  headerMeta: { textAlign: "right", marginRight: 8 },
  headerName: { fontSize: 9.5, fontFamily: "Roboto", fontWeight: 700 },
  headerMonth: { fontSize: 8.5, color: C.textMedium, marginTop: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: C.borderLight,
  },

  // Tabellenkopf (fixed -> wiederholt sich auf jeder Seite)
  thead: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: C.borderDark,
    paddingTop: 4,
    paddingBottom: 4,
  },
  th: {
    fontSize: 7.5,
    fontFamily: "Roboto", fontWeight: 700,
    color: C.textMedium,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Spaltenbreiten
  colDate: { width: COL.date },
  colTime: { width: COL.time },
  colProject: { flex: 1, paddingRight: 6 },
  colCode: { width: COL.code },
  colHours: { width: COL.hours, textAlign: "right" },
  colBalance: { width: COL.balance, textAlign: "right" },

  // Zeile
  tr: {
    flexDirection: "row",
    paddingTop: 4,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
  },
  trZebra: { backgroundColor: C.bgZebra },
  trHoliday: { backgroundColor: C.bgBlueLight },
  trNoBorder: { borderBottomWidth: 0 },

  cellDate: { flexDirection: "row" },
  weekday: { width: 18, fontFamily: "Roboto", fontWeight: 700 },
  dateStr: { color: C.textMedium },

  // Zeit-Zelle (zweizeilig: Spanne + Pause)
  timeRange: { fontFamily: "Roboto", fontWeight: 700, color: C.textDark },
  pause: {
    fontSize: 6.5,
    color: C.textMedium,
    textTransform: "uppercase",
    marginTop: 1,
  },
  pauseNone: {
    fontSize: 6.5,
    color: C.textLight,
    textTransform: "uppercase",
    marginTop: 1,
  },

  // Projekt
  project: { fontFamily: "Roboto", fontWeight: 700, color: C.textMedium, fontSize: 9 },
  projectHoliday: { fontFamily: "Roboto", fontWeight: 700, color: C.textBlue, fontSize: 9 },
  projectTimeComp: { fontFamily: "Roboto", fontWeight: 700, color: C.textPurple, fontSize: 9 },
  attachmentLine: {
    fontSize: 6.5,
    color: C.textLight,
    marginTop: 2,
  },
  attachmentLabel: { fontFamily: "Roboto", fontWeight: 700, color: C.textLight },

  // Code
  codeText: { fontSize: 7.5, color: C.textMedium },

  // Std
  hours: { fontFamily: "Roboto", fontWeight: 700, color: C.textDark },
  hoursDrive: { color: C.textLight, fontFamily: "Roboto" },
  hoursHoliday: { color: C.textBlue, fontFamily: "Roboto", fontWeight: 700 },
  hoursTimeComp: { color: C.textPurple, fontFamily: "Roboto", fontWeight: 700 },
  balancePos: { color: C.textGreen, fontFamily: "Roboto", fontWeight: 700, fontSize: 7.5 },
  balanceNeg: { color: C.textRed, fontFamily: "Roboto", fontWeight: 700, fontSize: 7.5 },
  emptyDash: { color: C.textLight },

  // Summary
  summaryBox: {
    marginTop: 8,
    backgroundColor: C.bgGray,
    padding: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.borderLight,
  },
  summaryTitle: {
    fontSize: 7.5,
    fontFamily: "Roboto", fontWeight: 700,
    color: C.textMedium,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    paddingBottom: 2,
    marginBottom: 4,
  },
  summaryGrid: { flexDirection: "row" },
  summaryCol: { flex: 1, paddingRight: 12 },
  summaryColRight: { flex: 1 },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    marginBottom: 1,
  },
  sumLabel: { color: C.textDark },
  sumValue: { fontFamily: "Roboto", fontWeight: 700, color: C.textDark },
  sumRowDashed: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    marginBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomStyle: "dashed",
    borderBottomColor: C.borderLight,
    paddingBottom: 2,
  },
  sumRowBold: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    marginTop: 3,
    fontFamily: "Roboto", fontWeight: 700,
  },
  overtimeBlock: {
    marginTop: 4,
    paddingTop: 2,
    borderTopWidth: 0.5,
    borderTopStyle: "dashed",
    borderTopColor: C.borderLight,
  },
  driveFooter: {
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    marginTop: 3,
    paddingTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: C.textLight,
    fontStyle: "italic",
  },
  vacationBalance: {
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    marginTop: 4,
    paddingTop: 3,
  },
  vacationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: C.textMedium,
    marginBottom: 1.5,
  },
  vacationRemaining: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    fontFamily: "Roboto", fontWeight: 700,
  },

  // Notizen
  noteBlock: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopStyle: "dashed",
    borderTopColor: C.borderLight,
    paddingTop: 8,
  },
  noteTitle: {
    fontSize: 8,
    fontFamily: "Roboto", fontWeight: 700,
    color: C.textMedium,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  noteText: { fontSize: 8.5, color: C.textDark, lineHeight: 1.4 },
});

// ─── Helpers ────────────────────────────────────────────────────────

const t = (key: string, opts?: Record<string, unknown>): string =>
  i18n.t(key, opts) as string;

/** Wochentags-Kuerzel und kurzes Datum aus YYYY-MM-DD. */
function formatDateParts(dateStr: string): { wd: string; ds: string } {
  const d = new Date(dateStr);
  const wd = d
    .toLocaleDateString(getIntlLocale(), { weekday: "short" })
    .slice(0, 2);
  const ds = d.toLocaleDateString(getIntlLocale(), {
    day: "2-digit",
    month: "2-digit",
  });
  return { wd, ds };
}

// ─── Sub-Komponenten ────────────────────────────────────────────────

interface HeaderProps {
  userData: UserData & { company?: string };
  monthDate: Date;
  filterMode: "month" | number;
}
const Header: React.FC<HeaderProps> = ({ userData, monthDate, filterMode }) => {
  const monthLabel = monthDate.toLocaleDateString(getIntlLocale(), {
    month: "long",
    year: "numeric",
  });
  const photo = userData?.photo || null;
  return (
    <View style={styles.headerRow} fixed>
      <View>
        <Text style={styles.title}>{t("reports.title")}</Text>
        {userData?.company ? (
          <Text style={styles.company}>{userData.company}</Text>
        ) : null}
      </View>
      <View style={styles.headerRight}>
        <View style={styles.headerMeta}>
          <Text style={styles.headerName}>{userData?.name || ""}</Text>
          <Text style={styles.headerMonth}>
            {monthLabel}
            {filterMode !== "month"
              ? ` (${t("dashboard.calendarWeekShort", { week: filterMode })})`
              : ""}
          </Text>
        </View>
        {photo ? <Image src={photo} style={styles.avatar} /> : null}
      </View>
    </View>
  );
};

interface TableHeadProps {
  showWorkCodeColumn: boolean;
  showBalance: boolean;
}
const TableHead: React.FC<TableHeadProps> = ({ showWorkCodeColumn, showBalance }) => (
  <View style={styles.thead} fixed>
    <Text style={[styles.th, styles.colDate]}>{t("reports.columns.date")}</Text>
    <Text style={[styles.th, styles.colTime]}>{t("reports.columns.time")}</Text>
    <Text style={[styles.th, styles.colProject]}>{t("reports.columns.project")}</Text>
    {showWorkCodeColumn ? (
      <Text style={[styles.th, styles.colCode]}>{t("reports.columns.code")}</Text>
    ) : null}
    <Text style={[styles.th, styles.colHours]}>{t("reports.columns.hours")}</Text>
    {showBalance ? (
      <Text style={[styles.th, styles.colBalance]}>{t("reports.columns.balance")}</Text>
    ) : null}
  </View>
);

interface RowProps {
  e: Entry;
  prev?: Entry;
  next?: Entry;
  workCodeLabelMap: Map<number, string>;
  attachmentsForEntry: Attachment[];
  meta: { dayIndex?: number; isEvenDay?: boolean; showBalance?: boolean; balance?: number };
  showWorkCodeColumn: boolean;
  showBalance: boolean;
  showAttachmentsList: boolean;
}
const Row: React.FC<RowProps> = ({
  e,
  prev,
  next,
  workCodeLabelMap,
  attachmentsForEntry,
  meta,
  showWorkCodeColumn,
  showBalance,
  showAttachmentsList,
}) => {
  const sameDay = prev && prev.date === e.date;
  const lastOfDay = !next || next.date !== e.date;

  const rowStyle: Style[] = [styles.tr];
  if (e.type === "public_holiday") rowStyle.push(styles.trHoliday);
  else if (meta?.isEvenDay) rowStyle.push(styles.trZebra);
  if (!lastOfDay) rowStyle.push(styles.trNoBorder);

  // ── Zeit-Zelle ──────────────────────────────────────────────
  let timeCell: React.ReactNode;
  if (e.start && e.end) {
    if (e.type === "work") {
      const pauseText =
        (e.pause ?? 0) > 0
          ? t("reports.pauseMin", { minutes: e.pause })
          : t("reports.noPauseUpper");
      const pauseStyle = (e.pause ?? 0) > 0 ? styles.pause : styles.pauseNone;
      timeCell = (
        <View>
          <Text style={styles.timeRange}>
            {e.start} – {e.end}
          </Text>
          <Text style={pauseStyle}>{pauseText}</Text>
        </View>
      );
    } else {
      timeCell = <Text style={styles.timeRange}>{e.start} – {e.end}</Text>;
    }
  } else if (e.type === "public_holiday") {
    timeCell = <Text style={styles.timeRange}>{t("entryTypes.holiday")}</Text>;
  } else {
    timeCell = <Text style={styles.emptyDash}>—</Text>;
  }

  // ── Projekt ─────────────────────────────────────────────────
  let projectStyle = styles.project;
  let projectText = e.project || "";
  if (e.type === "public_holiday") {
    projectStyle = styles.projectHoliday;
    projectText = e.project || t("reports.publicHoliday");
  } else if (e.type === "time_comp") {
    projectStyle = styles.projectTimeComp;
    projectText = t("entryTypes.timeComp");
  } else if (e.type === "vacation") {
    projectText = t("entryTypes.vacation");
  } else if (e.type === "sick") {
    projectText = t("entryTypes.sick");
  }

  // ── Stunden ─────────────────────────────────────────────────
  const hoursStyle: Style[] = [styles.colHours, styles.hours];
  let hoursText = formatTime(e.netDuration ?? 0);
  if (e.type === "work" && e.code === WORK_CODE.DRIVE) {
    hoursText = "—";
    hoursStyle.push(styles.hoursDrive);
  } else if (e.type === "public_holiday") {
    hoursStyle.push(styles.hoursHoliday);
  } else if (e.type === "time_comp") {
    hoursText = "—";
    hoursStyle.push(styles.hoursTimeComp);
  }

  const codeText = e.code != null ? workCodeLabelMap.get(e.code) || "" : "";
  const { wd, ds } = formatDateParts(e.date);

  return (
    <View style={rowStyle} wrap={false}>
      <View style={[styles.colDate, styles.cellDate]}>
        {!sameDay ? (
          <>
            <Text style={styles.weekday}>{wd}</Text>
            <Text style={styles.dateStr}>{ds}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.colTime}>{timeCell}</View>
      <View style={styles.colProject}>
        <Text style={projectStyle}>{projectText}</Text>
        {showAttachmentsList && attachmentsForEntry.length > 0 ? (
          <Text style={styles.attachmentLine}>
            <Text style={styles.attachmentLabel}>
              {t("reports.documentsLabel")}
            </Text>{" "}
            {attachmentsForEntry.map((a) => a.label).join(", ")}
          </Text>
        ) : null}
      </View>
      {showWorkCodeColumn ? (
        <Text style={[styles.colCode, styles.codeText]}>{codeText}</Text>
      ) : null}
      <Text style={hoursStyle}>{hoursText}</Text>
      {showBalance ? (
        <View style={styles.colBalance}>
          {lastOfDay && meta?.showBalance ? (
            <Text style={(meta.balance ?? 0) >= 0 ? styles.balancePos : styles.balanceNeg}>
              {formatSignedTime(meta.balance ?? 0)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

interface SummaryProps {
  display: PdfDisplayConfig;
  stats: ReportStats;
  userData?: UserData;
  showOvertimeColumns: boolean;
  vacationBalance: VacationBalance | null;
  monthDate: Date;
}
interface VacationBalance {
  allowance: number;
  carryover: number;
  usedDays: number;
  remaining: number;
}
const Summary: React.FC<SummaryProps> = ({
  display,
  stats,
  userData,
  showOvertimeColumns,
  vacationBalance,
  monthDate,
}) => {
  const showSollSection = !userData?.simpleMode && display.showTargetTime;
  const showSaldoSection = !userData?.simpleMode && display.showBalance;
  const overtimeVisible =
    display.showOvertimeSplit &&
    showOvertimeColumns &&
    (stats.overtimeSplit.mehrarbeit > 0 || stats.overtimeSplit.ueberstunden > 0);

  return (
    <View style={styles.summaryBox} wrap={false}>
      <Text style={styles.summaryTitle}>{t("reports.summary.title")}</Text>
      <View style={styles.summaryGrid}>
        {/* Linke Spalte: Kategorien */}
        <View style={styles.summaryCol}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>{t("reports.summary.work")}</Text>
            <Text style={styles.sumValue}>{formatTime(stats.work)}</Text>
          </View>
          {stats.holiday > 0 ? (
            <View style={styles.sumRow}>
              <Text style={{ color: C.textBlue }}>
                {t("reports.summary.holidays")}
              </Text>
              <Text style={{ fontFamily: "Roboto", fontWeight: 700, color: C.textBlue }}>
                {formatTime(stats.holiday)}
              </Text>
            </View>
          ) : null}
          {stats.vacation > 0 ? (
            <View style={styles.sumRow}>
              <Text style={{ color: C.textBlue }}>
                {t("reports.summary.vacation")}
              </Text>
              <Text style={{ fontFamily: "Roboto", fontWeight: 700, color: C.textBlue }}>
                {formatTime(stats.vacation)}
              </Text>
            </View>
          ) : null}
          {stats.timeComp > 0 ? (
            <View style={styles.sumRow}>
              <Text style={{ color: C.textPurple }}>
                {t("reports.summary.timeComp")}
              </Text>
              <Text style={{ fontFamily: "Roboto", fontWeight: 700, color: C.textPurple }}>
                {formatTime(stats.timeComp)}
              </Text>
            </View>
          ) : null}
          {stats.sick > 0 ? (
            <View style={styles.sumRow}>
              <Text style={{ color: C.textRed }}>
                {t("reports.summary.sickness")}
              </Text>
              <Text style={{ fontFamily: "Roboto", fontWeight: 700, color: C.textRed }}>
                {formatTime(stats.sick)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Rechte Spalte: Gesamtwerte */}
        <View style={styles.summaryColRight}>
          <View style={styles.sumRowDashed}>
            <Text style={styles.sumLabel}>{t("reports.summary.totalActual")}</Text>
            <Text style={styles.sumValue}>{formatTime(stats.totalIst)}</Text>
          </View>
          {showSollSection ? (
            <View style={styles.sumRow}>
              <Text style={{ color: C.textMedium }}>
                {t("reports.summary.targetTime")}
              </Text>
              <Text style={{ color: C.textMedium }}>
                {formatTime(stats.totalTarget)}
              </Text>
            </View>
          ) : null}
          {showSaldoSection ? (
            <View style={styles.sumRowBold}>
              <Text>{t("reports.summary.balance")}</Text>
              <Text
                style={{
                  color: stats.totalSaldo >= 0 ? C.textGreen : C.textRed,
                }}
              >
                {formatSignedTime(stats.totalSaldo)}
              </Text>
            </View>
          ) : null}
          {overtimeVisible ? (
            <View style={styles.overtimeBlock}>
              {stats.overtimeSplit.mehrarbeit > 0 ? (
                <View style={styles.sumRow}>
                  <Text style={{ color: C.textBlue }}>
                    {t("reports.summary.extraHours")}
                  </Text>
                  <Text
                    style={{ fontFamily: "Roboto", fontWeight: 700, color: C.textBlue }}
                  >
                    {formatTime(stats.overtimeSplit.mehrarbeit)}
                  </Text>
                </View>
              ) : null}
              {stats.overtimeSplit.ueberstunden > 0 ? (
                <View style={styles.sumRow}>
                  <Text style={{ color: C.textPurple }}>
                    {t("reports.summary.overtime")}
                  </Text>
                  <Text
                    style={{ fontFamily: "Roboto", fontWeight: 700, color: C.textPurple }}
                  >
                    {formatTime(stats.overtimeSplit.ueberstunden)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {stats.drive > 0 ? (
        <View style={styles.driveFooter}>
          <Text>{t("reports.summary.driveUnpaid")}</Text>
          <Text>{formatTime(stats.drive)}</Text>
        </View>
      ) : null}

      {display.showVacationBalance && vacationBalance ? (
        <View style={styles.vacationBalance}>
          <View style={styles.vacationRow}>
            <Text>{t("reports.vacationBalance.allowance")}</Text>
            <Text style={{ fontFamily: "Roboto", fontWeight: 700 }}>
              {vacationBalance.allowance} {t("reports.vacationBalance.days")}
            </Text>
          </View>
          {vacationBalance.carryover !== 0 ? (
            <View style={styles.vacationRow}>
              <Text>
                {vacationBalance.carryover > 0
                  ? t("reports.vacationBalance.carryoverPositive")
                  : t("reports.vacationBalance.carryoverNegative")}
              </Text>
              <Text style={{ fontFamily: "Roboto", fontWeight: 700 }}>
                {vacationBalance.carryover > 0
                  ? `+${vacationBalance.carryover}`
                  : `${vacationBalance.carryover}`}{" "}
                {t("reports.vacationBalance.days")}
              </Text>
            </View>
          ) : null}
          <View style={styles.vacationRow}>
            <Text>
              {t("reports.vacationBalance.used", {
                year: monthDate.getFullYear(),
              })}
            </Text>
            <Text style={{ fontFamily: "Roboto", fontWeight: 700 }}>
              {vacationBalance.usedDays} {t("reports.vacationBalance.days")}
            </Text>
          </View>
          <View style={styles.vacationRemaining}>
            <Text>{t("reports.vacationBalance.remaining")}</Text>
            <Text
              style={{
                color: vacationBalance.remaining >= 0 ? C.textGreen : C.textRed,
              }}
            >
              {vacationBalance.remaining} {t("reports.vacationBalance.days")}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

interface NoteProps {
  note: string;
}
const Note: React.FC<NoteProps> = ({ note }) =>
  note ? (
    <View style={styles.noteBlock} wrap={false}>
      <Text style={styles.noteTitle}>{t("reports.notesTitle")}</Text>
      <Text style={styles.noteText}>{note}</Text>
    </View>
  ) : null;

// ─── Hauptkomponente ────────────────────────────────────────────────

const ReportPdfDocument: React.FC<Props> = ({
  entries = [],
  userData = {} as UserData & { company?: string },
  monthDate,
  filterMode = "month",
  stats,
  workCodes = [],
  attachments = [],
  customNote = "",
  locale,
  calculationConfig,
  allEntries = [],
}) => {
  // Overtime-Spalten-Sichtbarkeit gemaess Locale/Config
  const showOvertimeColumns = useMemo(() => {
    if (!locale) return true; // abwaertskompatibel
    const rules = resolveEffectiveRules(locale, calculationConfig);
    return rules.overtimeMode !== "none";
  }, [locale, calculationConfig]);

  // Anzeige-Toggles (Hausmasta) — Defaults: alles AN
  const display = useMemo(
    () => getEffectivePdfDisplay(calculationConfig),
    [calculationConfig],
  );

  // Code-Label-Map
  const workCodeLabelMap = useMemo<Map<number, string>>(
    () => new Map(workCodes.map((c) => [c.id, c.label])),
    [workCodes],
  );

  // Anhaenge nach Eintrag
  const attachmentsByEntryId = useMemo(() => {
    const map = new Map<Entry["id"], Attachment[]>();
    attachments.forEach((a) => {
      const list = map.get(a.entryId) || [];
      list.push(a);
      map.set(a.entryId, list);
    });
    return map;
  }, [attachments]);

  // Tagesbilanz-Meta (Zebra, Saldo am Tagesende)
  const dayMetaMap = useMemo(
    () => buildDayBalanceMetaMap(entries, userData, locale, calculationConfig),
    [entries, userData, locale, calculationConfig],
  );

  // Urlaubstage-Bilanz (nur wenn konfiguriert)
  const vacationBalance = useMemo<VacationBalance | null>(() => {
    const allowance = calculationConfig?.vacationAllowanceDays ?? 0;
    if (allowance <= 0) return null;
    const carryover = calculationConfig?.vacationCarryoverDays ?? 0;
    const year = monthDate.getFullYear();
    const yearPrefix = `${year}-`;
    const source = allEntries.length > 0 ? allEntries : entries;
    const usedDays = source.filter(
      (e) =>
        e.type === "vacation" &&
        typeof e.date === "string" &&
        e.date.startsWith(yearPrefix),
    ).length;
    return {
      allowance,
      carryover,
      usedDays,
      remaining: allowance + carryover - usedDays,
    };
  }, [calculationConfig, monthDate, allEntries, entries]);

  const safeStats: ReportStats = stats || {
    work: 0,
    drive: 0,
    vacation: 0,
    sick: 0,
    holiday: 0,
    timeComp: 0,
    totalIst: 0,
    totalTarget: 0,
    totalSaldo: 0,
    normalstunden: 0,
    overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header userData={userData} monthDate={monthDate} filterMode={filterMode} />
        <TableHead
          showWorkCodeColumn={display.showWorkCodeColumn}
          showBalance={display.showBalance}
        />
        {entries.map((e, idx) => (
          <Row
            key={e.id}
            e={e}
            prev={entries[idx - 1]}
            next={entries[idx + 1]}
            workCodeLabelMap={workCodeLabelMap}
            attachmentsForEntry={attachmentsByEntryId.get(e.id) || []}
            meta={dayMetaMap[e.id] || {}}
            showWorkCodeColumn={display.showWorkCodeColumn}
            showBalance={display.showBalance}
            showAttachmentsList={display.showAttachmentsList}
          />
        ))}
        {display.showSummary ? (
          <Summary
            display={display}
            stats={safeStats}
            userData={userData}
            showOvertimeColumns={showOvertimeColumns}
            vacationBalance={vacationBalance}
            monthDate={monthDate}
          />
        ) : null}
        {display.showCustomNote ? <Note note={customNote} /> : null}
      </Page>
    </Document>
  );
};

export default ReportPdfDocument;
