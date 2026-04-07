import { useState, useEffect, useCallback } from "react";
import { SplashScreen } from '@capacitor/splash-screen';
import type { Entry, UserData, DeleteTarget } from "../types";

const TOUR_SEEN_KEY = "estundnzettl_tour_seen";

/**
 * Manages all top-level UI state for the App component.
 * Extracted from App.tsx to keep the main component focused on composition.
 */
export function useAppState({ userData }: { userData: UserData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("dashboard");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [attachmentEntry, setAttachmentEntry] = useState<Entry | null>(null);

  // Splash screen hide on mount
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  // Onboarding check
  useEffect(() => {
    const isNewUser = userData && !userData.name;
    const isLegacyUser = userData && userData.name && !userData.workDays;

    if (isNewUser || isLegacyUser) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [userData]);

  // Stable callbacks for memoized child components
  const handleRequestDeleteEntry = useCallback(
    (id: number | string) => setDeleteTarget({ type: 'single', id }),
    []
  );
  const handleRequestDeleteAll = useCallback(
    () => setDeleteTarget({ type: 'all' }),
    []
  );
  const handleCloseDeleteModal = useCallback(
    () => setDeleteTarget(null),
    []
  );
  const handleCloseAttachmentModal = useCallback(
    () => setAttachmentEntry(null),
    []
  );

  // Tour handling
  const handleTourStart = useCallback(() => {
    try {
      const seen = localStorage.getItem(TOUR_SEEN_KEY) === "1";
      if (!seen) {
        setTimeout(() => setShowTour(true), 350);
      }
    } catch {
      /* localStorage not available — skip tour */
    }
  }, []);

  const handleTourClose = useCallback(() => {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      /* noop */
    }
  }, []);

  // Navigation header title
  const getHeaderTitle = useCallback((editingEntry: Entry | null) => {
    switch (view) {
      case "settings": return "Einstellungen";
      case "add": return editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag";
      case "report": return "Bericht";
      default: return "eStundnzettl";
    }
  }, [view]);

  return {
    currentDate, setCurrentDate,
    view, setView,
    deleteTarget, setDeleteTarget,
    showOnboarding, setShowOnboarding,
    showTour,
    attachmentEntry, setAttachmentEntry,
    handleRequestDeleteEntry,
    handleRequestDeleteAll,
    handleCloseDeleteModal,
    handleCloseAttachmentModal,
    handleTourStart,
    handleTourClose,
    getHeaderTitle,
  };
}
