/**
 * labelSuggestionsRepo.js — CRUD für Label-Suggestions via SQLite
 *
 * Suggestions werden nach Nutzung gezählt und nach letztem Gebrauch sortiert.
 */

import { run, query } from "../database";

/**
 * Alle Suggestions laden (sortiert nach count DESC, last_used DESC).
 * @returns {Promise<Array<string>>}
 */
export async function getAllLabelSuggestions() {
  const rows = await query(
    "SELECT label FROM label_suggestions ORDER BY count DESC, last_used DESC"
  );
  return rows.map((r) => r.label);
}

/**
 * Suggestion hinzufügen oder aktualisieren (count +1, last_used = jetzt).
 * @param {string} label
 * @returns {Promise<void>}
 */
export async function upsertLabelSuggestion(label) {
  const trimmed = label.trim();
  if (!trimmed) return;

  // Check if exists
  const rows = await query(
    "SELECT count FROM label_suggestions WHERE label = ?",
    [trimmed]
  );

  if (rows.length > 0) {
    await run(
      "UPDATE label_suggestions SET count = count + 1, last_used = ? WHERE label = ?",
      [new Date().toISOString(), trimmed]
    );
  } else {
    await run(
      "INSERT INTO label_suggestions (label, count, last_used) VALUES (?, 1, ?)",
      [trimmed, new Date().toISOString()]
    );
  }
}

/**
 * Bulk-Upsert für Suggestions (Import).
 * @param {Array<string>} labels
 * @returns {Promise<void>}
 */
export async function bulkUpsertLabelSuggestions(labels) {
  if (!labels || labels.length === 0) return;
  for (const label of labels) {
    await upsertLabelSuggestion(label);
  }
}

/**
 * Einzelne Suggestion löschen.
 * @param {string} label
 * @returns {Promise<void>}
 */
export async function deleteLabelSuggestion(label) {
  await run("DELETE FROM label_suggestions WHERE label = ?", [label]);
}

/**
 * Alle Suggestions löschen.
 * @returns {Promise<void>}
 */
export async function deleteAllLabelSuggestions() {
  await run("DELETE FROM label_suggestions");
}
