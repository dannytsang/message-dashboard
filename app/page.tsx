import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import {
  readDashboardSnapshot,
  readWhatsAppDashboardData,
  readEmailSourceSnapshot,
  type EmailSourceSnapshot,
} from "@/lib/dashboard-data";
import { formatDashboardDateTime } from "@/lib/dashboard-format";
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

  // Independently read both sources (spec 007/008 FR-002, FR-003)
  const [dashboardResult, whatsappResult, emailResult] = await Promise.all([
    readDashboardSnapshot(),
    readWhatsAppDashboardData(),
    readEmailSourceSnapshot(),
  ]);

  const { snapshot: dashboardSnapshot, mode: dashboardMode } = dashboardResult;
  const { snapshot: whatsappSnapshot, mode: whatsappMode, warning: whatsappWarning } = whatsappResult;
  const { snapshot: emailSnapshot, mode: emailMode, warning: emailWarning } = emailResult;

  // Merge items from available real sources. If no real source is available at all,
  // fall back to the legacy combined dashboard fixtures for local/demo safety.
  const mergedItems: CommunicationItem[] = [];
  const hasRealSource = emailMode === "blob" || whatsappMode === "blob" || dashboardMode === "blob";

  if (!hasRealSource && dashboardSnapshot) {
    mergedItems.push(...dashboardSnapshot.items);
  }

  // Items derived from WhatsApp source snapshot (spec 007)
  if (whatsappMode === "blob" && whatsappSnapshot) {
    for (const conv of whatsappSnapshot.monitored) {
      mergedItems.push({
        id: conv.id,
        source: "whatsapp",
        status: "open",
        title: conv.displayName,
        context: conv.lastMessageSummary,
        updatedAt: conv.lastMessageAt,
      });
    }
  }

  // Items derived from email source snapshot (specs 007/008)
  if (emailMode === "blob" && emailSnapshot) {
    for (const item of emailSnapshot.items) {
      // Build a safe dashboard summary from the real email data:
      // - action phrase as the primary context line when present
      // - receivedDateTime as updatedAt so the sort is by email recency
      // - labels folded into metadata alongside action state/type when available
      const actionContext = item.identifiedAction?.actionPhrase ?? null;
      const emailMetadata: Record<string, string | null> = {
        labels: item.labels.join(", "),
      };
      if (item.identifiedAction) {
        emailMetadata.actionState = item.identifiedAction.state;
        if (item.identifiedAction.actionType) {
          emailMetadata.actionType = item.identifiedAction.actionType;
        }
      }

      mergedItems.push({
        id: item.id,
        source: "email",
        status: item.identifiedAction?.state === "confirmed" ? "open" : "uncertain_needs_review",
        title: item.subject,
        context: actionContext ?? "",
        updatedAt: item.receivedDateTime,
        metadata: emailMetadata,
      });
    }
  }

  const sortedItems = [...mergedItems].sort((a, b) => {
    const ta = new Date(a.updatedAt ?? 0).getTime();
    const tb = new Date(b.updatedAt ?? 0).getTime();
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  const emailCount = sortedItems.filter((i) => i.source === "email").length;
  const whatsappCount = sortedItems.filter((i) => i.source === "whatsapp").length;
  const openCount = sortedItems.filter((i) => i.status === "open").length;
  const reviewCount = sortedItems.filter((i) => i.status === "uncertain_needs_review").length;

  const modeLabel =
    dashboardMode === "blob" || whatsappMode === "blob" || emailMode === "blob"
      ? "server snapshot"
      : "fictional fixture fallback";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Summary</h1>
        <p className={styles.subtitle}>
          {sortedItems.length} communication items across WhatsApp and email · {modeLabel}
        </p>
      </header>

      {whatsappWarning && (
        <p className={styles.warning} role="alert">
          WhatsApp: {whatsappWarning}
        </p>
      )}
      {emailWarning && (
        <p className={styles.warning} role="alert">
          Email: {emailWarning}
        </p>
      )}

      <section className={styles.statBar} aria-label="Communication summary stats">
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{whatsappCount}</strong> WhatsApp
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{emailCount}</strong> Email
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{openCount}</strong> Open
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statDot} aria-hidden="true" />
          <span>
            <strong>{reviewCount}</strong> Needs review
          </span>
        </div>
      </section>

      <ul className={styles.list} role="list">
        {sortedItems.map((item) => (
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
