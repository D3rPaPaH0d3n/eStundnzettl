import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, Info, ChevronDown, Plus, X, Calendar, Upload } from "lucide-react";
import SelectionDrawer from "../../SelectionDrawer";
import { getLocale, GERMAN_STATE_IDS, GERMAN_STATE_NAMES } from "../../../locales";
import type { CalculationConfig, OvertimeMode, SickOnWorkDayMode, HolidayOnWorkDayMode } from "../../../types";

/**
 * Onboarding-Schritt "Eigener Plan": Rechenkonfigurations-Baukasten.
 *
 * Wird nur angezeigt, wenn der User in Step 2 ausdrücklich "Eigener
 * Plan" gewählt hat. Nicht-custom User (Neutral/AT/DE) sehen diesen
 * Schritt nie — ihre Rechenregeln kommen direkt aus dem Locale.
 *
 * Aufbau:
 *   - 3 "Simple"-Karten (Vertragsstunden readonly, Überstunden-Regel,
 *     Krank-Regel) immer sichtbar
 *   - "Erweitert"-Akkordeon mit 3 weiteren Karten (Feiertage,
 *     Halbtage, Feiertag+Arbeit)
 *
 * Alle Änderungen laufen über `onChange(next)` → OnboardingWizard
 * aktualisiert `formData.calcConfig`.
 */

interface Props {
  /** Aktuelle Konfiguration aus `formData.calcConfig`. */
  config: CalculationConfig;
  /** Setter auf `formData.calcConfig`. */
  onChange: (next: CalculationConfig) => void;
  /** Aktuelle Arbeitstage aus Step 3 — für die Wochenstunden-Anzeige. */
  workDays: number[];
}

type OvertimeOption = { id: OvertimeMode; label: string };
type SickOption = { id: SickOnWorkDayMode; label: string };
type HolidayOnWorkOption = { id: HolidayOnWorkDayMode; label: string };

const OVERTIME_OPTIONS: OvertimeOption[] = [
  { id: "none", label: "Keine Unterscheidung" },
  { id: "split", label: "Mehrarbeit & Überstunden trennen" },
  { id: "ueberstunden_only", label: "Alles ist Überstunden" },
];

const SICK_OPTIONS: SickOption[] = [
  { id: "cap_to_target", label: "Füllt bis Tagessoll auf" },
  { id: "additive", label: "Zählt zusätzlich zur Arbeit" },
  { id: "ignore", label: "Wird ignoriert" },
];

const HOLIDAY_ON_WORK_OPTIONS: HolidayOnWorkOption[] = [
  { id: "additive", label: "Feiertag zählt zusätzlich" },
  { id: "counts_as_overtime", label: "Feiertag zählt als Überstunde" },
  { id: "cap_to_target", label: "Füllt bis Tagessoll auf" },
];

const formatHours = (minutes: number): string => {
  if (!Number.isFinite(minutes)) return "0 h";
  const hours = minutes / 60;
  return hours.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " h";
};

/** Internes MM-DD-Format → deutsches DD.MM für die Anzeige. */
const mmddToDisplay = (mmdd: string): string => {
  const parts = mmdd.split("-");
  if (parts.length !== 2) return mmdd;
  return `${parts[1]}.${parts[0]}.`;
};

/** Deutsches DD.MM-Input → internes MM-DD. Akzeptiert "24.12", "24.12." etc. */
const displayToMmdd = (input: string): string | null => {
  const clean = input.replace(/\.$/, "").trim();
  const parts = clean.split(".");
  if (parts.length !== 2) return null;
  const dd = parts[0].padStart(2, "0");
  const mm = parts[1].padStart(2, "0");
  if (!/^\d{2}$/.test(dd) || !/^\d{2}$/.test(mm)) return null;
  return `${mm}-${dd}`;
};

const CalculationStep: React.FC<Props> = ({ config, onChange, workDays }) => {
  const [overtimeDrawerOpen, setOvertimeDrawerOpen] = useState(false);
  const [sickDrawerOpen, setSickDrawerOpen] = useState(false);
  const [holidayWorkDrawerOpen, setHolidayWorkDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customHolidayInput, setCustomHolidayInput] = useState({ display: "", name: "" });
  const [customHalfDayInput, setCustomHalfDayInput] = useState("");

  const weeklyMinutes = useMemo(
    () => workDays.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0),
    [workDays]
  );

  const customHolidays = useMemo(
    () => config.holidaySet.customHolidays ?? {},
    [config.holidaySet.customHolidays]
  );
  const sortedHolidayEntries = useMemo(
    () => Object.entries(customHolidays).sort(([a], [b]) => a.localeCompare(b)),
    [customHolidays]
  );

  // --- Live-Preview-Helfer ------------------------------------------------
  const overtimePreview = useMemo(() => {
    // Beispiel: Mo 10h Arbeit mit dem aktuell konfigurierten Wochensoll
    const workMinutes = 600;
    const dayTarget = 480; // 8h Beispiel
    const weekTarget = weeklyMinutes > 0 ? weeklyMinutes : 2310;
    const mehrarbeitBuffer = Math.max(
      0,
      (config.overtimeThresholdMinutes ?? 2400) - weekTarget
    );
    const balance = Math.max(0, workMinutes - dayTarget);
    if (config.overtimeMode === "none") {
      return `Beispiel: 10 h Arbeit bei ${formatHours(weekTarget)}/Woche → Saldo ${formatHours(balance)}.`;
    }
    if (config.overtimeMode === "ueberstunden_only") {
      return `Beispiel: 10 h Arbeit → ${formatHours(balance)} Überstunden.`;
    }
    const ma = Math.min(balance, mehrarbeitBuffer);
    const ue = Math.max(0, balance - ma);
    return `Beispiel: 10 h Arbeit → ${formatHours(ma)} Mehrarbeit, ${formatHours(ue)} Überstunden.`;
  }, [config.overtimeMode, config.overtimeThresholdMinutes, weeklyMinutes]);

  const sickPreview = useMemo(() => {
    switch (config.sickOnWorkDayMode) {
      case "cap_to_target":
        return "Beispiel: 4 h Arbeit + danach krank bei 8,5 h Soll → Krank zählt 4,5 h (nur bis Soll).";
      case "additive":
        return "Beispiel: 4 h Arbeit + 8 h Krank → zählen 12 h gesamt.";
      case "ignore":
        return "Beispiel: 4 h Arbeit + Krank → nur 4 h Arbeit, Krank fällt weg.";
    }
  }, [config.sickOnWorkDayMode]);

  // --- Handlers -----------------------------------------------------------
  const handleOvertimeChange = (id: string | number) => {
    const mode = id as OvertimeMode;
    onChange({
      ...config,
      overtimeMode: mode,
      // Default 40h/Woche wenn Split aktiviert wird und noch keine Schwelle gesetzt
      overtimeThresholdMinutes:
        mode === "split"
          ? (config.overtimeThresholdMinutes ?? 2400)
          : mode === "none"
            ? null
            : config.overtimeThresholdMinutes,
    });
  };

  const handleSickChange = (id: string | number) => {
    onChange({ ...config, sickOnWorkDayMode: id as SickOnWorkDayMode });
  };

  const handleHolidayWorkChange = (id: string | number) => {
    onChange({ ...config, holidayOnWorkDayMode: id as HolidayOnWorkDayMode });
  };

  const handleThresholdHourInput = (value: string) => {
    const parsed = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onChange({
      ...config,
      overtimeThresholdMinutes: Math.round(parsed * 60),
    });
  };

  const handleImportHolidays = (id: string | number) => {
    const localeId = id as string;
    const loc = getLocale(localeId as never);
    const year = new Date().getFullYear();
    const base = loc.getHolidays(year);
    // Als MM-DD-Keys speichern, damit sie jährlich wiederkehren
    const next: Record<string, string> = { ...customHolidays };
    for (const [date, name] of Object.entries(base)) {
      const mmdd = date.slice(5); // "01-01"
      next[mmdd] = name;
    }
    onChange({
      ...config,
      holidaySet: {
        mode: "custom",
        disabledHolidayKeys: [],
        customHolidays: next,
      },
    });
  };

  const handleRemoveCustomHoliday = (key: string) => {
    const next = { ...customHolidays };
    delete next[key];
    onChange({
      ...config,
      holidaySet: {
        ...config.holidaySet,
        customHolidays: next,
      },
    });
  };

  const handleAddCustomHoliday = () => {
    const mmdd = displayToMmdd(customHolidayInput.display);
    const name = customHolidayInput.name.trim();
    if (!mmdd || name.length === 0) return;
    onChange({
      ...config,
      holidaySet: {
        mode: "custom",
        disabledHolidayKeys: [],
        customHolidays: { ...customHolidays, [mmdd]: name },
      },
    });
    setCustomHolidayInput({ display: "", name: "" });
  };

  const handleAddCustomHalfDay = (displayInput: string) => {
    const mmdd = displayToMmdd(displayInput);
    if (!mmdd) return;
    if (config.halfDayMode.customHalfDays.includes(mmdd)) return;
    onChange({
      ...config,
      halfDayMode: {
        mode: "custom",
        customHalfDays: [...config.halfDayMode.customHalfDays, mmdd],
      },
    });
    setCustomHalfDayInput("");
  };

  const handleRemoveHalfDay = (mmdd: string) => {
    const filtered = config.halfDayMode.customHalfDays.filter((d) => d !== mmdd);
    onChange({
      ...config,
      halfDayMode: {
        mode: filtered.length === 0 ? "none" : "custom",
        customHalfDays: filtered,
      },
    });
  };

  const handleAddClassicHalfDays = () => {
    const existing = new Set(config.halfDayMode.customHalfDays);
    existing.add("12-24");
    existing.add("12-31");
    onChange({
      ...config,
      halfDayMode: {
        mode: "custom",
        customHalfDays: Array.from(existing).sort(),
      },
    });
  };

  const importOptions = useMemo(
    () => [
      { id: "at", label: "Österreich" },
      ...GERMAN_STATE_IDS.map((s) => ({
        id: `de-${s}`,
        label: `Deutschland – ${GERMAN_STATE_NAMES[s]}`,
      })),
    ],
    []
  );

  const overtimeLabel =
    OVERTIME_OPTIONS.find((o) => o.id === config.overtimeMode)?.label ?? "Keine Unterscheidung";
  const sickLabel =
    SICK_OPTIONS.find((o) => o.id === config.sickOnWorkDayMode)?.label ?? "Zählt zusätzlich";
  const holidayWorkLabel =
    HOLIDAY_ON_WORK_OPTIONS.find((o) => o.id === config.holidayOnWorkDayMode)?.label ??
    "Feiertag zählt zusätzlich";

  return (
    <motion.div
      key="step-calculation"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Sliders size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Dein eigener Plan
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Stell ein, wie wir rechnen sollen — oder lass die Vorschläge stehen.
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
        <Info size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed">
          Kein Stress — die Standardwerte sind schon okay. Jede Regel kannst du auch
          später jederzeit in den Einstellungen ändern.
        </p>
      </div>

      {/* Card 1: Vertragsstunden Readonly */}
      <div className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-1">
        <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
          Vertragsstunden
        </div>
        <div className="text-xl font-bold text-zinc-800 dark:text-white">
          {formatHours(weeklyMinutes)} / Woche
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Wird automatisch aus deinen Arbeitstagen berechnet.
        </div>
      </div>

      {/* Card 2: Überstunden-Regel */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOvertimeDrawerOpen(true)}
          className="w-full p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors text-left"
        >
          <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
            Überstunden-Regel
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-zinc-800 dark:text-white">{overtimeLabel}</div>
            <ChevronDown size={18} className="text-zinc-400" />
          </div>
        </button>

        {config.overtimeMode === "split" && (
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-2">
              Überstunden ab Wochenstunden
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={80}
                step={0.5}
                defaultValue={((config.overtimeThresholdMinutes ?? 2400) / 60).toString()}
                onBlur={(e) => handleThresholdHourInput(e.target.value)}
                className="flex-1 p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-800 dark:text-white outline-none"
              />
              <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">h / Woche</span>
            </div>
          </div>
        )}

        <div className="text-xs text-zinc-500 dark:text-zinc-400 italic px-1">
          {overtimePreview}
        </div>
      </div>

      {/* Card 3: Krank-Regel */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setSickDrawerOpen(true)}
          className="w-full p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors text-left"
        >
          <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
            Krank am Arbeitstag
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-zinc-800 dark:text-white">{sickLabel}</div>
            <ChevronDown size={18} className="text-zinc-400" />
          </div>
        </button>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 italic px-1">
          {sickPreview}
        </div>
      </div>

      {/* Erweitert-Toggle */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="w-full p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        {advancedOpen ? "Erweitert schließen" : "Erweitert öffnen"}
        <ChevronDown
          size={16}
          className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {advancedOpen && (
          <motion.div
            key="advanced"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-4"
          >
            {/* Card 4: Feiertage */}
            <div className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                <div className="font-bold text-zinc-800 dark:text-white">Feiertage</div>
              </div>

              <button
                type="button"
                onClick={() => setImportDrawerOpen(true)}
                className="w-full p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                <Upload size={14} />
                Feiertage aus Vorlage importieren
              </button>

              {sortedHolidayEntries.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-2">
                  Aktuell keine Feiertage aktiv.
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {sortedHolidayEntries.map(([key, name]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-zinc-700 dark:text-zinc-200 truncate">{name}</div>
                        <div className="text-xs text-zinc-500">{mmddToDisplay(key)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomHoliday(key)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label={`${name} entfernen`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Eigener Feiertag hinzufügen */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700 space-y-2">
                <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                  Eigenen Feiertag hinzufügen
                </div>
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Datum</label>
                    <input
                      type="text"
                      placeholder="DD.MM"
                      value={customHolidayInput.display}
                      onChange={(e) =>
                        setCustomHolidayInput((p) => ({ ...p, display: e.target.value }))
                      }
                      className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Bezeichnung</label>
                    <input
                      type="text"
                      placeholder="z. B. Firmenjubiläum"
                      value={customHolidayInput.name}
                      onChange={(e) =>
                        setCustomHolidayInput((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomHoliday}
                    className="w-full p-2.5 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            {/* Card 5: Halbtage */}
            <div className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                <div className="font-bold text-zinc-800 dark:text-white">Halbtage</div>
              </div>

              {config.halfDayMode.customHalfDays.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-2">
                  Keine Halbtage hinterlegt.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {config.halfDayMode.customHalfDays.map((mmdd) => (
                    <button
                      key={mmdd}
                      type="button"
                      onClick={() => handleRemoveHalfDay(mmdd)}
                      className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      {mmddToDisplay(mmdd)}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddClassicHalfDays}
                className="w-full p-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                24.12. &amp; 31.12. übernehmen
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="DD.MM"
                  value={customHalfDayInput}
                  onChange={(e) => setCustomHalfDayInput(e.target.value)}
                  className="flex-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomHalfDay(customHalfDayInput)}
                  className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                  aria-label="Halbtag hinzufügen"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Card 6: Feiertag + Arbeit */}
            <button
              type="button"
              onClick={() => setHolidayWorkDrawerOpen(true)}
              className="w-full p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors text-left"
            >
              <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                Feiertag + Arbeit am selben Tag
              </div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-zinc-800 dark:text-white">{holidayWorkLabel}</div>
                <ChevronDown size={18} className="text-zinc-400" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SelectionDrawer
        isOpen={overtimeDrawerOpen}
        onClose={() => setOvertimeDrawerOpen(false)}
        title="Überstunden-Regel"
        options={OVERTIME_OPTIONS}
        value={config.overtimeMode}
        onChange={handleOvertimeChange}
      />

      <SelectionDrawer
        isOpen={sickDrawerOpen}
        onClose={() => setSickDrawerOpen(false)}
        title="Krank am Arbeitstag"
        options={SICK_OPTIONS}
        value={config.sickOnWorkDayMode}
        onChange={handleSickChange}
      />

      <SelectionDrawer
        isOpen={holidayWorkDrawerOpen}
        onClose={() => setHolidayWorkDrawerOpen(false)}
        title="Feiertag + Arbeit"
        options={HOLIDAY_ON_WORK_OPTIONS}
        value={config.holidayOnWorkDayMode}
        onChange={handleHolidayWorkChange}
      />

      <SelectionDrawer
        isOpen={importDrawerOpen}
        onClose={() => setImportDrawerOpen(false)}
        title="Feiertage importieren"
        options={importOptions}
        value={""}
        onChange={handleImportHolidays}
      />
    </motion.div>
  );
};

export default CalculationStep;
