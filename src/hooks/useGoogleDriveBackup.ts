import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useFeatureAvailability } from "./useFeatureAvailability";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting } from "../db/repositories/settingsRepo";
import {
  initGoogleAuth,
  signInGoogle,
  signOutGoogle,
  getGoogleAuthStatus,
  getStoredGoogleAuth,
} from "../utils/googleDrive";
import toast from "react-hot-toast";
import { logger } from "../utils/logger";
import type { GoogleAuthStatus, GoogleSignInResult } from "../types";
import { isGoogleConnectionReady } from "../components/Settings/backupSettingsUtils";

const log = logger.scope("Nextcloud");

interface UseGoogleDriveBackupArgs {
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  t: TFunction;
}

export function useGoogleDriveBackup({ autoBackup, setAutoBackup, t }: UseGoogleDriveBackupArgs) {
  const featureAvailability = useFeatureAvailability();
  // Only treat the feature as unavailable when the probe completed AND
  // explicitly returned false. While loading or after a probe error we
  // keep the UI fully enabled (fail-open).
  const gdriveDisabled =
    !featureAvailability.loading &&
    !featureAvailability.probeFailed &&
    featureAvailability.googleServicesAvailable === false;
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [backupFailCount, setBackupFailCount] = useState(0);
  const [googleAccountLabel, setGoogleAccountLabel] = useState("");
  const [backupLastError, setBackupLastError] = useState("");

  // Load initial data (Google-Anteil)
  useEffect(() => {
    Promise.resolve(getGoogleAuthStatus())
      .then((googleStatus: Record<string, unknown>) => {
        setIsTokenValid(isGoogleConnectionReady(googleStatus as GoogleAuthStatus));
        const storedAuth = getStoredGoogleAuth?.() as Record<string, unknown> | null;
        const accountLabel =
          (googleStatus?.email as string) ||
          (googleStatus?.accountEmail as string) ||
          (storedAuth?.email as string) ||
          (storedAuth?.accountEmail as string) ||
          "";
        setGoogleAccountLabel(accountLabel);
      })
      .catch(() => {
        setIsTokenValid(false);
        const storedAuth = getStoredGoogleAuth?.() as Record<string, unknown> | null;
        setGoogleAccountLabel((storedAuth?.email as string) || (storedAuth?.accountEmail as string) || "");
      });

    // SQLite nachladen
    if (isSQLiteActive()) {
      (async () => {
        try {
          const [sqlFailCount, sqlLastError, sqlCloudEnabled] = await Promise.all([
            getSetting("backup_fail_count"),
            getSetting("backup_last_error"),
            getSetting("cloud_sync_enabled"),
          ]);
          if (sqlFailCount !== null) {
            setBackupFailCount(parseInt(String(sqlFailCount), 10) || 0);
          }
          if (typeof sqlLastError === "string") {
            setBackupLastError(sqlLastError);
          }
          if (sqlCloudEnabled !== null) {
            const enabled = !!sqlCloudEnabled;
            setIsCloudConnected(enabled);
          }
          const refreshedStatus = await getGoogleAuthStatus() as Record<string, unknown>;
          setIsTokenValid(isGoogleConnectionReady(refreshedStatus as GoogleAuthStatus));
          const storedAuth2 = getStoredGoogleAuth?.() as Record<string, unknown> | null;
          setGoogleAccountLabel(
            (refreshedStatus?.email as string) ||
            (refreshedStatus?.accountEmail as string) ||
            (storedAuth2?.email as string) ||
            (storedAuth2?.accountEmail as string) ||
            ""
          );
        } catch { /* keep localStorage values */ }
      })();
    }
  }, []);

  const handleGoogleToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });

    if (isCloudConnected) {
      try {
        await signOutGoogle();
        setIsCloudConnected(false);
        setIsTokenValid(false);
        setGoogleAccountLabel("");
        setAutoBackup(false);
      } catch (e) {
        log.error(e);
        setIsCloudConnected(false);
        setIsTokenValid(false);
        setGoogleAccountLabel("");
        setAutoBackup(false);
      }
    } else {
      try {
        await initGoogleAuth().catch(() => {});
        const user = await signInGoogle() as GoogleSignInResult;
        if (user && user.authentication?.accessToken) {
          setIsCloudConnected(true);
          setIsTokenValid(true);
          const refreshedStatus = await getGoogleAuthStatus().catch(() => null) as GoogleAuthStatus | null;
          setGoogleAccountLabel(
            refreshedStatus?.email ||
            user.email ||
            ""
          );
          if (!autoBackup) setAutoBackup(true);
          toast.success(t("settings.backup.toast.gdriveConnected", {
            label: user.givenName || user.email || t("settings.backup.toast.gdriveDefaultLabel"),
          }));
        }
      } catch (error) {
        log.error(error);
        setIsTokenValid(false);
        const message = String((error as Error)?.message || error || "");
        if (message.includes("GOOGLE_DRIVE_AUTH_CANCELLED")) {
          toast.error(t("settings.backup.toast.gdriveCancelled"));
        } else if (message.includes("GOOGLE_DRIVE_NATIVE_UNAVAILABLE")) {
          toast.error(t("settings.backup.toast.gdriveUnavailable"));
        } else {
          toast.error(t("settings.backup.toast.gdriveFailed"));
        }
      }
    }
  };

  return {
    gdriveDisabled,
    isCloudConnected,
    isTokenValid,
    backupFailCount,
    setBackupFailCount,
    googleAccountLabel,
    backupLastError,
    setBackupLastError,
    handleGoogleToggle,
  };
}
