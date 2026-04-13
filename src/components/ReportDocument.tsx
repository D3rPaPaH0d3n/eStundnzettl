import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatTime, formatSignedTime } from "../utils";
import { getIntlLocale } from "../utils/formatLocale";
import { buildDayBalanceMetaMap } from "../utils/timeCalculations";
import { resolveEffectiveRules } from "../utils/calculationConfig";
import { WORK_CODE } from "../hooks/constants";

import type { Entry, UserData, WorkCode, Attachment, CalculationConfig } from "../types";
import type { Locale } from "../locales/types";

/**
 * ReportDocument
 *
 * Reine, state-lose Render-Komponente fuer den Stundenzettel. Wird
 * sowohl in der interaktiven Vorschau (PrintReport) als auch
 * headless fuer das automatische PDF-Archiv (pdfArchive.js) verwendet,
 * damit beide PDFs 1:1 gleich aussehen.
 *
 * Erwartete Props (alle optional ausser entries/userData/monthDate):
 *  - entries:      bereits gefilterte & sortierte Eintraege fuer den Zeitraum
 *  - userData:     { name, company, photo, workDays, ... }
 *  - monthDate:    Date fuer Header-Label
 *  - filterMode:   "month" | Wochennummer (number). Default "month".
 *  - stats:        Ergebnis von calculatePeriodStats fuer diesen Zeitraum
 *  - workCodes:    Array von { id, label }
 *  - attachments:  Array von Attachment-Objekten fuer Dokument-Liste
 *  - customNote:   optionaler Notiz-Text
 *  - domId:        HTML-ID des Wurzel-Containers (wichtig fuer html2pdf;
 *                  default "report-to-print")
 */

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
  domId?: string;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
  /** Alle Einträge des Jahres — für die Urlaubstage-Bilanz im Footer. */
  allEntries?: Entry[];
}

// COLORS (Zinc & Emerald Theme) — 1:1 wie bisher in PrintReport
const PRINT_STYLES = {
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
  borderDark: "#27272a",
  borderLight: "#e4e4e7",
};

const ReportDocument: React.FC<Props> = ({
  entries = [],
  userData = {} as UserData & { company?: string },
  monthDate,
  filterMode = "month",
  stats,
  workCodes = [],
  attachments = [],
  customNote = "",
  domId = "report-to-print",
  locale,
  calculationConfig,
  allEntries = [],
}) => {
  const { t } = useTranslation();
  // Wenn der User keine MA/ÜS-Unterscheidung will, blenden wir die
  // Spalten Mehrarbeit & Überstunden komplett aus und zeigen nur Saldo.
  const showOvertimeColumns = useMemo(() => {
    if (!locale) return true; // Abwärtskompatibel: ohne Locale-Info immer anzeigen
    const rules = resolveEffectiveRules(locale, calculationConfig);
    return rules.overtimeMode !== "none";
  }, [locale, calculationConfig]);
  const employeeName = userData?.name || "";
  const userPhoto = userData?.photo || null;

  const attachmentsByEntryId = useMemo(() => {
    const map = new Map<Entry["id"], Attachment[]>();
    attachments.forEach((attachment) => {
      const list = map.get(attachment.entryId) || [];
      list.push(attachment);
      map.set(attachment.entryId, list);
    });
    return map;
  }, [attachments]);

  const workCodeLabelMap = useMemo<Map<number, string>>(
    () => new Map(workCodes.map((code) => [code.id, code.label])),
    [workCodes]
  );

  const dayMetaMap = useMemo(
    () => buildDayBalanceMetaMap(entries, userData, locale, calculationConfig),
    [entries, userData, locale, calculationConfig]
  );


  // Urlaubstage-Bilanz (nur wenn konfiguriert)
  const vacationBalance = useMemo(() => {
    const allowance = calculationConfig?.vacationAllowanceDays ?? 0;
    if (allowance <= 0) return null;
    const carryover = calculationConfig?.vacationCarryoverDays ?? 0;
    const year = monthDate.getFullYear();
    const yearPrefix = `${year}-`;
    // Alle Urlaubseinträge des Jahres zählen (jeder Eintrag = 1 Tag)
    const source = allEntries.length > 0 ? allEntries : entries;
    const usedDays = source.filter(
      (e) => e.type === "vacation" && typeof e.date === "string" && e.date.startsWith(yearPrefix)
    ).length;
    const remaining = allowance + carryover - usedDays;
    return { allowance, carryover, usedDays, remaining };
  }, [calculationConfig, monthDate, allEntries, entries]);

  // Fallback-Stats, damit die Komponente auch ohne usePeriodStats laeuft.
  const safeStats = stats || {
    work: 0, drive: 0, vacation: 0, sick: 0, holiday: 0, timeComp: 0,
    totalIst: 0, totalTarget: 0, totalSaldo: 0, normalstunden: 0,
    overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
  };

  return (
    <div
      id={domId}
      style={{
        width: "100%",
        backgroundColor: "white",
        padding: "5mm",
        color: PRINT_STYLES.textBlack,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          borderBottom: `2px solid ${PRINT_STYLES.borderDark}`,
          paddingBottom: "0.75rem",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: "bold",
              textTransform: "uppercase",
              color: PRINT_STYLES.textDark,
              margin: 0,
            }}
          >
            {t("reports.title")}
          </h1>
          {userData?.company && (
            <p
              style={{
                fontSize: "0.9rem",
                fontWeight: "bold",
                color: PRINT_STYLES.textMedium,
                marginTop: "0.25rem",
                margin: 0,
              }}
            >
              {userData.company}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: "500", fontSize: "0.9rem", margin: 0 }}>{employeeName}</p>
            <p style={{ fontSize: "0.8rem", color: PRINT_STYLES.textMedium, margin: 0 }}>
              {monthDate?.toLocaleDateString(getIntlLocale(), { month: "long", year: "numeric" })}
              {filterMode !== "month" && ` (${t("dashboard.calendarWeekShort", { week: filterMode })})`}
            </p>
          </div>
          {userPhoto && (
            <img
              src={userPhoto}
              alt={t("reports.employeeAlt")}
              style={{
                width: "55px",
                height: "55px",
                borderRadius: "50%",
                objectFit: "cover",
                border: `1px solid ${PRINT_STYLES.borderLight}`,
                display: "block",
              }}
            />
          )}
        </div>
      </div>

      <table
        style={{
          width: "100%",
          fontSize: "0.85rem",
          textAlign: "left",
          marginBottom: "1rem",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: `2px solid ${PRINT_STYLES.borderDark}`,
              color: PRINT_STYLES.textMedium,
              textTransform: "uppercase",
              fontSize: "0.75rem",
            }}
          >
            <th style={{ padding: "0.4rem 0", width: "5rem" }}>{t("reports.columns.date")}</th>
            <th style={{ padding: "0.4rem 0", width: "6rem" }}>{t("reports.columns.time")}</th>
            <th style={{ padding: "0.4rem 0" }}>{t("reports.columns.project")}</th>
            <th style={{ padding: "0.4rem 0", width: "5.5rem" }}>{t("reports.columns.code")}</th>
            <th style={{ padding: "0.4rem 0", width: "3.5rem", textAlign: "right" }}>{t("reports.columns.hours")}</th>
            <th style={{ padding: "0.4rem 0", width: "3.5rem", textAlign: "right" }}>{t("reports.columns.balance")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => {
            const d = new Date(e.date);
            const wd = d.toLocaleDateString(getIntlLocale(), { weekday: "short" }).slice(0, 2);
            const ds = d.toLocaleDateString(getIntlLocale(), { day: "2-digit", month: "2-digit" });
            const meta = dayMetaMap[e.id] || {};
            const prevEntry = entries[idx - 1];
            const nextEntry = entries[idx + 1];
            const isSameDay = prevEntry && prevEntry.date === e.date;
            const isLastOfDay = !nextEntry || nextEntry.date !== e.date;

            let rowBg = "transparent";
            if (e.type === "public_holiday") rowBg = PRINT_STYLES.bgBlueLight;
            else if (meta.isEvenDay) rowBg = PRINT_STYLES.bgZebra;

            let projectText = e.project;
            const codeText = workCodeLabelMap.get(e.code!) || "";
            let durationDisplay = formatTime(e.netDuration);
            let timeColor = PRINT_STYLES.textDark;

            let timeCellContent = null;
            if (e.type === "work") {
              if (e.code === WORK_CODE.DRIVE) {
                durationDisplay = "-";
                timeColor = PRINT_STYLES.textLight;
              }
              const pauseText = e.pause > 0 ? t("reports.pauseMin", { minutes: e.pause }) : t("reports.noPauseUpper");
              const pauseColor = e.pause > 0 ? PRINT_STYLES.textMedium : PRINT_STYLES.textLight;
              timeCellContent = (
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: PRINT_STYLES.textDark,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.start} – {e.end}
                  </span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      textTransform: "uppercase",
                      marginTop: "2px",
                      color: pauseColor,
                    }}
                  >
                    {pauseText}
                  </span>
                </div>
              );
            } else if (e.type === "public_holiday") {
              timeCellContent = <span style={{ fontWeight: "bold", color: PRINT_STYLES.textDark }}>{t("entryTypes.holiday")}</span>;
              projectText = e.project || t("reports.publicHoliday");
              durationDisplay = formatTime(e.netDuration);
              timeColor = PRINT_STYLES.textBlue;
            } else if (e.type === "time_comp") {
              timeCellContent = <span style={{ color: PRINT_STYLES.textLight }}>-</span>;
              projectText = t("entryTypes.timeComp");
              timeColor = "#7e22ce";
            } else {
              timeCellContent = <span style={{ color: PRINT_STYLES.textLight }}>-</span>;
              projectText = e.type === "vacation" ? t("entryTypes.vacation") : t("entryTypes.sick");
            }

            const borderStyle = isLastOfDay ? `1px solid ${PRINT_STYLES.borderLight}` : "none";
            const entryAttachments = attachmentsByEntryId.get(e.id) || [];

            return (
              <tr
                key={e.id}
                style={{
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                  backgroundColor: rowBg,
                  borderBottom: borderStyle,
                }}
              >
                <td style={{ padding: "0.5rem 0", verticalAlign: "top", whiteSpace: "nowrap" }}>
                  {!isSameDay && (
                    <>
                      <span style={{ display: "inline-block", width: "2rem", fontWeight: "bold" }}>{wd}</span>
                      <span style={{ color: PRINT_STYLES.textMedium }}>{ds}</span>
                    </>
                  )}
                </td>
                <td style={{ padding: "0.5rem 0", verticalAlign: "top" }}>{timeCellContent}</td>
                <td
                  style={{
                    padding: "0.5rem 0",
                    verticalAlign: "top",
                    whiteSpace: "normal",
                    wordWrap: "break-word",
                    paddingRight: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "500",
                      color:
                        e.type === "public_holiday"
                          ? PRINT_STYLES.textBlue
                          : e.type === "time_comp"
                          ? "#7e22ce"
                          : PRINT_STYLES.textMedium,
                    }}
                  >
                    {projectText}
                  </span>
                  {entryAttachments.length > 0 && (
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "0.68rem",
                        color: PRINT_STYLES.textLight,
                        lineHeight: 1.35,
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>{t("reports.documentsLabel")}</span>{" "}
                      {entryAttachments.map((attachment) => attachment.label).join(", ")}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "0.5rem 0",
                    verticalAlign: "top",
                    fontSize: "0.75rem",
                    color: PRINT_STYLES.textMedium,
                    whiteSpace: "normal",
                    wordWrap: "break-word",
                  }}
                >
                  {codeText}
                </td>
                <td
                  style={{
                    padding: "0.5rem 0",
                    verticalAlign: "bottom",
                    textAlign: "right",
                    fontWeight: "bold",
                    color: timeColor,
                  }}
                >
                  {durationDisplay}
                </td>
                <td
                  style={{
                    padding: "0.5rem 0",
                    verticalAlign: "bottom",
                    textAlign: "right",
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                  }}
                >
                  {meta.showBalance && (
                    <span style={{ color: meta.balance >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }}>
                      {formatSignedTime(meta.balance)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: "0.5rem", pageBreakInside: "avoid", breakInside: "avoid" }}>
        <div
          style={{
            backgroundColor: PRINT_STYLES.bgGray,
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: `1px solid ${PRINT_STYLES.borderLight}`,
          }}
        >
          <h3
            style={{
              fontWeight: "bold",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              marginBottom: "0.3rem",
              borderBottom: `1px solid ${PRINT_STYLES.borderLight}`,
              paddingBottom: "0.1rem",
              color: PRINT_STYLES.textMedium,
            }}
          >
            {t("reports.summary.title")}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 2rem" }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  marginBottom: "0.1rem",
                }}
              >
                <span>{t("reports.summary.work")}</span>
                <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.work)}</span>
              </div>
              {safeStats.holiday > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    marginBottom: "0.1rem",
                    color: PRINT_STYLES.textBlue,
                  }}
                >
                  <span>{t("reports.summary.holidays")}</span>
                  <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.holiday)}</span>
                </div>
              )}
              {safeStats.vacation > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    marginBottom: "0.1rem",
                    color: PRINT_STYLES.textBlue,
                  }}
                >
                  <span>{t("reports.summary.vacation")}</span>
                  <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.vacation)}</span>
                </div>
              )}
              {safeStats.timeComp > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    marginBottom: "0.1rem",
                    color: "#7e22ce",
                  }}
                >
                  <span>{t("reports.summary.timeComp")}</span>
                  <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.timeComp)}</span>
                </div>
              )}
              {safeStats.sick > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    marginBottom: "0.1rem",
                    color: PRINT_STYLES.textRed,
                  }}
                >
                  <span>{t("reports.summary.sickness")}</span>
                  <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.sick)}</span>
                </div>
              )}
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  marginBottom: "0.1rem",
                  borderBottom: `1px dashed ${PRINT_STYLES.borderLight}`,
                  paddingBottom: "2px",
                }}
              >
                <span>{t("reports.summary.totalActual")}</span>
                <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.totalIst)}</span>
              </div>
              {!userData?.simpleMode && (
              <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  marginBottom: "0.1rem",
                  color: PRINT_STYLES.textMedium,
                }}
              >
                <span>{t("reports.summary.targetTime")}</span>
                <span>{formatTime(safeStats.totalTarget)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                  marginTop: "0.3rem",
                  fontWeight: "bold",
                }}
              >
                <span>{t("reports.summary.balance")}</span>
                <span style={{ color: safeStats.totalSaldo >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }}>
                  {formatSignedTime(safeStats.totalSaldo)}
                </span>
              </div>

              {showOvertimeColumns && (safeStats.overtimeSplit.mehrarbeit > 0 || safeStats.overtimeSplit.ueberstunden > 0) && (
                <div
                  style={{
                    marginTop: "0.4rem",
                    paddingTop: "0.2rem",
                    borderTop: `1px dashed ${PRINT_STYLES.borderLight}`,
                  }}
                >
                  {safeStats.overtimeSplit.mehrarbeit > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: PRINT_STYLES.textBlue,
                      }}
                    >
                      <span>{t("reports.summary.extraHours")}</span>
                      <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.overtimeSplit.mehrarbeit)}</span>
                    </div>
                  )}
                  {safeStats.overtimeSplit.ueberstunden > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "#7e22ce",
                      }}
                    >
                      <span>{t("reports.summary.overtime")}</span>
                      <span style={{ fontWeight: "bold" }}>{formatTime(safeStats.overtimeSplit.ueberstunden)}</span>
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </div>
          </div>
          {safeStats.drive > 0 && (
            <div
              style={{
                borderTop: `1px solid ${PRINT_STYLES.borderLight}`,
                marginTop: "0.3rem",
                paddingTop: "0.2rem",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                color: PRINT_STYLES.textLight,
                fontStyle: "italic",
              }}
            >
              <span>{t("reports.summary.driveUnpaid")}</span>
              <span>{formatTime(safeStats.drive)}</span>
            </div>
          )}

          {/* Urlaubstage-Bilanz */}
          {vacationBalance && (
            <div
              style={{
                borderTop: `1px solid ${PRINT_STYLES.borderLight}`,
                marginTop: "0.4rem",
                paddingTop: "0.3rem",
                fontSize: "0.75rem",
                color: PRINT_STYLES.textMedium,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                <span>{t("reports.vacationBalance.allowance")}</span>
                <span style={{ fontWeight: "bold" }}>{vacationBalance.allowance} {t("reports.vacationBalance.days")}</span>
              </div>
              {vacationBalance.carryover !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                  <span>{vacationBalance.carryover > 0 ? t("reports.vacationBalance.carryoverPositive") : t("reports.vacationBalance.carryoverNegative")}</span>
                  <span style={{ fontWeight: "bold" }}>{vacationBalance.carryover > 0 ? `+${vacationBalance.carryover}` : `${vacationBalance.carryover}`} {t("reports.vacationBalance.days")}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                <span>{t("reports.vacationBalance.used", { year: monthDate.getFullYear() })}</span>
                <span style={{ fontWeight: "bold" }}>{vacationBalance.usedDays} {t("reports.vacationBalance.days")}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  color: vacationBalance.remaining >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed,
                }}
              >
                <span>{t("reports.vacationBalance.remaining")}</span>
                <span>{vacationBalance.remaining} {t("reports.vacationBalance.days")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {customNote && (
        <div
          style={{
            marginTop: "1.5rem",
            pageBreakInside: "avoid",
            breakInside: "avoid",
            borderTop: `2px dashed ${PRINT_STYLES.borderLight}`,
            paddingTop: "1rem",
          }}
        >
          <h3
            style={{
              fontSize: "0.8rem",
              fontWeight: "bold",
              textTransform: "uppercase",
              color: PRINT_STYLES.textMedium,
              marginBottom: "0.5rem",
            }}
          >
            {t("reports.notesTitle")}
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              whiteSpace: "pre-wrap",
              lineHeight: "1.4",
              color: PRINT_STYLES.textDark,
            }}
          >
            {customNote}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportDocument;
