"use client";

import type { CommunicationItem } from "@/lib/dashboard-types";
import styles from "@/app/page.module.css";

export interface DetailInspectorProps {
  item: CommunicationItem | null;
  /** Accessibility label for the live region */
  ariaLabel: string;
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

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function NeutralPanel() {
  return (
    <div className={styles.inspectorNeutral}>
      <div className={styles.inspectorNeutralIcon} aria-hidden="true">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className={styles.inspectorNeutralHeading}>No item selected</h2>
      <p className={styles.inspectorNeutralBody}>
        Select an item from the feed to see details, status, and suggested next
        step here.
      </p>
      <p className={styles.inspectorNeutralHint}>
        Use arrow keys to navigate the feed, or click any row.
      </p>
    </div>
  );
}

/** Arrow icon used in the review message card. */
function ArrowInboundIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function SelectedPanel({ item }: { item: CommunicationItem }) {
  const freshnessLabel = item.updatedAt ? formatTimestamp(item.updatedAt) : null;

  return (
    <div className={styles.inspectorSelected}>
      <div className={styles.inspectorHeader}>
        <span
          className={`${styles.platform} ${item.source === "whatsapp" ? styles.wa : styles.em}`}
        >
          {item.source === "whatsapp" ? "WhatsApp" : "Email"}
        </span>
        <span className={styles.inspectorStatus}>{statusLabel(item.status)}</span>
      </div>

      <h2 className={styles.inspectorTitle}>{item.title}</h2>

      <dl className={styles.inspectorFields}>
        <div className={styles.inspectorField}>
          <dt className={styles.inspectorDt}>Source</dt>
          <dd className={styles.inspectorDd}>{item.source === "whatsapp" ? "WhatsApp" : "Email"}</dd>
        </div>

        <div className={styles.inspectorField}>
          <dt className={styles.inspectorDt}>Status</dt>
          <dd className={styles.inspectorDd}>{statusLabel(item.status)}</dd>
        </div>

        {item.context && (
          <div className={styles.inspectorField}>
            <dt className={styles.inspectorDt}>Context</dt>
            <dd className={styles.inspectorDd}>{item.context}</dd>
          </div>
        )}

        {item.recommendedAction && (
          <div className={styles.inspectorField}>
            <dt className={styles.inspectorDt}>Suggested next step</dt>
            <dd className={styles.inspectorDd}>{item.recommendedAction}</dd>
          </div>
        )}

        {freshnessLabel && (
          <div className={styles.inspectorField}>
            <dt className={styles.inspectorDt}>Freshness</dt>
            <dd className={styles.inspectorDd}>{freshnessLabel}</dd>
          </div>
        )}

        {item.reviewMessageExcerpt && (
          <div className={styles.inspectorField}>
            <dt className={styles.inspectorDt}>Message requiring review</dt>
            <dd className={styles.inspectorDd}>
              <ReviewMessageCard excerpt={item.reviewMessageExcerpt} />
            </dd>
          </div>
        )}
      </dl>

      <div className={styles.inspectorNav}>
        {item.source === "whatsapp" && (
          <a href="/whatsapp" className={styles.inspectorNavLink}>
            Open /whatsapp
          </a>
        )}
        {item.source === "email" && (
          <a href="/emails" className={styles.inspectorNavLink}>
            Open /emails
          </a>
        )}
      </div>
    </div>
  );
}

/** Renders a single inbound message excerpt inside the detail inspector. */
function ReviewMessageCard({ excerpt }: { excerpt: NonNullable<CommunicationItem["reviewMessageExcerpt"]> }) {
  return (
    <div className={styles.reviewMessageCard}>
      <div className={styles.reviewMessageMeta}>
        <ArrowInboundIcon />
        <span className={styles.reviewMessageAuthor}>{excerpt.author}</span>
        <span className={styles.reviewMessageTime}>{excerpt.sentLabel}</span>
      </div>
      <p className={styles.reviewMessageBody}>{excerpt.body}</p>
    </div>
  );
}

export default function DetailInspector({
  item,
  ariaLabel,
}: DetailInspectorProps) {
  return (
    <aside
      className={styles.inspector}
      aria-label={ariaLabel}
      aria-live="polite"
      aria-atomic="true"
      role="region"
    >
      {item === null ? <NeutralPanel /> : <SelectedPanel item={item} />}
    </aside>
  );
}
