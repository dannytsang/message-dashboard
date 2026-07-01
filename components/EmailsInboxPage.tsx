"use client";

import { useMemo, useState } from "react";
import type { EmailInboxDisplayItem } from "@/lib/dashboard-types";
import styles from "@/app/emails/emails.module.css";

type SortMode = "latest-received" | "subject-a-z";

interface EmailsInboxPageProps {
  items: EmailInboxDisplayItem[];
  dataMode: "blob" | "fixture-fallback";
}

function searchHaystack(item: EmailInboxDisplayItem): string {
  return [
    item.subject,
    item.receivedLabel,
    item.receivedDate,
    item.receivedTime,
    item.labels.join(" "),
    item.identifiedAction?.state ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export default function EmailsInboxPage({
  items,
  dataMode,
}: EmailsInboxPageProps) {
  const [query, setQuery] = useState("");
  const [actionOnly, setActionOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("latest-received");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = items;

    if (actionOnly) {
      rows = rows.filter((row) => row.identifiedAction != null);
    }

    if (q) {
      rows = rows.filter((row) => searchHaystack(row).includes(q));
    }

    if (sort === "latest-received") {
      rows = [...rows].sort((a, b) => {
        const ta = new Date(a.receivedDateTime).getTime();
        const tb = new Date(b.receivedDateTime).getTime();
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        if (tb !== ta) return tb - ta;
        return a.id.localeCompare(b.id, "en", { sensitivity: "base" });
      });
    } else {
      rows = [...rows].sort((a, b) => {
        const subjectComparison = a.subject.localeCompare(b.subject, "en", {
          sensitivity: "base",
        });
        if (subjectComparison !== 0) return subjectComparison;

        const ta = new Date(b.receivedDateTime).getTime();
        const tb = new Date(a.receivedDateTime).getTime();
        if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) {
          return ta - tb;
        }

        return a.id.localeCompare(b.id, "en", { sensitivity: "base" });
      });
    }

    return rows;
  }, [actionOnly, items, query, sort]);

  const hasActiveFilters =
    query.trim() !== "" || actionOnly || sort !== "latest-received";

  function clearFilters() {
    setQuery("");
    setActionOnly(false);
    setSort("latest-received");
  }

  const subtitle =
    items.length === 0
      ? "No inbox data"
      : `${items.length} inbox item${items.length === 1 ? "" : "s"} · ${
          dataMode === "blob" ? "server snapshot" : "fictional fixture fallback"
        }`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Email inbox</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      <div className={styles.controls}>
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
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search emails"
          />
        </div>

        <div className={styles.sortWrap}>
          <label className={styles.sortLabel} htmlFor="email-sort">
            Sort
          </label>
          <select
            id="email-sort"
            className={styles.sortSelect}
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
          >
            <option value="latest-received">Latest received</option>
            <option value="subject-a-z">Subject A–Z</option>
          </select>
        </div>

        <div className={styles.actionToggle}>
          <button
            type="button"
            className={`${styles.actionBtn} ${actionOnly ? styles.actionBtnActive : ""}`}
            onClick={() => setActionOnly((value) => !value)}
            aria-pressed={actionOnly}
          >
            <span aria-hidden="true">⚡</span>
            Action only
          </button>
        </div>

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

      {items.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <span className={styles.emptyIcon} aria-hidden="true">
            📭
          </span>
          <p className={styles.emptyTitle}>No inbox data</p>
          <p className={styles.emptyBody}>
            Inbox items will appear here once the server-side email snapshot is connected.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <span className={styles.emptyIcon} aria-hidden="true">
            🔎
          </span>
          <p className={styles.emptyTitle}>No matching emails</p>
          <p className={styles.emptyBody}>
            Try clearing filters or broadening the search terms used for this inbox view.
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

function EmailRow({ item }: { item: EmailInboxDisplayItem }) {
  const actionState = item.identifiedAction?.state;

  return (
    <li className={styles.inboxRow}>
      <div className={styles.rowDate}>
        <span className={styles.rowDateLabel}>{item.receivedLabel}</span>
        <time className={styles.rowTime} dateTime={item.receivedDateTime}>
          {item.receivedTime}
        </time>
      </div>

      <div className={styles.rowLabels}>
        {item.labels.map((label) => (
          <span key={label} className={styles.labelChip}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.rowSubject}>
        <span className={styles.rowSubjectText}>{item.subject}</span>
        {actionState && (
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
