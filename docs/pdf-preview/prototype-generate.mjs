/**
 * Prototype: ReportDocument als @react-pdf/renderer-Dokument.
 * Spiegelt das aktuelle Layout aus src/components/ReportDocument.tsx
 * so eng wie moeglich (Spalten, Zebra, Summary-Box, Urlaubsbilanz).
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToFile,
  Font,
} from "@react-pdf/renderer";

// Farben — exakt aus PRINT_STYLES in ReportDocument.tsx
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
  borderDark: "#27272a",
  borderLight: "#e4e4e7",
  textPurple: "#7e22ce",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    paddingRight: 18,
    fontSize: 9,
    fontFamily: "Helvetica",
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
    fontFamily: "Helvetica-Bold",
    color: C.textDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  company: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.textMedium,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerMeta: { textAlign: "right", marginRight: 8 },
  headerName: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  headerMonth: { fontSize: 8.5, color: C.textMedium, marginTop: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.bgZebra,
    borderWidth: 1,
    borderColor: C.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.textMedium },

  // Table
  thead: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: C.borderDark,
    paddingTop: 4,
    paddingBottom: 4,
  },
  th: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.textMedium,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  // Spaltenbreiten in Punkt (A4 portrait usable ~ 559pt)
  colDate: { width: 60 },
  colTime: { width: 80 },
  colProject: { flex: 1, paddingRight: 6 },
  colCode: { width: 70 },
  colHours: { width: 38, textAlign: "right" },
  colBalance: { width: 42, textAlign: "right" },

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
  weekday: { width: 18, fontFamily: "Helvetica-Bold" },
  dateStr: { color: C.textMedium },

  timeRange: { fontFamily: "Helvetica-Bold", color: C.textDark },
  pause: { fontSize: 6.5, color: C.textMedium, textTransform: "uppercase", marginTop: 1 },
  pauseNone: { fontSize: 6.5, color: C.textLight, textTransform: "uppercase", marginTop: 1 },

  project: { fontFamily: "Helvetica-Bold", color: C.textMedium, fontSize: 9 },
  projectHoliday: { color: C.textBlue, fontFamily: "Helvetica-Bold", fontSize: 9 },
  projectTimeComp: { color: C.textPurple, fontFamily: "Helvetica-Bold", fontSize: 9 },
  attachmentLine: { fontSize: 6.5, color: C.textLight, marginTop: 2 },

  codeText: { fontSize: 7.5, color: C.textMedium },

  hours: { fontFamily: "Helvetica-Bold", color: C.textDark },
  hoursDrive: { color: C.textLight, fontFamily: "Helvetica" },
  hoursHoliday: { color: C.textBlue, fontFamily: "Helvetica-Bold" },
  balancePos: { color: C.textGreen, fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  balanceNeg: { color: C.textRed, fontFamily: "Helvetica-Bold", fontSize: 7.5 },

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
    fontFamily: "Helvetica-Bold",
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
  sumValue: { fontFamily: "Helvetica-Bold", color: C.textDark },
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
  },

  // Note
  noteBlock: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopStyle: "dashed",
    borderTopColor: C.borderLight,
    paddingTop: 8,
  },
  noteTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.textMedium,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  noteText: { fontSize: 8.5, color: C.textDark, lineHeight: 1.4 },
});

// ─────── Helpers (1:1 aus utils) ───────
const fmt = (mins) => {
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
};
const fmtSigned = (mins) => (mins >= 0 ? `+${fmt(mins)}` : fmt(mins));

// ─────── Mock-Daten: realistischer Mai 2026 ───────
const userData = {
  name: "Markus Kainer",
  company: "Beispiel GmbH",
  initials: "MK",
};

const workCodes = [
  { id: 1, label: "PROD-1" },
  { id: 2, label: "DOC-1" },
  { id: 3, label: "DRIVE" },
  { id: 4, label: "MTG" },
];
const codeMap = new Map(workCodes.map((c) => [c.id, c.label]));

// Mai 2026: Mo–Fr Werktage; 1.5. = Staatsfeiertag; 14.5. = Christi Himmelfahrt
const entries = [
  { id: "h1", type: "public_holiday", date: "2026-05-01", project: "Staatsfeiertag", netDuration: 480 },
  { id: "e1", type: "work", date: "2026-05-04", start: "07:30", end: "12:00", pause: 0, project: "Kunde Acme — Onsite", code: 1, netDuration: 270 },
  { id: "e2", type: "work", date: "2026-05-04", start: "12:30", end: "16:30", pause: 0, project: "Kunde Acme — Onsite", code: 1, netDuration: 240 },
  { id: "e3", type: "work", date: "2026-05-05", start: "08:00", end: "16:30", pause: 30, project: "Sprint Planning + Doku", code: 4, netDuration: 480 },
  { id: "e4", type: "work", date: "2026-05-06", start: "08:00", end: "16:30", pause: 30, project: "Feature: Stundenzettel-Export", code: 1, netDuration: 480 },
  { id: "e5", type: "work", date: "2026-05-07", start: "07:00", end: "08:30", pause: 0, project: "Anfahrt Kunde Beta", code: 3, netDuration: 90 },
  { id: "e6", type: "work", date: "2026-05-07", start: "08:30", end: "17:00", pause: 30, project: "Kunde Beta — Workshop", code: 4, netDuration: 480 },
  { id: "e7", type: "work", date: "2026-05-08", start: "08:00", end: "16:30", pause: 30, project: "Doku & Code-Review", code: 2, netDuration: 480 },
  { id: "e8", type: "work", date: "2026-05-11", start: "08:00", end: "17:30", pause: 30, project: "Release-Vorbereitung", code: 1, netDuration: 540 },
  { id: "e9", type: "work", date: "2026-05-12", start: "08:00", end: "16:30", pause: 30, project: "Bugfix-Day", code: 1, netDuration: 480 },
  { id: "e10", type: "work", date: "2026-05-13", start: "08:00", end: "16:30", pause: 30, project: "Sprint Review", code: 4, netDuration: 480 },
  { id: "h2", type: "public_holiday", date: "2026-05-14", project: "Christi Himmelfahrt", netDuration: 480 },
  { id: "v1", type: "vacation", date: "2026-05-15", project: "Urlaub", netDuration: 480 },
  { id: "e11", type: "work", date: "2026-05-18", start: "08:00", end: "16:30", pause: 30, project: "Kundenmeeting + Nachbereitung", code: 4, netDuration: 480 },
  { id: "s1", type: "sick", date: "2026-05-19", project: "Krankenstand", netDuration: 480 },
  { id: "s2", type: "sick", date: "2026-05-20", project: "Krankenstand", netDuration: 480 },
  { id: "e12", type: "work", date: "2026-05-21", start: "08:00", end: "16:30", pause: 30, project: "Wiedereinstieg", code: 1, netDuration: 480 },
  { id: "e13", type: "work", date: "2026-05-22", start: "08:00", end: "13:00", pause: 0, project: "Halber Tag — Doku", code: 2, netDuration: 300 },
  { id: "tc1", type: "time_comp", date: "2026-05-25", project: "Zeitausgleich", netDuration: 480 },
  { id: "e14", type: "work", date: "2026-05-26", start: "08:00", end: "16:30", pause: 30, project: "Feature: PDF-Vektor-Migration", code: 1, netDuration: 480 },
  { id: "e15", type: "work", date: "2026-05-27", start: "08:00", end: "16:30", pause: 30, project: "Architektur-Workshop", code: 4, netDuration: 480 },
  { id: "e16", type: "work", date: "2026-05-28", start: "08:00", end: "16:30", pause: 30, project: "Tests & Cleanup", code: 2, netDuration: 480 },
  { id: "e17", type: "work", date: "2026-05-29", start: "08:00", end: "12:00", pause: 0, project: "Code-Freeze + Release", code: 1, netDuration: 240 },
];

// Stats grob plausibel
const stats = {
  work: 6390,         // Summe der work-netDuration
  drive: 90,
  vacation: 480,
  sick: 960,
  holiday: 960,
  timeComp: 480,
  totalIst: 9270,     // work + holiday + vacation + sick + timeComp
  totalTarget: 8400,  // 21 AT * 8h
  totalSaldo: 870,
  normalstunden: 8400,
  overtimeSplit: { mehrarbeit: 540, ueberstunden: 330 },
};

const vacationBalance = { allowance: 25, carryover: 3, usedDays: 1, remaining: 27 };

const customNote = "Hinweis fuer HR: Anfahrt zu Kunde Beta wurde als unbezahlte Fahrtzeit erfasst (Code DRIVE).";

// ─────── Komponenten ───────
const Avatar = () => (
  React.createElement(View, { style: styles.avatar },
    React.createElement(Text, { style: styles.avatarText }, userData.initials)
  )
);

const Header = () => (
  React.createElement(View, { style: styles.headerRow },
    React.createElement(View, null,
      React.createElement(Text, { style: styles.title }, "Stundenzettel"),
      React.createElement(Text, { style: styles.company }, userData.company)
    ),
    React.createElement(View, { style: styles.headerRight },
      React.createElement(View, { style: styles.headerMeta },
        React.createElement(Text, { style: styles.headerName }, userData.name),
        React.createElement(Text, { style: styles.headerMonth }, "Mai 2026")
      ),
      React.createElement(Avatar)
    )
  )
);

const TableHead = () => (
  React.createElement(View, { style: styles.thead, fixed: true },
    React.createElement(Text, { style: [styles.th, styles.colDate] }, "Datum"),
    React.createElement(Text, { style: [styles.th, styles.colTime] }, "Zeit"),
    React.createElement(Text, { style: [styles.th, styles.colProject] }, "Projekt"),
    React.createElement(Text, { style: [styles.th, styles.colCode] }, "Code"),
    React.createElement(Text, { style: [styles.th, styles.colHours] }, "Std."),
    React.createElement(Text, { style: [styles.th, styles.colBalance] }, "Saldo")
  )
);

// Zebra: gerade Tage = grau
const isEvenDay = (dateStr) => Number(dateStr.slice(8, 10)) % 2 === 0;

const Row = ({ e, prev, next, dailyBalance }) => {
  const d = new Date(e.date);
  const wd = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][d.getDay()];
  const ds = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
  const sameDay = prev && prev.date === e.date;
  const lastOfDay = !next || next.date !== e.date;

  let rowStyle = [styles.tr];
  if (e.type === "public_holiday") rowStyle.push(styles.trHoliday);
  else if (isEvenDay(e.date)) rowStyle.push(styles.trZebra);
  if (!lastOfDay) rowStyle.push(styles.trNoBorder);

  // Zeit-Zelle
  let timeCell;
  if (e.type === "work") {
    const isDrive = codeMap.get(e.code) === "DRIVE";
    timeCell = React.createElement(View, null,
      React.createElement(Text, { style: styles.timeRange }, `${e.start} – ${e.end}`),
      React.createElement(Text, { style: e.pause > 0 ? styles.pause : styles.pauseNone },
        e.pause > 0 ? `Pause ${e.pause} min` : "OHNE PAUSE")
    );
    if (isDrive) {
      // nichts spezielles
    }
  } else if (e.type === "public_holiday") {
    timeCell = React.createElement(Text, { style: styles.timeRange }, "Feiertag");
  } else if (e.type === "time_comp") {
    timeCell = React.createElement(Text, { style: { color: C.textLight } }, "—");
  } else {
    timeCell = React.createElement(Text, { style: { color: C.textLight } }, "—");
  }

  // Projekt
  let projectStyle = styles.project;
  let projectText = e.project;
  if (e.type === "public_holiday") projectStyle = styles.projectHoliday;
  else if (e.type === "time_comp") projectStyle = styles.projectTimeComp;
  else if (e.type === "vacation") projectText = "Urlaub";
  else if (e.type === "sick") projectText = "Krankenstand";

  // Stunden
  let hoursStyle = styles.hours;
  let hoursText = fmt(e.netDuration);
  if (e.type === "work" && codeMap.get(e.code) === "DRIVE") {
    hoursText = "—";
    hoursStyle = [styles.hours, styles.hoursDrive];
  } else if (e.type === "public_holiday") {
    hoursStyle = [styles.hours, styles.hoursHoliday];
  } else if (e.type === "time_comp") {
    hoursText = "—";
    hoursStyle = [styles.hours, { color: C.textPurple }];
  }

  return React.createElement(View, { style: rowStyle, wrap: false },
    React.createElement(View, { style: [styles.colDate, styles.cellDate] },
      !sameDay && React.createElement(React.Fragment, null,
        React.createElement(Text, { style: styles.weekday }, wd),
        React.createElement(Text, { style: styles.dateStr }, ds)
      )
    ),
    React.createElement(View, { style: styles.colTime }, timeCell),
    React.createElement(View, { style: styles.colProject },
      React.createElement(Text, { style: projectStyle }, projectText)
    ),
    React.createElement(Text, { style: [styles.colCode, styles.codeText] },
      codeMap.get(e.code) || ""),
    React.createElement(Text, { style: [styles.colHours, hoursStyle] }, hoursText),
    React.createElement(View, { style: styles.colBalance },
      lastOfDay && dailyBalance != null
        ? React.createElement(Text, { style: dailyBalance >= 0 ? styles.balancePos : styles.balanceNeg }, fmtSigned(dailyBalance))
        : React.createElement(Text, null, "")
    )
  );
};

// Tagesbilanz: Summe Ist - Soll(8h) pro Werktag (vereinfachend)
const buildDailyBalances = (es) => {
  const byDate = new Map();
  es.forEach((e) => {
    const cur = byDate.get(e.date) || { ist: 0, type: e.type };
    cur.ist += e.netDuration || 0;
    byDate.set(e.date, cur);
  });
  const balances = new Map();
  for (const [date, v] of byDate.entries()) {
    const dow = new Date(date).getDay();
    const target = dow >= 1 && dow <= 5 ? 480 : 0;
    balances.set(date, v.ist - target);
  }
  return balances;
};
const balanceMap = buildDailyBalances(entries);

const Summary = () => (
  React.createElement(View, { style: styles.summaryBox, wrap: false },
    React.createElement(Text, { style: styles.summaryTitle }, "Zusammenfassung"),
    React.createElement(View, { style: styles.summaryGrid },
      React.createElement(View, { style: styles.summaryCol },
        React.createElement(View, { style: styles.sumRow },
          React.createElement(Text, { style: styles.sumLabel }, "Arbeit"),
          React.createElement(Text, { style: styles.sumValue }, fmt(stats.work))
        ),
        React.createElement(View, { style: styles.sumRow },
          React.createElement(Text, { style: { color: C.textBlue } }, "Feiertage"),
          React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: C.textBlue } }, fmt(stats.holiday))
        ),
        React.createElement(View, { style: styles.sumRow },
          React.createElement(Text, { style: { color: C.textBlue } }, "Urlaub"),
          React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: C.textBlue } }, fmt(stats.vacation))
        ),
        React.createElement(View, { style: styles.sumRow },
          React.createElement(Text, { style: { color: C.textPurple } }, "Zeitausgleich"),
          React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: C.textPurple } }, fmt(stats.timeComp))
        ),
        React.createElement(View, { style: styles.sumRow },
          React.createElement(Text, { style: { color: C.textRed } }, "Krankenstand"),
          React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: C.textRed } }, fmt(stats.sick))
        )
      ),
      React.createElement(View, { style: styles.summaryColRight },
        React.createElement(View, { style: styles.sumRowDashed },
          React.createElement(Text, { style: styles.sumLabel }, "Gesamt Ist"),
          React.createElement(Text, { style: styles.sumValue }, fmt(stats.totalIst))
        ),
        React.createElement(View, { style: styles.sumRow },
          React.createElement(Text, { style: { color: C.textMedium } }, "Sollzeit"),
          React.createElement(Text, { style: { color: C.textMedium } }, fmt(stats.totalTarget))
        ),
        React.createElement(View, { style: styles.sumRowBold },
          React.createElement(Text, null, "Saldo"),
          React.createElement(Text, { style: { color: stats.totalSaldo >= 0 ? C.textGreen : C.textRed } }, fmtSigned(stats.totalSaldo))
        ),
        React.createElement(View, { style: styles.overtimeBlock },
          React.createElement(View, { style: styles.sumRow },
            React.createElement(Text, { style: { color: C.textBlue } }, "Mehrarbeit"),
            React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: C.textBlue } }, fmt(stats.overtimeSplit.mehrarbeit))
          ),
          React.createElement(View, { style: styles.sumRow },
            React.createElement(Text, { style: { color: C.textPurple } }, "Überstunden"),
            React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: C.textPurple } }, fmt(stats.overtimeSplit.ueberstunden))
          )
        )
      )
    ),
    React.createElement(View, { style: styles.driveFooter },
      React.createElement(Text, null, "Anfahrt (unbezahlt)"),
      React.createElement(Text, null, fmt(stats.drive))
    ),
    React.createElement(View, { style: styles.vacationBalance },
      React.createElement(View, { style: styles.vacationRow },
        React.createElement(Text, null, "Urlaubsanspruch"),
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold" } }, `${vacationBalance.allowance} Tage`)
      ),
      React.createElement(View, { style: styles.vacationRow },
        React.createElement(Text, null, "Übertrag aus Vorjahr"),
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold" } }, `+${vacationBalance.carryover} Tage`)
      ),
      React.createElement(View, { style: styles.vacationRow },
        React.createElement(Text, null, "Verbraucht 2026"),
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold" } }, `${vacationBalance.usedDays} Tage`)
      ),
      React.createElement(View, { style: styles.vacationRemaining },
        React.createElement(Text, null, "Verbleibend"),
        React.createElement(Text, { style: { color: vacationBalance.remaining >= 0 ? C.textGreen : C.textRed } }, `${vacationBalance.remaining} Tage`)
      )
    )
  )
);

const Note = () => (
  customNote
    ? React.createElement(View, { style: styles.noteBlock, wrap: false },
        React.createElement(Text, { style: styles.noteTitle }, "Anmerkungen"),
        React.createElement(Text, { style: styles.noteText }, customNote)
      )
    : null
);

const Doc = () => (
  React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Header),
      React.createElement(TableHead),
      ...entries.map((e, i) =>
        React.createElement(Row, {
          key: e.id,
          e,
          prev: entries[i - 1],
          next: entries[i + 1],
          dailyBalance: balanceMap.get(e.date),
        })
      ),
      React.createElement(Summary),
      React.createElement(Note)
    )
  )
);

const out = "/tmp/pdf-preview/Stundenzettel_Mai_2026_Preview.pdf";
await renderToFile(React.createElement(Doc), out);
console.log("PDF erzeugt:", out);
