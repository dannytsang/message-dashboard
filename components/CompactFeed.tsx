"use client";

import { useRef } from "react";
import type { CommunicationItem } from "@/lib/dashboard-types";
import styles from "@/app/page.module.css";

export interface CompactFeedProps {
  items: CommunicationItem[];
  selectedId: string | null;
  onSelect: (item: CommunicationItem | null) => void;
  /** aria-label for the listbox region */
  label: string;
}

/**
 * Derive a safe user-facing label for a row's received/occurred timestamp.
 * Returns null when no valid timestamp is available.
 */
function receivedDateLabel(item: CommunicationItem): string | null {
  if (!item.receivedAt) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(item.receivedAt));
  } catch {
    return null;
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

export default function CompactFeed({
  items,
  selectedId,
  onSelect,
  label,
}: CompactFeedProps) {
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (items.length === 0) {
    return null;
  }

  const selectedIndex = selectedId
    ? items.findIndex((item) => item.id === selectedId)
    : -1;

  const focusRow = (index: number) => {
    rowRefs.current[index]?.focus();
  };

  return (
    <ul role="listbox" aria-label={label} className={styles.compactList}>
      {items.map((item, index) => {
        const isSelected = item.id === selectedId;
        const isTabStop = isSelected || (selectedIndex === -1 && index === 0);
        const dateLabel = receivedDateLabel(item);

        return (
          <li key={item.id} className={styles.compactRowItem} role="presentation">
            <button
              ref={(node) => {
                rowRefs.current[index] = node;
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={isTabStop ? 0 : -1}
              className={`${styles.compactRowButton} ${isSelected ? styles.compactRowSelected : ""}`}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const nextIndex = index < items.length - 1 ? index + 1 : 0;
                  onSelect(items[nextIndex]);
                  focusRow(nextIndex);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  const prevIndex = index > 0 ? index - 1 : items.length - 1;
                  onSelect(items[prevIndex]);
                  focusRow(prevIndex);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onSelect(null);
                }
              }}
            >
              <span
                className={`${styles.platform} ${item.source === "whatsapp" ? styles.wa : styles.em}`}
                aria-hidden="true"
              >
                {item.source === "whatsapp" ? "WA" : "EM"}
              </span>

              <span className={styles.compactRowBody}>
                <span className={styles.compactRowTitle}>{item.title}</span>
                <span className={styles.compactRowMeta}>
                  {item.source === "whatsapp" ? "WhatsApp" : "Email"}
                  <span aria-hidden="true">·</span>
                  <span className={`${styles.statusBadge} ${statusClass(item.status)}`}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                </span>
              </span>

              <span className={styles.compactRowDate} aria-label="Received">
                {dateLabel ?? "Date unavailable"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
