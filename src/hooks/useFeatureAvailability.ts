import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  PlayServicesAvailability,
  type PlayServicesAvailabilityResult,
} from "../plugins/PlayServicesAvailabilityPlugin";
import { logger } from "../utils/logger";

/**
 * useFeatureAvailability — probes once per app session whether
 * Google Play Services (and the Gemini Nano on-device model) are
 * available, and re-probes whenever the app returns from the
 * background (the user might have side-installed Sandboxed Play
 * in the meantime).
 *
 * Returns a "fail-open" shape: when the probe hasn't completed yet
 * (or runs on the web), callers see `googleServicesAvailable: true`
 * so the UI doesn't grey out features that should be reachable.
 * Only an explicit `false` from a successful probe disables features.
 */

const log = logger.scope("useFeatureAvailability");

export interface FeatureAvailability extends PlayServicesAvailabilityResult {
  /** True until the first probe (success or failure) completes. */
  loading: boolean;
  /** True when the probe itself raised — fail-open assumption applies. */
  probeFailed: boolean;
}

const FAIL_OPEN: FeatureAvailability = {
  googleServicesAvailable: true,
  googleServicesStatus: 0,
  geminiNanoSupported: false,
  loading: true,
  probeFailed: false,
};

// Module-level singleton: the result is the same for the whole app,
// so we cache here instead of re-probing per component.
let cached: FeatureAvailability = FAIL_OPEN;
let probeInFlight: Promise<void> | null = null;
const subscribers = new Set<(state: FeatureAvailability) => void>();

function emit(): void {
  for (const cb of subscribers) cb(cached);
}

async function probe(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // Web build / preview — keep fail-open, mark loading done.
    cached = { ...FAIL_OPEN, loading: false };
    emit();
    return;
  }
  try {
    const res = await PlayServicesAvailability.check();
    cached = {
      ...res,
      loading: false,
      probeFailed: false,
    };
    log.info("probe result", res);
  } catch (err) {
    // Plugin not registered, native crash, etc. — fail open so users
    // on Google devices don't see disabled buttons because of a bug.
    log.warn("probe failed, falling back to fail-open", err);
    cached = {
      googleServicesAvailable: true,
      googleServicesStatus: -1,
      geminiNanoSupported: false,
      loading: false,
      probeFailed: true,
    };
  }
  emit();
}

function ensureProbe(): void {
  if (probeInFlight) return;
  probeInFlight = probe().finally(() => {
    probeInFlight = null;
  });
}

let resumeListenerInstalled = false;
async function installResumeListener(): Promise<void> {
  if (resumeListenerInstalled || !Capacitor.isNativePlatform()) return;
  resumeListenerInstalled = true;
  try {
    await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        // User came back from background — re-check in case they installed
        // Sandboxed Play in the meantime. Skip if a probe is already running.
        if (!probeInFlight) {
          probe();
        }
      }
    });
  } catch (err) {
    log.warn("could not install appStateChange listener", err);
  }
}

export function useFeatureAvailability(): FeatureAvailability {
  const [state, setState] = useState<FeatureAvailability>(cached);

  useEffect(() => {
    subscribers.add(setState);
    ensureProbe();
    void installResumeListener();
    return () => {
      subscribers.delete(setState);
    };
  }, []);

  return state;
}

/**
 * Test helper — resets the module-level cache and listeners so each
 * test starts from a clean slate. Not exported in production usage.
 */
export function __resetFeatureAvailabilityForTests(
  override: Partial<FeatureAvailability> = {},
): void {
  cached = { ...FAIL_OPEN, ...override };
  probeInFlight = null;
  resumeListenerInstalled = false;
  subscribers.clear();
}
