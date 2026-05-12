import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "./constants";
import { InstallSource, STORE_INSTALLERS } from "../plugins/InstallSourcePlugin";
import { logger } from "../utils/logger";

const log = logger.scope("useUpdateAvailable");

const RELEASE_API_URL =
  "https://api.github.com/repos/D3rPaPaH0d3n/eStundnzettl/releases/latest";
const LAST_CHECK_KEY = "github_update_last_check_ts";
const LAST_RESULT_KEY = "github_update_last_result";
const DISMISSED_KEY = "github_update_dismissed_for_version";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // einmal pro Tag
const NETWORK_TIMEOUT_MS = 8000;

/** Strip a leading `v` from a tag like `v4.2.1` → `4.2.1`. */
function stripVPrefix(tag: string): string {
  return tag.replace(/^v/i, "").trim();
}

/**
 * Compare two semver-ish strings. Returns >0 if a is newer than b,
 * 0 if equal, <0 if a is older. Tolerant against pre-release
 * suffixes (everything after the first `-` is ignored for ordering).
 */
function compareSemver(a: string, b: string): number {
  const aClean = stripVPrefix(a).split("-")[0];
  const bClean = stripVPrefix(b).split("-")[0];
  const ap = aClean.split(".").map((n) => parseInt(n, 10) || 0);
  const bp = bClean.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(ap.length, bp.length);
  for (let i = 0; i < len; i++) {
    const av = ap[i] || 0;
    const bv = bp[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

interface CachedResult {
  /** Tag of the latest release on GitHub (e.g. "v4.3.0"). */
  latestTag: string;
  /** HTML URL of the release page. */
  htmlUrl: string;
  /** When this cache entry was written (Date.now()). */
  fetchedAt: number;
}

interface ReleaseApiPayload {
  tag_name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
}

interface UpdateAvailableState {
  /** True when a newer-than-installed release was found AND not dismissed. */
  available: boolean;
  /** Tag string of the newer release ("v4.3.0"). */
  latestTag: string | null;
  /** GitHub release page URL — for opening in the browser. */
  htmlUrl: string | null;
  /** Persistently dismiss the banner for this specific version. */
  dismiss: () => void;
}

/**
 * useUpdateAvailable — polls GitHub Releases (max once per 24h) to check
 * whether a newer build than `APP_VERSION` is published. Active only
 * when the app was sideloaded; on Play Store / Amazon / Huawei installs
 * the hook stays silent because those stores handle updates themselves.
 */
export function useUpdateAvailable(): UpdateAvailableState {
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (APP_VERSION === "dev") return;
      if (!Capacitor.isNativePlatform()) return;

      // 1. Sideload-Detection: Wenn aus dem Play Store o.ä. → schweigen.
      let installer: string | null = null;
      try {
        const res = await InstallSource.get();
        installer = res?.installer ?? null;
      } catch (err) {
        log.warn("install source probe failed", err);
        // Plugin fehlt → fail-closed: kein Banner zeigen, weil wir die
        // Quelle nicht kennen und Play-Store-User nicht spammen wollen.
        return;
      }
      if (installer && STORE_INSTALLERS.has(installer)) return;

      // 2. Cache prüfen — wenn jünger als 24h, das alte Ergebnis nutzen.
      const cached = readCache();
      const fresh =
        cached && Date.now() - cached.fetchedAt < CHECK_INTERVAL_MS;

      if (fresh && cached) {
        applyResult(cached.latestTag, cached.htmlUrl);
        return;
      }

      // 3. GitHub Releases API abfragen.
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS);
        const r = await fetch(RELEASE_API_URL, {
          headers: { Accept: "application/vnd.github+json" },
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!r.ok) {
          log.info(`releases API responded ${r.status}, skipping`);
          return;
        }
        const payload = (await r.json()) as ReleaseApiPayload;
        if (payload.draft || payload.prerelease) return;
        const tag = payload.tag_name;
        const url = payload.html_url;
        if (!tag || !url) return;

        const result: CachedResult = {
          latestTag: tag,
          htmlUrl: url,
          fetchedAt: Date.now(),
        };
        writeCache(result);
        applyResult(tag, url);
      } catch (err) {
        log.warn("releases API check failed", err);
      }
    })();

    function applyResult(tag: string, url: string): void {
      if (cancelled) return;
      // Nur setzen wenn wirklich neuer.
      if (compareSemver(tag, APP_VERSION) <= 0) return;
      // Vom User für genau diese Version weggeklickt?
      let prevDismiss: string | null = null;
      try {
        prevDismiss = localStorage.getItem(DISMISSED_KEY);
      } catch {
        /* ignore */
      }
      if (prevDismiss === tag) {
        setDismissed(true);
      }
      setLatestTag(tag);
      setHtmlUrl(url);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = (): void => {
    if (latestTag !== null) {
      try {
        localStorage.setItem(DISMISSED_KEY, latestTag);
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  };

  return {
    available: latestTag !== null && !dismissed,
    latestTag,
    htmlUrl,
    dismiss,
  };
}

function readCache(): CachedResult | null {
  try {
    const ts = localStorage.getItem(LAST_CHECK_KEY);
    const raw = localStorage.getItem(LAST_RESULT_KEY);
    if (!ts || !raw) return null;
    const fetchedAt = parseInt(ts, 10);
    if (!Number.isFinite(fetchedAt)) return null;
    const parsed = JSON.parse(raw) as Partial<CachedResult>;
    if (!parsed.latestTag || !parsed.htmlUrl) return null;
    return {
      latestTag: parsed.latestTag,
      htmlUrl: parsed.htmlUrl,
      fetchedAt,
    };
  } catch {
    return null;
  }
}

function writeCache(result: CachedResult): void {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(result.fetchedAt));
    localStorage.setItem(
      LAST_RESULT_KEY,
      JSON.stringify({ latestTag: result.latestTag, htmlUrl: result.htmlUrl }),
    );
  } catch {
    /* ignore — quota or SSR */
  }
}

/** Test helper. */
export function __resetUpdateAvailableForTests(): void {
  try {
    localStorage.removeItem(LAST_CHECK_KEY);
    localStorage.removeItem(LAST_RESULT_KEY);
    localStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

export { compareSemver as __compareSemver };
