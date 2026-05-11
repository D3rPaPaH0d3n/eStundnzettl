import { useCallback } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Entry, UserData, DeleteTarget } from '../../types';
import { clearLastCode } from "../../utils/lastCode";
import { WORK_MODELS } from "../constants";

/**
 * Löschen von Einträgen und vollständiges Zurücksetzen der App.
 *
 * Beim kompletten Reset wird vorher ein Sicherheits-Backup ins Cache-
 * Verzeichnis geschrieben, damit sich der User noch retten kann, falls
 * das aus Versehen passiert.
 */
interface UseDeleteActionsProps {
  entries: Entry[];
  userData: UserData;
  deleteEntry: (id: number | string) => Promise<void>;
  deleteAllEntries: () => Promise<void>;
  removeAttachmentsForEntry: ((entryId: number | string) => Promise<void>) | null;
  setUserData: (data: UserData) => void;
  setDeleteTarget: (target: DeleteTarget | null) => void;
}

export function useDeleteActions({
  entries,
  userData,
  deleteEntry,
  deleteAllEntries,
  removeAttachmentsForEntry,
  setUserData,
  setDeleteTarget,
}: UseDeleteActionsProps) {
  const { t } = useTranslation();
  const executeDelete = useCallback(
    async (deleteTarget: DeleteTarget | null) => {
      if (deleteTarget?.type === "single") {
        if (deleteTarget.id === undefined) return;
        await deleteEntry(deleteTarget.id);
        if (removeAttachmentsForEntry) {
          await removeAttachmentsForEntry(deleteTarget.id);
        }
        toast.success(t("toasts.entry.deleted"));
      } else if (deleteTarget?.type === "all") {
        // Sicherheits-Backup vor dem Löschen: JSON im Cache speichern
        try {
          const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
          const backupPayload = {
            entries,
            user: userData,
            deletedAt: new Date().toISOString(),
          };
          await Filesystem.writeFile({
            path: "estundnzettl_pre_delete_backup.json",
            data: JSON.stringify(backupPayload),
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
        } catch {
          /* Best-effort, nicht blockierend */
        }

        if (entries?.length && removeAttachmentsForEntry) {
          for (const entry of entries) {
            await removeAttachmentsForEntry(entry.id);
          }
        }
        await deleteAllEntries();
        const emptyUser = {
          name: "",
          position: "",
          photo: null,
          workDays: [...WORK_MODELS[0].days],
        };
        setUserData(emptyUser);
        await clearLastCode();
        toast.success(t("toasts.appReset"));
      }
      setDeleteTarget(null);
    },
    [
      deleteEntry,
      deleteAllEntries,
      entries,
      userData,
      removeAttachmentsForEntry,
      setUserData,
      setDeleteTarget,
      t,
    ]
  );

  return { executeDelete };
}
