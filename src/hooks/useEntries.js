import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "./constants";

export function useEntries() {
  // Initial laden
  const [entries, setEntries] = useState(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES) || "[]")
  );

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