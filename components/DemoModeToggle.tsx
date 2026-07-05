"use client";

/**
 * Demo mode toggle — operator UI for switching between live and demo data.
 *
 * Appears in the shared navigation shell. The cookie is the authoritative
 * state; this component is the user-facing affordance for that server-side
 * override (spec 010 FR-003).
 *
 * Rendered only for authenticated users. Never shown in screenshots or
 * fixture descriptions as a public/demo affordance.
 */

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import styles from "./DemoModeToggle.module.css";

interface DemoModeToggleProps {
  /** Current effective mode for this user, read from getShellModeState server-side. */
  currentMode: "live" | "demo";
}

export default function DemoModeToggle({ currentMode }: DemoModeToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [displayMode, setDisplayMode] = useState(currentMode);

  // Keep the displayed state in sync with the server-projected value
  // whenever it changes (e.g. after a full-page navigation).
  const effectiveMode = isPending ? displayMode : currentMode;

  function handleToggle() {
    const nextMode: "live" | "demo" = effectiveMode === "live" ? "demo" : "live";

    startTransition(async () => {
      setDisplayMode(nextMode);
      try {
        await fetch("/api/dashboard/demo-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: nextMode }),
        });
      } catch {
        // On failure, revert to the server-projected mode on next render.
        setDisplayMode(currentMode);
      }
    });
  }

  return (
    <div className={styles.toggle} title="Switch between real data and fictional demo data">
      <button
        type="button"
        className={styles.button}
        onClick={handleToggle}
        aria-label={`Current mode: ${effectiveMode}. Click to switch.`}
      >
        Mode: <span className={styles.modeLabel}>{effectiveMode === "live" ? "Live" : "Demo"}</span>
      </button>
    </div>
  );
}
