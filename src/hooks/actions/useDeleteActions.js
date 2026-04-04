import { useCallback } from "react";
import toast from "react-hot-toast";
import { dualRemoveSync } from "../../utils/dualWrite";
import { STORAGE_KEYS, WORK_MODELS } from "../constants";

/**
 * Löschen von Einträgen und vollständiges Zurücksetzen der App.
 *
 * Beim kompletten Reset wird vorher ein Sicherheits-Backup ins Cache-
 * Verzeichnis geschrieben, damit sich der User noch retten kann, falls
 * das aus Versehen passiert.
 */
export function useDeleteActions({
  entries,
  userData,
  deleteEntry,
  deleteAllEntries,
  removeAttachmentsForEntry,
  setUserData,
  setDeleteTarget,
}) {
  const executeDelete = useCallback(
    async (deleteTarget) => {
      if (deleteTarget?.type === "single") {
        if (removeAttachmentsForEntry) {
          await removeAttachmentsForEntry(deleteTarget.id);
        }
        deleteEntry(deleteTarget.id);
        toast.success("🗑️ Eintrag gelöscht");
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
        deleteAllEntries();
        const emptyUser = {
          name: "",
          position: "",
          photo: null,
          workDays: [...WORK_MODELS[0].days],
        };
        setUserData(emptyUser);
        await dualRemoveSync(STORAGE_KEYS.LAST_CODE, "last_code");
        localStorage.removeItem(STORAGE_KEYS.ATTACHMENTS);
        localStorage.removeItem(STORAGE_KEYS.ATTACHMENT_LABELS);
        toast.success("🧹 App vollständig zurückgesetzt");
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
    ]
  );

  return { executeDelete };
}
