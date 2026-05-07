/**
 * useCalculationConfig — Hook für die per-User Rechenkonfiguration.
 *
 * SQLite ist die Source of Truth. Der Hook startet mit Locale-Defaults und
 * hydriert nach dem Mount aus SQLite.
 *
 * Bestehende User ohne Config bekommen beim ersten Load eine
 * Default-Config, die **exakt ihrem heutigen Locale-Verhalten
 * entspricht** — es ändern sich keine Zahlen im Dashboard. Erst
 * wenn der User bewusst etwas im Baukasten oder in den Settings
 * ändert, wird gerechnet wie gewünscht.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Locale, LocaleId } from "../locales/types";
import { getLocale } from "../locales";
import type { CalculationConfig, UserData } from "../types";
import {
  getDefaultCalculationConfig,
  coerceCalculationConfig,
} from "../utils/calculationConfig";
import { isSQLiteActive } from "../db/storageMode";
import {
  getSetting,
  setSetting,
} from "../db/repositories/settingsRepo";
import { logger } from "../utils/logger";

const SETTINGS_KEY = "calculationConfig";
interface UseCalculationConfigArgs {
  /** Aktuelle Locale — für Defaults bei neuen Usern. */
  locale: Locale;
  /** `null` wenn der User die Locale noch nicht gewählt hat (bestehende User). */
  localeId: LocaleId | null;
  /** User-Daten — nur für `workDays` beim Defaulting genutzt. */
  userData: UserData;
}

/**
 * Zentraler Hook für die Rechenkonfiguration. Wird in `App.tsx`
 * instanziiert und per Prop an OnboardingWizard und Settings
 * durchgereicht.
 */
export function useCalculationConfig({
  locale,
  localeId,
  userData,
}: UseCalculationConfigArgs) {
  // Default aus aktueller Locale (wird später ggf. von SQLite überschrieben).
  const initialDefault = useRef<CalculationConfig>(
    getDefaultCalculationConfig(locale, userData.workDays)
  );

  const [calcConfig, setCalcConfigState] = useState<CalculationConfig>(() =>
    initialDefault.current
  );

  const sqliteReady = useRef<boolean>(false);
  const initDone = useRef<boolean>(false);

  // ─── SQLite-Hydrate ──────────────────────────────────────
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    if (!isSQLiteActive()) return;

    let cancelled = false;

    (async () => {
      try {
        sqliteReady.current = true;
        const sqlValue = await getSetting(SETTINGS_KEY);
        if (cancelled) return;

        if (sqlValue && typeof sqlValue === "object") {
          // Existing config → coerce & use
          const coerced = coerceCalculationConfig(sqlValue, initialDefault.current);
          setCalcConfigState(coerced);
          return;
        }

        // Keine Config in SQLite → bestehender User, Migration
        // aus aktueller Locale (identisches Verhalten zum heutigen Stand).
        const localeForDefault = getLocale(localeId ?? undefined);
        const migrated = getDefaultCalculationConfig(
          localeForDefault,
          userData.workDays
        );
        setCalcConfigState(migrated);
        try {
          await setSetting(SETTINGS_KEY, migrated);
        } catch (err) {
          logger.error("[useCalculationConfig] Initial-Write fehlgeschlagen:", err);
        }
      } catch (err) {
        logger.error("[useCalculationConfig] SQLite-Hydrate fehlgeschlagen:", err);
        sqliteReady.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
    // intentionally no dependencies — Hydrate läuft nur einmal nach Mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── SQLite-Write bei jeder Änderung ─────────────────────
  useEffect(() => {
    if (sqliteReady.current) {
      setSetting(SETTINGS_KEY, calcConfig).catch((err) =>
        logger.error("[useCalculationConfig] SQLite-Write fehlgeschlagen:", err)
      );
    }
  }, [calcConfig]);

  // ─── Setter-API ──────────────────────────────────────────
  const setCalculationConfig = useCallback(
    (next: CalculationConfig | ((prev: CalculationConfig) => CalculationConfig)) => {
      setCalcConfigState((prev) =>
        typeof next === "function" ? (next as (p: CalculationConfig) => CalculationConfig)(prev) : next
      );
    },
    []
  );

  /**
   * Setzt die Config auf die Locale-Defaults zurück. Nützlich nach
   * einem Locale-Wechsel wenn der User "Ja, zurücksetzen" bestätigt.
   */
  const resetCalculationConfigToLocale = useCallback(
    (newLocale: Locale, workDays: number[]) => {
      setCalcConfigState(getDefaultCalculationConfig(newLocale, workDays));
    },
    []
  );

  return {
    calculationConfig: calcConfig,
    setCalculationConfig,
    resetCalculationConfigToLocale,
  };
}
