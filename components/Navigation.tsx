/**
 * Shared navigation shell. Sign out remains the last item in the user menu.
 */
import NavigationClient from "@/components/NavigationClient";
import { getSessionDisplayName } from "@/lib/auth";
import { getOptionalServerSession } from "@/lib/auth-helpers";
import { getShellModeState } from "@/lib/site-mode";
import type { DashboardSiteMode } from "@/lib/site-mode";
import styles from "./Navigation.module.css";

interface NavigationProps {
  effectiveModeOverride?: DashboardSiteMode;
}

export default async function Navigation({ effectiveModeOverride }: NavigationProps) {
  const session = await getOptionalServerSession();
  const shellMode = getShellModeState();

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
      />
    </>
  );
}
