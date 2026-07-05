/**
 * Site-wide demo/live mode decision (spec 010).
 *
 * One authoritative mode for the whole site, computed server-side at render time.
 * Never derived from browser-side logic.
 *
 * Rules:
 *  - 'demo' when VERCEL_ENV !== 'production'          (preview deployment)
 *  - 'demo' when BLOB_READ_WRITE_TOKEN is absent         (blob unavailable)
 *  - 'demo' when FORCE_DEMO_MODE env flag is set         (development override)
 *  - 'live' only when none of the above triggers apply
 */

import "server-only";

// ── Public types (data-contracts.md) ──────────────────────────────────────────

export type DashboardSiteMode = "live" | "demo";

export interface DashboardSiteModeDecision {
  mode: DashboardSiteMode;
  /**
   * Human-readable reasons why demo mode is active.
   * Empty when mode === 'live'.
   */
  reasons: Array<"preview" | "blob_unavailable">;
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
 * True when the current runtime environment is a Vercel preview deployment.
 * Uses the same signal already used by the platform.
 */
function isPreviewDeployment(): boolean {
  const env = process.env.VERCEL_ENV;
  return typeof env === "string" && env !== "production";
}

/**
 * True when Blob-backed data capability is unavailable.
 * Credentials are absent or explicitly disabled.
 */
function isForceDemoModeEnabled(): boolean {
  const value = process.env.FORCE_DEMO_MODE;
  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function isBlobUnavailable(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  // Treat empty string or missing token as unavailable
  return !token || token.trim() === "";
}

// ── Core decision ──────────────────────────────────────────────────────────────

/**
 * Returns the authoritative site-wide mode decision for the current runtime.
 *
 * Made in trusted server-side logic so the browser never guesses.
 */
export function getSiteMode(): DashboardSiteModeDecision {
  const reasons: Array<"preview" | "blob_unavailable"> = [];
  const forceDemo = isForceDemoModeEnabled();

  if (isPreviewDeployment()) {
    reasons.push("preview");
  }

  if (isBlobUnavailable()) {
    reasons.push("blob_unavailable");
  }

  const mode: DashboardSiteMode = forceDemo || reasons.length > 0 ? "demo" : "live";

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
