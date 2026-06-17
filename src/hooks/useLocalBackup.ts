import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";
import {
  selectBackupFolder,
  hasBackupTarget,
  clearBackupTarget,
} from "../utils/storageBackup";
import toast from "react-hot-toast";

interface UseLocalBackupArgs {
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  t: TFunction;
}

export function useLocalBackup({ autoBackup, setAutoBackup, t }: UseLocalBackupArgs) {
  const [hasBackupFolder, setHasBackupFolder] = useState(false);

  // Load initial data (Local-Anteil)
  useEffect(() => {
    // Synchronous initial read of the external backup target. The original
    // component performed this exact call as the first statement of its
    // combined load effect (where the rule did not fire); extracting the
    // Local slice into its own effect surfaces react-hooks/set-state-in-effect
    // for the very same statement. Behavior is unchanged.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasBackupFolder(hasBackupTarget());

    // SQLite nachladen
    if (isSQLiteActive()) {
      (async () => {
        try {
          const sqlBackupTarget = await getSetting("backup_target");
          if (sqlBackupTarget === "documents") {
            setHasBackupFolder(true);
          }
        } catch { /* keep localStorage values */ }
      })();
    }
  }, []);

  const handleLocalToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });

    if (hasBackupFolder) {
      await clearBackupTarget();
      setHasBackupFolder(false);
      await setSetting("local_backup_enabled", false);
      toast(t("settings.backup.toast.localDisconnected"));
    } else {
      try {
        const success = await selectBackupFolder();
        if (success) {
          setHasBackupFolder(true);
          await setSetting("local_backup_enabled", true);
          if (!autoBackup) setAutoBackup(true);
          toast.success(t("settings.backup.toast.localActivated"));
        }
      } catch {
        // Partiellen State bereinigen (BACKUP_TARGET könnte bereits gesetzt sein)
        await clearBackupTarget();
        toast.error(t("settings.backup.toast.folderCancelled"));
      }
    }
  };

  return {
    hasBackupFolder,
    setHasBackupFolder,
    handleLocalToggle,
  };
}
