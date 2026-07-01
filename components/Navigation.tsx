"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navigation.module.css";

const navItems = [
  { href: "/", label: "Summary" },
  { href: "/whatsapp", label: "WhatsApp" },
  { href: "/emails", label: "Emails" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.inner}>
        <span className={styles.brand}>Comms Dashboard</span>
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
      </div>
    </nav>
  );
}
