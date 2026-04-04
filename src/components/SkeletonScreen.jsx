import React from "react";

/**
 * Einfacher Skeleton-Fallback für React.lazy / Suspense.
 * Respektiert das aktuelle Theme (die .dark-Klasse wird auf <html> gesetzt).
 *
 * Props:
 *  - label?: string — optionale, für Screenreader sichtbare Beschreibung
 */
const SkeletonScreen = ({ label = "Lädt..." }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="w-full p-4 space-y-3 animate-pulse"
    >
      <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
      <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-700 rounded-2xl" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-32 w-full bg-zinc-200 dark:bg-zinc-700 rounded-2xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default SkeletonScreen;
