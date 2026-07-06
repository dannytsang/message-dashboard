/**
 * Site-wide demo/live mode decision (spec 010).
 *
 * One authoritative mode for the whole site, computed server-side at render time.
 * Never derived from browser-side logic.
 *
 * Triggers (any one activates demo mode):
 *  - BLOB_READ_WRITE_TOKEN / VERCEL_BLOB_READ_WRITE_TOKEN missing or empty  (blob unavailable)
 *  - user has set the demo-mode cookie (`dashboard-demo-mode=demo`)            (authenticated toggle)
 *
 * Live mode when: Blob is available AND cookie is not `demo`.
 */

import "server-only";
import { cookies } from "next/headers";

// ── Public types (data-contracts.md) ──────────────────────────────────────────

export type DashboardSiteMode = "live" | "demo";

export interface DashboardSiteModeDecision {
  mode: DashboardSiteMode;
  /**
   * Human-readable reasons why demo mode is active.
   * Empty when mode === 'live'.
   */
  reasons: Array<"blob_unavailable">;
}

/**
 * State exposed to the shared shell for banner and page consumers.
 */
export interface DashboardShellModeState {
  mode: DashboardSiteMode;
  showDemoBanner: boolean;
  bannerText: "Demo mode — using fictional data";
}

// ── Detection helpers ──────────────────────────────────────────────────────────

/**
 * True when Blob-backed data capability is unavailable.
 * Credentials are absent or explicitly disabled.
 */
function isBlobUnavailable(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  // Treat empty string or missing token as unavailable
  return !token || token.trim() === "";
}

// ── Cookie authority (server-only) ─────────────────────────────────────────────

const DEMO_MODE_COOKIE = "dashboard-demo-mode";

/**
 * Reads the dashboard-demo-mode cookie from the incoming request.
 * Returns the cookie value lowercased, or null if absent/invalid.
 *
 * Must only be called in trusted server-side code.
 */
function readDemoModeCookie(): "demo" | "live" | null {
  try {
    const cookieStore = cookies();
    const entry = cookieStore.get(DEMO_MODE_COOKIE);
    const value = entry?.value;
    if (value === "demo" || value === "live") {
      return value;
    }
    return null;
  } catch {
    // cookies() throws outside of a request context (e.g. at module initialisation)
    return null;
  }
}

/**
 * Applies the user's cookie override to the runtime-decided top-level mode.
 *
 * Rules (spec 010 FR-003):
 * - cookie "demo" → demo regardless of runtime triggers
 * - cookie "live" → live ONLY if Blob is available; otherwise silently falls back to demo
 * - cookie absent/invalid → runtime-decided mode is used
 */
function applyUserOverride(
  topLevelMode: DashboardSiteMode,
  userOverride: "demo" | "live" | null,
  blobUnavailable: boolean,
): DashboardSiteMode {
  if (userOverride === "demo") {
    return "demo";
  }
  if (userOverride === "live") {
    // "live" cookie is honoured only when Blob is available (safe-fallback guard)
    return blobUnavailable ? "demo" : "live";
  }
  // null → no override
  return topLevelMode;
}

// ── Core decision ─────────────────────────────────────────────────────────────

/**
 * Returns the authoritative site-wide mode decision for the current runtime.
 *
 * Made in trusted server-side logic so the browser never guesses.
 */
export function getSiteMode(): DashboardSiteModeDecision {
  const reasons: Array<"blob_unavailable"> = [];
  const blobUnavailable = isBlobUnavailable();

  if (blobUnavailable) {
    reasons.push("blob_unavailable");
  }

  const runtimeMode: DashboardSiteMode = blobUnavailable ? "demo" : "live";

  // Apply cookie override in trusted server-side context
  const userOverride = readDemoModeCookie();
  const mode = applyUserOverride(runtimeMode, userOverride, blobUnavailable);

  return { mode, reasons };
}

/**
 * Returns the shell-facing mode state including banner visibility.
 *
 * @param effectiveModeOverride  Optional per-request effective mode computed from
 *   source-reader outcomes. When present, the shell uses this value instead of the
 *   raw top-level site mode — ensuring the banner reflects source-level fallbacks.
 */
export function getShellModeState(
  effectiveModeOverride?: DashboardSiteMode,
): DashboardShellModeState {
  const topLevel = getSiteMode().mode;
  const mode = effectiveModeOverride ?? topLevel;
  return {
    mode,
    showDemoBanner: mode === "demo",
    bannerText: "Demo mode — using fictional data",
  };
}
