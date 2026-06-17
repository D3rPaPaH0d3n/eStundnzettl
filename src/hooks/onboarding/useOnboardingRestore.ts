import { useState, useRef, useEffect } from "react";
import type React from "react";
import type { TFunction } from "i18next";
import toast from "react-hot-toast";
import { Browser } from "@capacitor/browser";
import { signInGoogle, findLatestBackup, downloadFileContent } from "../../utils/googleDrive";
import {
  downloadBackup as ncDownloadBackup,
  initiateLoginFlow,
  pollLoginResult,
  getNextcloudErrorMessage,
  resolveUserId,
} from "../../utils/nextcloudClient";
import {
  analyzeBackupData,
  readJsonFile,
  readBackupFromFolder,
  selectBackupFolder,
} from "../../utils/storageBackup";
import { logger } from "../../utils/logger";
import type { GoogleSignInResult, BackupAnalysisData } from "../../types";
import type { WizardFormData } from "./useOnboardingFlow";

const log = logger.scope("Onboarding");

interface RestoreArgs {
  t: TFunction;
  formData: WizardFormData;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  setRestoreData: React.Dispatch<React.SetStateAction<BackupAnalysisData | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useOnboardingRestore({
  t,
  formData,
  setFormData,
  setStep,
  setRestoreData,
  setLoading,
}: RestoreArgs) {
  const [showNcRestore, setShowNcRestore] = useState(false);
  const [ncRestoreUrl, setNcRestoreUrl] = useState("");
  const [ncRestoreConnecting, setNcRestoreConnecting] = useState(false);
  const ncRestorePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
    };
  }, []);

  // --- BACKUP SETUP HANDLER ---
  const handleAutoBackupToggle = async () => {
    const newValue = !formData.autoBackup;

    if (newValue) {
      try {
        await signInGoogle();
        toast.success(t("onboarding.toast.gdriveLinked"));
        // Erst setzen wenn Login erfolgreich war
        setFormData(p => ({...p, autoBackup: true}));
      } catch (error) {
        log.error(error);
        toast(t("onboarding.toast.gdriveLoginFailed"), { icon: "⚠️" });
        // Nicht aktivieren bei Fehler
        setFormData(p => ({...p, autoBackup: false}));
      }
    } else {
        setFormData(p => ({...p, autoBackup: false}));
    }
  };

  const handleLocalBackupToggle = async () => {
    if (!formData.localBackupEnabled) {
      try {
        const success = await selectBackupFolder();
        if (success) {
          setFormData(p => ({...p, localBackupEnabled: true}));
          toast.success(t("onboarding.toast.folderLinked"));
        }
      } catch (error) {
        log.error(error);
        toast.error(t("onboarding.toast.folderCancelled"));
      }
    } else {
      setFormData(p => ({...p, localBackupEnabled: false}));
    }
  };

  // --- RESTORE LOGIC ---
  const handleGoogleDriveRestore = async () => {
    try {
      setLoading(true);
      const user = await signInGoogle();
      if (!user) throw new Error(t("onboarding.toast.signinFailed"));

      const token = (user as GoogleSignInResult).authentication?.accessToken;
      if (!token) throw new Error(t("onboarding.toast.tokenMissing"));

      // Nutzt jetzt automatisch die neue Logik aus googleDrive.js (inkl. Legacy Fallback)
      const file = await findLatestBackup();
      if (!file) throw new Error(t("onboarding.toast.backupNotFound"));

      const content = await downloadFileContent(token as string, file.id as string);
      if (!content) throw new Error(t("onboarding.toast.backupEmpty"));

      const result = await analyzeBackupData(content);
      if (result.isValid) {
        setRestoreData(result.data);
        toast.success(t("onboarding.toast.backupLoaded"));
        setStep(7);
      } else {
        toast.error(t("onboarding.toast.backupInvalid"));
      }
    } catch (err) {
      log.error(err);
      toast.error((err as Error).message || t("onboarding.toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleFolderRestore = async () => {
    try {
      setLoading(true);
      const backupContent = await readBackupFromFolder();
      if (backupContent) {
          const result = await analyzeBackupData(backupContent);
          if (result.isValid) {
              setRestoreData(result.data);
              toast.success(t("onboarding.toast.backupLoaded"));
              setStep(7);
          } else {
              toast.error(t("onboarding.toast.backupInvalidShort"));
          }
      } else {
          toast.error(t("onboarding.toast.backupNotFound"));
      }
    } catch {
        toast.error(t("onboarding.toast.folderAccessError"));
    } finally {
        setLoading(false);
    }
  };

  const handleLocalFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const content = await readJsonFile(file);
      const result = await analyzeBackupData(content);
      if (result.isValid) {
        if (result.data.integrity === "mismatch") {
          toast(t("onboarding.toast.integrityMismatch"), { duration: 6000 });
        }
        setRestoreData(result.data);
        toast.success(t("onboarding.toast.backupLoaded"));
        setStep(7);
      } else {
        toast.error(t("onboarding.toast.backupInvalidFormat"));
      }
    } catch {
      toast.error(t("onboarding.toast.fileReadError"));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleNextcloudRestore = async () => {
    if (!ncRestoreUrl) {
      toast.error(t("onboarding.toast.ncEnterUrl"));
      return;
    }
    try {
      setNcRestoreConnecting(true);
      const startResult = await initiateLoginFlow(ncRestoreUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const loginUrl = startResult.loginUrl as string;
      const token = startResult.token as string;
      const pollEndpoint = startResult.pollEndpoint as string;
      await Browser.open({ url: loginUrl });

      let attempts = 0;
      ncRestorePollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
          setNcRestoreConnecting(false);
          toast.error(t("onboarding.toast.ncTimeout"));
          return;
        }
        try {
          const result = await pollLoginResult(pollEndpoint, token);
          if (!result.ok) {
            throw new Error(getNextcloudErrorMessage(result));
          }

          if (result.status === 'pending') {
            return;
          }

          if (result.status === 'complete') {
            if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
            try { await Browser.close(); } catch { /* browser already closed */ }
            setNcRestoreConnecting(false);
            setLoading(true);
            try {
              const userId = await resolveUserId(result.server as string, result.loginName as string, result.appPassword as string);
              const content = await ncDownloadBackup(result.server as string, userId, result.appPassword as string);
              if (!content) {
                toast.error(t("onboarding.toast.ncRestoreNotFound"));
                setLoading(false);
                return;
              }
              const analysis = await analyzeBackupData(content);
              if (analysis.isValid) {
                setRestoreData(analysis.data);
                toast.success(t("onboarding.toast.ncRestoreLoaded"));
                setShowNcRestore(false);
                setStep(7);
              } else {
                toast.error(t("onboarding.toast.ncRestoreInvalid"));
              }
            } catch (err) {
              toast.error((err as Error).message || t("onboarding.toast.loadError"));
            } finally {
              setLoading(false);
            }
          }
        } catch (error) {
          if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
          setNcRestoreConnecting(false);
          toast.error((error as Error)?.message || t("onboarding.toast.ncLoginFailed"));
        }
      }, 3000);
    } catch (error) {
      setNcRestoreConnecting(false);
      toast.error((error as Error)?.message || t("onboarding.toast.ncServerUnreachableRestore"));
    }
  };

  return {
    showNcRestore,
    setShowNcRestore,
    ncRestoreUrl,
    setNcRestoreUrl,
    ncRestoreConnecting,
    setNcRestoreConnecting,
    ncRestorePollRef,
    fileInputRef,
    photoInputRef,
    handleAutoBackupToggle,
    handleLocalBackupToggle,
    handleGoogleDriveRestore,
    handleFolderRestore,
    handleLocalFileRestore,
    handleNextcloudRestore,
  };
}
