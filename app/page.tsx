import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import {
  formatDashboardDateTime,
  readDashboardSnapshot,
} from "@/lib/dashboard-data";
import type {
  CommunicationItem,
  CommunicationStatus,
} from "@/lib/dashboard-types";
import styles from "./page.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusLabels: Record<CommunicationStatus, string> = {
  open: "Open",
  reminded: "Reminded",
  draft_awaiting_approval: "Draft awaiting approval",
  uncertain_needs_review: "Needs review",
  resolved: "Resolved",
  resolved_by_history: "Resolved by history",
  dismissed: "Dismissed",
  suppressed: "Suppressed",
};

function metadataEntries(item: CommunicationItem) {
  return Object.entries(item.metadata ?? {}).filter(([, value]) => value !== null);
}

export default async function SummaryPage() {
  await requireAuthenticatedPageSession("/");
  const { snapshot, mode } = await readDashboardSnapshot();
  const items = [...snapshot.items].sort((a, b) => {
    const ta = new Date(a.updatedAt ?? 0).getTime();
    const tb = new Date(b.updatedAt ?? 0).getTime();
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Summary</h1>
        <p className={styles.subtitle}>
          {items.length} communication items across WhatsApp and email · {mode === "blob" ? "server snapshot" : "fictional fixture fallback"}
        </p>
      </header>

      <section className={styles.statBar} aria-label="Communication summary stats">
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{snapshot.summary?.sourceCounts.whatsapp ?? 0}</strong> WhatsApp
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{snapshot.summary?.sourceCounts.email ?? 0}</strong> Email
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{snapshot.summary?.openCount ?? 0}</strong> Open
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{snapshot.summary?.reviewCount ?? 0}</strong> Needs review
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{snapshot.summary?.draftCount ?? 0}</strong> Drafts awaiting approval
          </span>
        </div>
      </section>

      <ul className={styles.list} role="list">
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemTop}>
              <span
                className={`${styles.platform} ${
                  item.source === "whatsapp" ? styles.wa : styles.em
                }`}
              >
                {item.source === "whatsapp" ? "WhatsApp" : "Email"}
              </span>
              <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                {statusLabels[item.status]}
              </span>
            </div>

            <h2 className={styles.itemTitle}>{item.title}</h2>
            <p className={styles.itemContext}>{item.context}</p>

            <dl className={styles.metaGrid}>
              {item.displayName && (
                <>
                  <dt>From</dt>
                  <dd>{item.displayName}</dd>
                </>
              )}
              {item.updatedAt && (
                <>
                  <dt>Updated</dt>
                  <dd>{formatDashboardDateTime(item.updatedAt)}</dd>
                </>
              )}
              {item.dueAt && (
                <>
                  <dt>Due</dt>
                  <dd>{formatDashboardDateTime(item.dueAt)}</dd>
                </>
              )}
              {item.recommendedAction && (
                <>
                  <dt>Next step</dt>
                  <dd>{item.recommendedAction}</dd>
                </>
              )}
            </dl>

            {metadataEntries(item).length > 0 && (
              <div className={styles.labels}>
                {metadataEntries(item).map(([key, value]) => (
                  <span key={key} className={styles.label}>
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}: {String(value)}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
