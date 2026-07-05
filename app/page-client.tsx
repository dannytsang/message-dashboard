"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { CommunicationItem, CommunicationSource } from "@/lib/dashboard-types";
import styles from "@/app/page.module.css";

export type StatFilter =
  | "all"
  | "whatsapp"
  | "email"
  | "open"
  | "needs-review";

interface PageClientProps {
  allItems: CommunicationItem[];
  whatsappCount: number;
  emailCount: number;
  openCount: number;
  needsReviewCount: number;
  whatsappTimestamp?: string;
  emailTimestamp?: string;
  whatsappWarning?: string;
  emailWarning?: string;
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "open":
      return styles.open;
    case "reminded":
      return styles.reminded;
    case "draft_awaiting_approval":
      return styles.draft_awaiting_approval;
    case "uncertain_needs_review":
      return styles.uncertain_needs_review;
    case "resolved":
      return styles.resolved;
    case "resolved_by_history":
      return styles.resolved_by_history;
    case "dismissed":
      return styles.dismissed;
    case "suppressed":
      return styles.suppressed;
    default:
      return "";
  }
}

export default function PageClient({
  allItems,
  whatsappCount,
  emailCount,
  openCount,
  needsReviewCount,
  whatsappTimestamp,
  emailTimestamp,
  whatsappWarning,
  emailWarning,
}: PageClientProps) {
  const [filter, setFilter] = useState<StatFilter>("all");

  const filteredItems = useMemo(() => {
    switch (filter) {
      case "whatsapp":
        return allItems.filter((item) => item.source === "whatsapp");
      case "email":
        return allItems.filter((item) => item.source === "email");
      case "open":
        return allItems.filter((item) => item.status === "open");
      case "needs-review":
        return allItems.filter(
          (item) => item.status === "uncertain_needs_review",
        );
      default:
        return allItems;
    }
  }, [filter, allItems]);

  const totalCount = allItems.length;
  const filteredCount = filteredItems.length;
  const isFiltered = filter !== "all";

  const filterLabel =
    filter === "all"
      ? `${totalCount} item${totalCount !== 1 ? "s" : ""}`
      : `${filteredCount} of ${totalCount} items`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Communication dashboard</h1>
        <p className={styles.subtitle}>
          Monitor follow-ups and action items across WhatsApp and email.
        </p>
      </header>

      {/* ── Stat filter bar ─────────────────────────────────────────────── */}
      <div className={styles.statBar} role="group" aria-label="Filter by">
        <button
          type="button"
          className={`${styles.statButton} ${filter === "all" ? styles.statButtonActive : ""}`}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          <span className={styles.statDot} aria-hidden="true" />
          <strong>{totalCount}</strong> All
        </button>

        <button
          type="button"
          className={`${styles.statButton} ${filter === "whatsapp" ? styles.statButtonActive : ""}`}
          onClick={() => setFilter("whatsapp")}
          aria-pressed={filter === "whatsapp"}
        >
          <span className={`${styles.statDot} ${styles.waDot}`} aria-hidden="true" />
          <strong>{whatsappCount}</strong> WhatsApp
        </button>

        <button
          type="button"
          className={`${styles.statButton} ${filter === "email" ? styles.statButtonActive : ""}`}
          onClick={() => setFilter("email")}
          aria-pressed={filter === "email"}
        >
          <span className={`${styles.statDot} ${styles.emDot}`} aria-hidden="true" />
          <strong>{emailCount}</strong> Email
        </button>

        <button
          type="button"
          className={`${styles.statButton} ${filter === "open" ? styles.statButtonActive : ""}`}
          onClick={() => setFilter("open")}
          aria-pressed={filter === "open"}
        >
          <strong>{openCount}</strong> Open
        </button>

        <button
          type="button"
          className={`${styles.statButton} ${filter === "needs-review" ? styles.statButtonActive : ""}`}
          onClick={() => setFilter("needs-review")}
          aria-pressed={filter === "needs-review"}
        >
          <strong>{needsReviewCount}</strong> Needs review
        </button>
      </div>

      {/* ── Filter context label ─────────────────────────────────────────── */}
      {isFiltered && (
        <p className={styles.filterLabel} role="status" aria-live="polite">
          {filterLabel}
          <button
            type="button"
            className={styles.filterClearBtn}
            onClick={() => setFilter("all")}
          >
            Clear filter
          </button>
        </p>
      )}

      {/* ── Source-level warnings / partial availability ────────────────── */}
      {whatsappWarning && (
        <div className={styles.sourceWarning} role="alert">
          <span className={styles.sourceWarningIcon} aria-hidden="true">
            ⚠️
          </span>
          <div>
            <strong>WhatsApp</strong>
            <p className={styles.sourceWarningText}>{whatsappWarning}</p>
          </div>
        </div>
      )}
      {emailWarning && (
        <div className={styles.sourceWarning} role="alert">
          <span className={styles.sourceWarningIcon} aria-hidden="true">
            ⚠️
          </span>
          <div>
            <strong>Email</strong>
            <p className={styles.sourceWarningText}>{emailWarning}</p>
          </div>
        </div>
      )}

      {/* ── Item list ────────────────────────────────────────────────────── */}
      {filteredItems.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <span className={styles.emptyIcon} aria-hidden="true">
            {isFiltered ? "🔎" : "📭"}
          </span>
          <p className={styles.emptyTitle}>
            {isFiltered ? "No matching items" : "No items"}
          </p>
          <p className={styles.emptyBody}>
            {isFiltered
              ? "Try a different filter or clear it to see all items."
              : "Items will appear here once sources are connected."}
          </p>
          {isFiltered && (
            <button
              type="button"
              className={styles.filterClearBtn}
              onClick={() => setFilter("all")}
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <ul className={styles.list} role="list">
          {filteredItems.map((item) => (
            <li key={item.id} className={styles.item}>
              <div className={styles.itemTop}>
                <span
                  className={`${styles.platform} ${
                    item.source === "whatsapp" ? styles.wa : styles.em
                  }`}
                >
                  {item.source === "whatsapp" ? "WhatsApp" : "Email"}
                </span>
                <span className={`${styles.statusBadge} ${statusClass(item.status)}`}>
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className={styles.itemTitle}>{item.title}</p>
              <p className={styles.itemContext}>{item.context}</p>
              {item.source === "whatsapp" && (
                <div className={styles.itemLinks}>
                  <Link href="/whatsapp" className={styles.itemLink}>
                    View WhatsApp
                  </Link>
                </div>
              )}
              {item.source === "email" && (
                <div className={styles.itemLinks}>
                  <Link href="/emails" className={styles.itemLink}>
                    View email
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Source freshness indicators ─────────────────────────────────── */}
      {(whatsappTimestamp || emailTimestamp) && (
        <footer className={styles.freshnessFooter}>
          {whatsappTimestamp && (
            <span className={styles.freshness}>
              WhatsApp data: {formatTimestamp(whatsappTimestamp)}
            </span>
          )}
          {emailTimestamp && (
            <span className={styles.freshness}>
              Email data: {formatTimestamp(emailTimestamp)}
            </span>
          )}
        </footer>
      )}
    </main>
  );
}
