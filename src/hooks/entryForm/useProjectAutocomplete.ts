import React, { useState } from "react";

/**
 * useProjectAutocomplete — Autocomplete-State + -Handler für das Projektfeld.
 *
 * Hält die Vorschlagsliste (`suggestions`) und ihre Sichtbarkeit
 * (`showSuggestions`) und stellt die zugehörigen Handler bereit.
 * Die Filter-Logik ist verbatim aus EntryForm übernommen.
 *
 * `setProject` und `existingProjects` werden als Argumente
 * hereingereicht, da beide Props der Komponente sind.
 *
 * @param setProject — Setter für den Projekt-Wert (Prop von EntryForm)
 * @param existingProjects — bekannte Projekte als Vorschlagsquelle
 */
export function useProjectAutocomplete(
  setProject: (project: string) => void,
  existingProjects: string[],
) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProject(val);
    if (val.length > 0) {
      const filtered = existingProjects.filter(p =>
        p.toLowerCase().includes(val.toLowerCase()) && p !== val
      ).slice(0, 4);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setProject(suggestion);
    setShowSuggestions(false);
  };

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions,
    handleProjectChange,
    selectSuggestion,
  };
}
