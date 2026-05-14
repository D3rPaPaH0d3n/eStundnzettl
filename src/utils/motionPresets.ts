/**
 * Zentrale framer-motion Presets.
 *
 * Ziel: Ein einziger Ort, an dem die "Gefühls-Signatur" der App sitzt —
 * Duration, Easing, Slide-Distanzen, Modal-Scale. Komponenten importieren
 * hier benannte Variants/Transitions statt Inline-Objekte. Künftige Tuning-
 * Runden sind damit ein One-File-Change.
 *
 * Visuelle Abwärtskompatibilität: Die exportierten Defaults spiegeln exakt
 * die bisherigen Inline-Werte aus App.jsx (pageVariants/pageTransition/
 * reportVariants). Kein aktueller Animation-Look verändert sich durch die
 * Umstellung.
 *
 * Reduced-Motion:
 *   shouldReduceMotion() liest prefers-reduced-motion aus. Komponenten
 *   können optional die *Reduced-Varianten nutzen, um Betroffenen dezente
 *   Opacity-Only-Animationen zu liefern. Wird in Welle 3 sukzessive
 *   nachgezogen — die Hauptarbeit dieser Datei ist erstmal die Zentrali-
 *   sierung der Defaults.
 */

// ─── Easing & Duration Tokens ─────────────────────────────

export const EASING = {
  /** Ruhige App-Page-Transition ohne spielerisches Federn. */
  page: "easeOut" as const,
  /** Standard-In-Out für Modals/Drawer. */
  modal: "easeInOut" as const,
  /** Listen-Einträge / Subtile Dekoration. */
  gentle: "easeOut" as const,
};

export const DURATION = {
  quick: 0.18,
  base: 0.24,
  slow: 0.5,
  progress: 0.8,
};

// ─── Page Transitions ─────────────────────────────────────

/** Dezente Page-Transition (Dashboard ↔ Formular ↔ Settings). */
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -6 },
};

export const pageTransition = {
  type: "tween" as const,
  ease: EASING.page,
  duration: DURATION.base,
};

/** Full-Screen-Report: ruhig einblenden statt sichtbar aufzubauen. */
export const reportVariants = {
  initial: { opacity: 0, y: 16 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: 12 },
};

export const reportTransition = {
  type: "tween" as const,
  ease: EASING.page,
  duration: DURATION.base,
};

// ─── Fade (Sub-Views innerhalb einer Page) ────────────────

export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

export const fadeTransition = {
  duration: DURATION.base,
};

// ─── List-Item Enter ──────────────────────────────────────

/** Subtiler Stagger-Look für Listen-Zeilen. */
export const listItemVariants = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0,  opacity: 1 },
};

// ─── Collapse (Akkordeon) ─────────────────────────────────

export const collapseVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit:    { height: 0, opacity: 0 },
};

export const collapseTransition = {
  duration: DURATION.base,
  ease: EASING.modal,
};

// ─── Reduced-Motion Helper ────────────────────────────────

/**
 * Liest prefers-reduced-motion aus der Plattform. Safe für SSR /
 * Test-Umgebungen (matchMedia kann undefined sein).
 */
export function shouldReduceMotion(): boolean {
  try {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
