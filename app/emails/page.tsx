"use client";

import { useState, useMemo } from "react";
import { emailInboxFixtures } from "@/lib/email-fixtures";
import styles from "./emails.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionState = "proposed" | "confirmed";

export interface EmailInboxItem {
  id: string;
  /** ISO 8601 received timestamp */
  receivedDateTime: string;
  /** Display-ready received label, e.g. "Today" or "Yesterday" */
  receivedLabel: string;
  /** Display-ready received time, e.g. "14:32" */
  receivedTime: string;
  /** Display-ready received date, e.g. "30 Jun 2026" */
  receivedDate: string;
  /** Folder or label chips — safe dashboard labels only */
  labels: string[];
  /** Primary subject line */
  subject: string;
  /**
   * Action identified by the email monitor.
   * undefined / absent means no action identified.
   */
  identifiedAction?: {
    state: ActionState;
  };
}

// ── Sort modes ────────────────────────────────────────────────────────────────

type SortMode = "latest-received" | "subject-a-z";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns combined searchable text for a row (lower-case, whitespace-normalised) */
function searchHaystack(item: EmailInboxItem): string {
  const parts = [
    item.subject,
    item.receivedLabel,
    item.receivedDate,
    item.receivedTime,
    item.labels.join(" "),
    item.identifiedAction?.state ?? "",
  ];
  return parts.join(" ").toLowerCase();
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EmailsPage() {
  const [query, setQuery] = useState("");
  const [actionOnly, setActionOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("latest-received");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let rows: EmailInboxItem[] = emailInboxFixtures;

    // ── Filter: action-only ──────────────────────────────────────────────────
    if (actionOnly) {
      rows = rows.filter((r) => r.identifiedAction != null);
    }

    // ── Filter: search ──────────────────────────────────────────────────────
    if (q) {
      rows = rows.filter((r) => searchHaystack(r).includes(q));
    }

    // ── Sort ───────────────────────────────────────────────────────────────
    if (sort === "latest-received") {
      rows = [...rows].sort((a, b) => {
        const ta = new Date(a.receivedDateTime).getTime();
        const tb = new Date(b.receivedDateTime).getTime();
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        return tb - ta;
      });
    } else if (sort === "subject-a-z") {
      rows = [...rows].sort((a, b) =>
        a.subject.localeCompare(b.subject, "en", { sensitivity: "base" })
      );
    }

    return rows;
  }, [query, actionOnly, sort]);

  function clearFilters() {
    setQuery("");
    setActionOnly(false);
    setSort("latest-received");
  }

  const hasActiveFilters =
    query.trim() !== "" || actionOnly || sort !== "latest-received";

  return (
    <main className={styles.page}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <h1 className={styles.title}>Email inbox</h1>
        <p className={styles.subtitle}>No messages</p>
      </header>

      {/* ── Controls (always rendered — structure-first, data-out) ──── */}
      <div className={styles.controls}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search subject, label, action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search emails"
          />
        </div>

        {/* Sort */}
        <div className={styles.sortWrap}>
          <label className={styles.sortLabel} htmlFor="email-sort">
            Sort
          </label>
          <select
            id="email-sort"
            className={styles.sortSelect}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            <option value="latest-received">Latest received</option>
            <option value="subject-a-z">Subject A–Z</option>
          </select>
        </div>

        {/* Action-only toggle */}
        <div className={styles.actionToggle}>
          <button
            type="button"
            className={`${styles.actionBtn} ${actionOnly ? styles.actionBtnActive : ""}`}
            onClick={() => setActionOnly((v) => !v)}
            aria-pressed={actionOnly}
          >
            <span aria-hidden="true">⚡</span>
            Action only
          </button>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <span className={styles.emptyIcon} aria-hidden="true">📭</span>
          <p className={styles.emptyTitle}>No inbox data</p>
          <p className={styles.emptyBody}>
            Inbox items will appear here once the email monitor is connected.
          </p>
        </div>
      ) : (
        <ul className={styles.inboxList} role="list">
          {filtered.map((item) => (
            <EmailRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}

// ── Email row ────────────────────────────────────────────────────────────────

function EmailRow({ item }: { item: EmailInboxItem }) {
  const hasAction = item.identifiedAction != null;
  const actionState = item.identifiedAction?.state;

  return (
    <li className={styles.inboxRow}>
      {/* Received date/time */}
      <div className={styles.rowDate}>
        <span className={styles.rowDateLabel}>{item.receivedLabel}</span>
        <time
          className={styles.rowTime}
          dateTime={item.receivedDateTime}
        >
          {item.receivedTime}
        </time>
      </div>

      {/* Labels */}
      <div className={styles.rowLabels}>
        {item.labels.map((label) => (
          <span key={label} className={styles.labelChip}>
            {label}
          </span>
        ))}
      </div>

      {/* Subject + action indicator */}
      <div className={styles.rowSubject}>
        <span className={styles.rowSubjectText}>{item.subject}</span>
        {hasAction && (
          <div className={styles.rowAction}>
            <span className={styles.actionEmoji} aria-hidden="true">
              ⚡
            </span>
            <span
              className={`${styles.actionBadge} ${
                actionState === "confirmed"
                  ? styles.actionBadgeConfirmed
                  : styles.actionBadgeProposed
              }`}
            >
              {actionState === "confirmed" ? "Confirmed" : "Proposed"}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
