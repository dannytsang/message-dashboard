"use client";

import { useEffect, useMemo, useState } from "react";
import CompactFeed from "@/components/CompactFeed";
import DetailInspector from "@/components/DetailInspector";
import type { CommunicationItem } from "@/lib/dashboard-types";
import styles from "@/app/page.module.css";

export type StatFilter =
  | "all"
  | "whatsapp"
  | "email"
  | "open"
  | "needs-review";

export type SortMode = "latest-received" | "oldest-received";

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

/**
 * Derive a stable received-at label for a CommunicationItem.
 * Returns null when no valid timestamp is available.
 */
function receivedDateLabel(item: CommunicationItem): string | null {
  if (!item.receivedAt) return null;
  try {
    return formatTimestamp(item.receivedAt);
  } catch {
    return null;
  }
}

/** Map a SortMode to a human-facing label for the active sort button. */
function sortLabel(mode: SortMode): string {
  switch (mode) {
    case "latest-received":
      return "Latest received";
    case "oldest-received":
      return "Oldest received";
  }
}

/**
 * Sort comparator for the Summary feed.
 * Items with a valid receivedAt come before those without.
 * Dated items sort by timestamp ascending or descending per mode.
 */
function compareItems(a: CommunicationItem, b: CommunicationItem, mode: SortMode): number {
  const aLabel = receivedDateLabel(a);
  const bLabel = receivedDateLabel(b);

  // Both undated — maintain original order
  if (!aLabel && !bLabel) return 0;
  // a undated, b dated — b comes first
  if (!aLabel) return 1;
  // a dated, b undated — a comes first
  if (!bLabel) return -1;

  const aTime = new Date(a.receivedAt!).getTime();
  const bTime = new Date(b.receivedAt!).getTime();
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;

  return mode === "latest-received" ? bTime - aTime : aTime - bTime;
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
  const [sortMode, setSortMode] = useState<SortMode>("latest-received");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. Apply statistic filter to derive the base visible set
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

  // 2. Apply sort to the filtered set
  const sortedFilteredItems = useMemo(
    () => [...filteredItems].sort((a, b) => compareItems(a, b, sortMode)),
    [filteredItems, sortMode],
  );

  const selectedItem = useMemo(
    () => sortedFilteredItems.find((item) => item.id === selectedId) ?? null,
    [sortedFilteredItems, selectedId],
  );

  // Reset selection when the selected item is no longer in the sorted+filtered set
  useEffect(() => {
    if (selectedId && !sortedFilteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [sortedFilteredItems, selectedId]);

  const totalCount = allItems.length;
  const filteredCount = sortedFilteredItems.length;
  const isFiltered = filter !== "all";

  const filterLabel =
    filter === "all"
      ? `${totalCount} item${totalCount !== 1 ? "s" : ""}`
      : `${filteredCount} of ${totalCount} items`;

  const handleSortChange = (newMode: SortMode) => {
    setSortMode(newMode);
    // Selection is preserved only if the selected row remains visible after re-sort;
    // the useEffect above handles the case where it disappears.
  };

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

      {/* ── Sort controls ────────────────────────────────────────────────── */}
      <div className={styles.sortBar} role="group" aria-label="Sort feed">
        <span className={styles.sortLabel} id="sort-label">
          Sort:
        </span>
        {(
          [
            ["latest-received", "Latest received"],
            ["oldest-received", "Oldest received"],
          ] as [SortMode, string][]
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={`${styles.sortButton} ${sortMode === mode ? styles.sortButtonActive : ""}`}
            onClick={() => handleSortChange(mode)}
            aria-pressed={sortMode === mode}
            aria-describedby="sort-label"
          >
            {label}
          </button>
        ))}
      </div>

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

      <section className={styles.summaryWorkspace} aria-label="Summary feed and inspector">
        <div className={styles.feedPanel}>
          {sortedFilteredItems.length === 0 ? (
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
            <CompactFeed
              items={sortedFilteredItems}
              selectedId={selectedId}
              onSelect={(item) => setSelectedId(item?.id ?? null)}
              label="Compact message feed"
            />
          )}
        </div>

        <div className={styles.inspectorPanel}>
          <DetailInspector
            item={selectedItem}
            ariaLabel={
              selectedItem
                ? `Selected item details for ${selectedItem.title}`
                : "Item detail inspector"
            }
          />
        </div>
      </section>

      {/* ── Source freshness indicators ──────────────────────────────────── */}
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
