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

// Safe placeholder identity — spec 002 (OIDC) is not yet implemented.
// When OIDC is added, pass the real display name via props or a session provider.
const PLACEHOLDER_DISPLAY_NAME = "Comms user";

export default function Navigation() {
  const pathname = usePathname();

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

          {/* Shell user area — session-actions slot per cross-dashboard pattern */}
          <div className={styles.sessionActions}>
            <SessionSurface displayName={PLACEHOLDER_DISPLAY_NAME} />
          </div>
        </div>
      </div>
    </nav>
  );
}
