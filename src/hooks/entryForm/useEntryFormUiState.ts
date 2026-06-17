import { useState } from "react";

/**
 * useEntryFormUiState — reine UI-Sichtbarkeits-States des Entry-Formulars.
 *
 * Bündelt jene Sichtbarkeits-Flags, die ausschließlich im JSX gelesen/
 * gesetzt werden (Work-Code-Drawer, Quick-Add-Bereich). Enthält bewusst
 * KEINE Fachlogik und keine Projekt-Autocomplete-States
 * (suggestions/showSuggestions) — die liegen in `useProjectAutocomplete`.
 *
 * Bewusst NICHT hier: `activeTimeField`, `showPausePicker` und
 * `showDateFallback`. Deren Setter werden innerhalb der verbatim
 * beibehaltenen `useCallback`s (openTimePicker/openPausePicker/
 * openDatePicker) verwendet. Würden diese Setter über die Custom-Hook-
 * Grenze gereicht, verlöre der React Compiler ihre Stabilitäts-Provenienz
 * und meldete `exhaustive-deps`/`preserve-manual-memoization` — was die
 * (eingefrorenen) Dependency-Arrays verändern müsste. Diese drei States
 * bleiben daher als direkte `useState` in der Komponente.
 *
 * @returns State-Werte + zugehörige Setter, 1:1 wie zuvor in EntryForm.
 */
export function useEntryFormUiState() {
  const [isWorkCodeOpen, setIsWorkCodeOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return {
    isWorkCodeOpen, setIsWorkCodeOpen,
    quickAddOpen, setQuickAddOpen,
  };
}
