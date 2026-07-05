/**
 * Shared navigation shell. The user menu (rendered via SessionSurface →
 * UserMenu) carries the authenticated-only demo-mode toggle. Sign out remains
 * the last item in that menu.
 */
import NavigationClient from "@/components/NavigationClient";
import { getSessionDisplayName } from "@/lib/auth";
import { getOptionalServerSession } from "@/lib/auth-helpers";
import { getShellModeState } from "@/lib/site-mode";
import type { DashboardSiteMode } from "@/lib/site-mode";
import styles from "./Navigation.module.css";

interface NavigationProps {
  /**
   * Per-request effective mode override.
   * When provided, the shell uses this instead of the raw top-level site mode —
   * ensuring the demo banner reflects source-level fallbacks (spec 010 FR-004).
   */
  effectiveModeOverride?: DashboardSiteMode;
}

export default async function Navigation({ effectiveModeOverride }: NavigationProps) {
  const session = await getOptionalServerSession();
  const shellMode = getShellModeState(effectiveModeOverride);

  return (
    <>
      {shellMode.showDemoBanner ? (
        <div className={styles.banner} role="status" aria-live="polite">
          <div className={styles.bannerInner}>
            <span className={styles.bannerBadge}>Demo</span>
            <span className={styles.bannerText}>{shellMode.bannerText}</span>
          </div>
        </div>
      ) : null}
      <NavigationClient
        displayName={getSessionDisplayName(session?.user)}
        isAuthenticated={Boolean(session)}
        currentMode={shellMode.mode}
      />
    </>
  );
}
