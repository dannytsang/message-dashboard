"use client";

import { useState, useRef, useEffect } from "react";
import UserMenu from "./UserMenu";
import styles from "./SessionSurface.module.css";

interface SessionSurfaceProps {
  displayName: string;
  signOutEnabled?: boolean;
  /** Current effective mode for this user, injected by the server component. */
  currentMode?: "live" | "demo";
}

export default function SessionSurface({
  displayName,
  signOutEnabled = false,
  currentMode,
}: SessionSurfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = "session-user-menu";

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [isOpen]);

  return (
    <div className={styles.surface}>
      <button
        ref={triggerRef}
        className={`${styles.trigger} session-user session-user-trigger`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className={`${styles.label} session-user-label`}>{displayName}</span>
        <svg
          className={`${styles.caret} ${isOpen ? styles.caretOpen : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <UserMenu
          displayName={displayName}
          menuId={menuId}
          signOutEnabled={signOutEnabled}
          currentMode={currentMode}
          onClose={() => {
            setIsOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
