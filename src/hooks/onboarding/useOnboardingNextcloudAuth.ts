import { useState, useRef, useEffect } from "react";
import type { TFunction } from "i18next";
import toast from "react-hot-toast";
import { Browser } from "@capacitor/browser";
import {
  initiateLoginFlow,
  pollLoginResult,
  getNextcloudErrorMessage,
  resolveUserId,
} from "../../utils/nextcloudClient";

interface NcCredentials {
  server: string;
  userId: string;
  loginName: string;
  appPassword: string;
}

export function useOnboardingNextcloudAuth(t: TFunction) {
  // Nextcloud Setup State (for new setup flow)
  const [ncSetupActive, setNcSetupActive] = useState(false);
  const [ncSetupUrl, setNcSetupUrl] = useState("");
  const [ncSetupConnecting, setNcSetupConnecting] = useState(false);
  const [ncSetupConnected, setNcSetupConnected] = useState(false);
  const [ncCredentials, setNcCredentials] = useState<NcCredentials | null>(null);
  const ncSetupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
    };
  }, []);

  const clearNcSetupPoll = () => {
    if (ncSetupPollRef.current) {
      clearInterval(ncSetupPollRef.current);
      ncSetupPollRef.current = null;
    }
  };

  const handleNextcloudSetupToggle = () => {
    if (ncSetupConnected) {
      // Disconnect
      setNcSetupConnected(false);
      setNcCredentials(null);
      setNcSetupActive(false);
      setNcSetupUrl("");
      toast(t("onboarding.toast.ncDisconnected"));
      return;
    }
    setNcSetupActive(!ncSetupActive);
  };

  const handleNextcloudSetup = async () => {
    if (!ncSetupUrl) {
      toast.error(t("onboarding.toast.ncEnterUrl"));
      return;
    }
    try {
      setNcSetupConnecting(true);
      const startResult = await initiateLoginFlow(ncSetupUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const loginUrl = startResult.loginUrl as string;
      const token = startResult.token as string;
      const pollEndpoint = startResult.pollEndpoint as string;
      await Browser.open({ url: loginUrl });

      let attempts = 0;
      ncSetupPollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
          ncSetupPollRef.current = null;
          setNcSetupConnecting(false);
          toast.error(t("onboarding.toast.ncTimeout"));
          return;
        }
        try {
          const result = await pollLoginResult(pollEndpoint, token);
          if (!result.ok) {
            throw new Error(getNextcloudErrorMessage(result));
          }

          if (result.status === 'pending') return;

          if (result.status === 'complete') {
            if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
            ncSetupPollRef.current = null;
            try { await Browser.close(); } catch { /* browser already closed */ }

            const userId = await resolveUserId(result.server as string, result.loginName as string, result.appPassword as string);
            setNcCredentials({
              server: (result.server as string).replace(/\/+$/, ''),
              userId,
              loginName: result.loginName as string,
              appPassword: result.appPassword as string,
            });
            setNcSetupConnected(true);
            setNcSetupConnecting(false);
            toast.success(t("onboarding.toast.ncConnected"));
          }
        } catch (error) {
          if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
          ncSetupPollRef.current = null;
          setNcSetupConnecting(false);
          toast.error((error as Error)?.message || t("onboarding.toast.ncLoginFailed"));
        }
      }, 3000);
    } catch (error) {
      setNcSetupConnecting(false);
      toast.error((error as Error)?.message || t("onboarding.toast.ncServerUnreachable"));
    }
  };

  return {
    ncSetupActive,
    setNcSetupActive,
    ncSetupUrl,
    setNcSetupUrl,
    ncSetupConnecting,
    setNcSetupConnecting,
    ncSetupConnected,
    setNcSetupConnected,
    ncCredentials,
    setNcCredentials,
    ncSetupPollRef,
    clearNcSetupPoll,
    handleNextcloudSetupToggle,
    handleNextcloudSetup,
  };
}

export type { NcCredentials };
