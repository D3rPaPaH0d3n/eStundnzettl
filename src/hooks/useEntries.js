import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "./constants";

export function useEntries() {
  // Initial laden — Guard gegen "undefined" string oder corrupt JSON
  const loadEntries = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (stored && stored !== "undefined") {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* corrupt */ }
    return [];
  };
  const [entries, setEntries] = useState(loadEntries);

  // Automatisch speichern bei Änderungen
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  }, [entries]);

  // CRUD Operationen
  const addEntry = (entry) => {
    setEntries((prev) => [entry, ...prev]);
  };

  const updateEntry = (updatedEntry) => {
    setEntries((prev) => 
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
  };

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const deleteAllEntries = () => {
    setEntries([]);
  };

  // Import-Funktion (ersetzt alles)
  const importEntries = (newEntries) => {
    setEntries(newEntries);
  };

  return { 
    entries, 
    addEntry, 
    updateEntry, 
    deleteEntry, 
    deleteAllEntries, 
    importEntries 
  };
}