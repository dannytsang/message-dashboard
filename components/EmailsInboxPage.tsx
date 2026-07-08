"use client";

import { useMemo, useState } from "react";
import type { EmailInboxDisplayItem } from "@/lib/dashboard-types";
import styles from "@/app/emails/emails.module.css";

type SortMode = "latest-received" | "subject-a-z";

interface EmailsInboxPageProps {
  items: EmailInboxDisplayItem[];
  dataMode: "live";
}

function searchHaystack(item: EmailInboxDisplayItem): string {
  const action = item.identifiedAction;
  return [
    item.subject,
    item.receivedLabel,
    item.receivedDate,
    item.receivedTime,
    item.labels.join(" "),
    action?.actionPhrase ?? "",
    action?.actionType ?? "",
    action?.state ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export default function EmailsInboxPage({
  items,
  dataMode,
}: EmailsInboxPageProps) {
  const [query, setQuery] = useState("");
  const [actionOnly, setActionOnly] = useState(true);
  const [sort, setSort] = useState<SortMode>("latest-received");
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);

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
    query.trim() !== "" || !actionOnly || sort !== "latest-received";

  const selectedItem = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  function clearFilters() {
    setQuery("");
    setActionOnly(true);
    setSort("latest-received");
  }

  const subtitle =
    items.length === 0
      ? "No inbox data"
      : `${items.length} inbox item${items.length === 1 ? "" : "s"} · server snapshot`;

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
        <div className={styles.emailWorkspace}>
          <ul className={styles.inboxList} role="list" aria-label="Email inbox">
            {filtered.map((item) => (
              <EmailRow
                key={item.id}
                item={item}
                isSelected={item.id === selectedItem?.id}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </ul>
          <EmailDetailPane item={selectedItem} />
        </div>
      )}
    </main>
  );
}

function EmailRow({
  item,
  isSelected,
  onSelect,
}: {
  item: EmailInboxDisplayItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const action = item.identifiedAction;

  return (
    <li className={styles.inboxRow}>
      <button
        type="button"
        className={`${styles.rowButton} ${isSelected ? styles.rowButtonSelected : ""}`}
        aria-pressed={isSelected}
        onClick={onSelect}
      >
        {/* Column 1: received date/time */}
        <div className={styles.rowDate}>
          <span className={styles.rowDateLabel}>{item.receivedLabel}</span>
          <time className={styles.rowTime} dateTime={item.receivedDateTime}>
            {item.receivedTime}
          </time>
        </div>

        {/* Column 2: labels */}
        <div className={styles.rowLabels}>
          {item.labels.map((label) => (
            <span key={label} className={styles.labelChip}>
              {label}
            </span>
          ))}
        </div>

        {/* Column 3: subject + action — Subject Priority A */}
        <div className={styles.rowSubjectArea}>
          <span className={styles.rowSubjectText}>{item.subject}</span>
          {action && (
            <div className={styles.rowActionArea}>
              {action.actionType && (
                <span className={styles.actionType}>{action.actionType}</span>
              )}
              <span className={styles.actionPhrase}>{action.actionPhrase}</span>
              <span
                className={`${styles.actionBadge} ${
                  action.state === "confirmed"
                    ? styles.actionBadgeConfirmed
                    : styles.actionBadgeProposed
                }`}
              >
                {action.state === "confirmed" ? "Confirmed" : "Proposed"}
              </span>
            </div>
          )}
        </div>
      </button>
    </li>
  );
}

function EmailDetailPane({ item }: { item: EmailInboxDisplayItem | null }) {
  if (!item) {
    return (
      <aside className={styles.detailPane} aria-live="polite">
        <p className={styles.detailEmptyTitle}>No email selected</p>
        <p className={styles.detailEmptyBody}>Select an email to review its content and action required.</p>
      </aside>
    );
  }

  const action = item.identifiedAction;

  return (
    <aside className={styles.detailPane} aria-live="polite" aria-label="Selected email detail">
      <div className={styles.detailHeader}>
        <span className={styles.detailSource}>Email</span>
        <time className={styles.detailTime} dateTime={item.receivedDateTime}>
          {item.receivedLabel} · {item.receivedTime}
        </time>
      </div>
      <h2 className={styles.detailSubject}>{item.subject}</h2>

      <div className={styles.detailLabels}>
        {item.labels.map((label) => (
          <span key={label} className={styles.labelChip}>
            {label}
          </span>
        ))}
      </div>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Action required</h3>
        {action ? (
          <div className={styles.detailActionCard}>
            <div className={styles.rowActionArea}>
              {action.actionType && <span className={styles.actionType}>{action.actionType}</span>}
              <span
                className={`${styles.actionBadge} ${
                  action.state === "confirmed"
                    ? styles.actionBadgeConfirmed
                    : styles.actionBadgeProposed
                }`}
              >
                {action.state === "confirmed" ? "Confirmed" : "Proposed"}
              </span>
            </div>
            <p className={styles.detailActionText}>{action.actionPhrase}</p>
          </div>
        ) : (
          <p className={styles.detailMuted}>No action identified for this email.</p>
        )}
      </section>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Email body</h3>
        <p className={styles.detailHint}>Full read-only body text from Gmail where available; long emails stay scrollable inside this pane.</p>
        <p className={styles.detailContent}>
          {item.detail?.contentExcerpt?.trim() || "No safe email excerpt is available for this item."}
        </p>
      </section>
    </aside>
  );
}
