"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState, useTransition } from "react";
import styles from "./UserMenu.module.css";

interface UserMenuProps {
  displayName: string;
  menuId: string;
  signOutEnabled: boolean;
  /** Current effective mode for this user, read from getShellModeState server-side. */
  currentMode?: "live" | "demo";
  onClose: () => void;
}

export default function UserMenu({
  displayName,
  menuId,
  signOutEnabled,
  currentMode,
  onClose,
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [currentTheme, setCurrentTheme] = useState("dark");
  const [isPending, startTransition] = useTransition();
  const [displayMode, setDisplayMode] = useState(currentMode ?? "live");

  useEffect(() => {
    try {
      setCurrentTheme(localStorage.getItem("theme") ?? "dark");
    } catch {
      setCurrentTheme("dark");
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onClose]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    setCurrentTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable in some environments — non-fatal
    }
    onClose();
  };

  const handleSignOut = async () => {
    onClose();
    await signOut({ callbackUrl: "/auth/signin" });
  };

  const effectiveMode = isPending ? displayMode : (currentMode ?? "live");

  const handleDemoModeToggle = () => {
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
        setDisplayMode(currentMode ?? "live");
      }
    });
  };

  return (
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      aria-label="Account menu"
      className={`${styles.menu} session-menu`}
    >
      <div className={styles.identityRow} role="presentation">
        <span className={styles.identityLabel}>Signed in as</span>
        <span className={styles.identityValue}>{displayName}</span>
      </div>

      <div className={styles.divider} role="presentation" />

      <button
        role="menuitem"
        className={`${styles.row} session-menu-item theme-toggle`}
        onClick={toggleTheme}
        aria-label={`Switch to ${currentTheme === "light" ? "dark" : "light"} theme`}
      >
        {currentTheme === "dark" ? (
          <svg
            className={styles.rowIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg
            className={styles.rowIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        <span className={styles.themeLabel}>
          {currentTheme === "light" ? "Dark mode" : "Light mode"}
        </span>
      </button>

      <button
        role="menuitem"
        className={`${styles.row} session-menu-item session-menu-item--debug`}
        disabled
        aria-disabled="true"
        title="Pending — available after private diagnostics are designed"
      >
        <svg
          className={styles.rowIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <span className={styles.rowLabel}>Debug</span>
      </button>

      {currentMode != null && (
        <button
          role="menuitem"
          className={`${styles.row} session-menu-item`}
          onClick={handleDemoModeToggle}
          aria-label={`Demo mode is ${effectiveMode}. Click to switch.`}
          title="Switch between real data and fictional demo data"
        >
          <svg
            className={styles.rowIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className={styles.rowLabel}>
            {effectiveMode === "live" ? "Demo mode" : "Live mode"}
          </span>
          <span className={styles.modeIndicator}>{effectiveMode === "live" ? "Off" : "On"}</span>
        </button>
      )}

      <div className={styles.divider} role="presentation" />

      <button
        role="menuitem"
        className={`${styles.row} session-menu-item session-menu-item--sign-out`}
        disabled={!signOutEnabled}
        aria-disabled={!signOutEnabled}
        title={signOutEnabled ? "Sign out" : "Unavailable until authentication is active"}
        onClick={handleSignOut}
      >
        <svg
          className={styles.rowIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className={styles.rowLabel}>Sign out</span>
      </button>
    </div>
  );
}
