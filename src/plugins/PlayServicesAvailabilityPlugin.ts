import { registerPlugin } from "@capacitor/core";

/**
 * Result of a Google Play Services / Gemini Nano availability probe.
 * Mirrors the JSObject returned by the native Android plugin.
 */
export interface PlayServicesAvailabilityResult {
  /** True when Google Play Services responded with ConnectionResult.SUCCESS. */
  googleServicesAvailable: boolean;
  /** Raw integer from GoogleApiAvailability (0 = SUCCESS, others see ConnectionResult). */
  googleServicesStatus: number;
  /** True when the Gemini Nano client class is loadable on this build. */
  geminiNanoSupported: boolean;
}

export interface PlayServicesAvailabilityPlugin {
  check(): Promise<PlayServicesAvailabilityResult>;
}

/**
 * PlayServicesAvailability — runtime probe for Google-only features.
 *
 * The plugin only exists on Android. On the web build (and when the
 * plugin isn't registered for any reason) Capacitor returns a stub
 * that throws "PlayServicesAvailability does not have an implementation"
 * — callers should treat that as "feature unknown" and fail open.
 */
export const PlayServicesAvailability =
  registerPlugin<PlayServicesAvailabilityPlugin>("PlayServicesAvailability");
