"use client";

import Image from "next/image";
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
}

export default function NavigationClient({
  displayName,
  isAuthenticated,
}: NavigationClientProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/auth/")) {
    return null;
  }

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.inner}>
        <span className={styles.brand}>
          <Image
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            width={22}
            height={22}
            className={styles.brandIcon}
          />
          <span>Comms Dashboard</span>
        </span>
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
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
