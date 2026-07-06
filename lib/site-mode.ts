/**
 * Site-wide live mode decision.
 *
 * The dashboard always renders live data surfaces;
 * unavailable sources return empty live results with warnings rather than
 * fictional fixtures or a site-wide demo banner.
 */

import "server-only";

export type DashboardSiteMode = "live";

export interface DashboardSiteModeDecision {
  mode: DashboardSiteMode;
  reasons: [];
}

export interface DashboardShellModeState {
  mode: DashboardSiteMode;
  showDemoBanner: false;
  bannerText: "";
}

export function getSiteMode(): DashboardSiteModeDecision {
  return { mode: "live", reasons: [] };
}

export function getShellModeState(): DashboardShellModeState {
  return {
    mode: "live",
    showDemoBanner: false,
    bannerText: "",
  };
}
