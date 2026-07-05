"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SessionSurface from "./SessionSurface";
import styles from "./Navigation.module.css";

const navItems = [
  { href: "/", label: "Summary" },
  { href: "/whatsapp", label: "WhatsApp" },
  { href: "/emails", label: "Emails" },
];

interface NavigationClientProps {
  displayName: string;
  isAuthenticated: boolean;
  /** Current effective mode for this user, injected by the server component. */
  currentMode: "live" | "demo";
}

export default function NavigationClient({
  displayName,
  isAuthenticated,
  currentMode,
}: NavigationClientProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/auth/")) {
    return null;
  }

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.inner}>
        <span className={styles.brand}>Comms Dashboard</span>
        <div className={styles.right}>
          <ul className={styles.links} role="list">
            {navItems.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`${styles.link} ${isActive ? styles.active : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={styles.sessionActions}>
            <SessionSurface
              displayName={displayName}
              signOutEnabled={isAuthenticated}
              currentMode={currentMode}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
