import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import {
  formatDashboardDateTime,
  readDashboardSnapshot,
} from "@/lib/dashboard-data";
import type { CommunicationStatus } from "@/lib/dashboard-types";
import styles from "../page.module.css";

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

export default async function WhatsAppPage() {
  await requireAuthenticatedPageSession("/whatsapp");
  const { snapshot, mode } = await readDashboardSnapshot();
  const items = snapshot.items
    .filter((item) => item.source === "whatsapp")
    .sort((a, b) => {
      const ta = new Date(a.updatedAt ?? 0).getTime();
      const tb = new Date(b.updatedAt ?? 0).getTime();
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>WhatsApp</h1>
        <p className={styles.subtitle}>
          {items.length} monitored threads · {mode === "blob" ? "server snapshot" : "fictional fixture fallback"}
        </p>
      </header>

      <ul className={styles.detailList} role="list">
        {items.map((item) => (
          <li key={item.id} className={styles.detailItem}>
            <div className={styles.detailTop}>
              <span className={styles.detailFrom}>{item.displayName ?? "WhatsApp contact"}</span>
              <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                {statusLabels[item.status]}
              </span>
            </div>

            <p className={styles.detailSubject}>{item.title}</p>
            <p className={styles.detailBody}>{item.context}</p>

            <div className={styles.detailMeta}>
              {item.updatedAt && <span>Updated · {formatDashboardDateTime(item.updatedAt)}</span>}
              {item.dueAt && <span>Due · {formatDashboardDateTime(item.dueAt)}</span>}
              {item.recommendedAction && <span>Next step · {item.recommendedAction}</span>}
            </div>

            {item.metadata && (
              <div className={styles.labels}>
                {Object.entries(item.metadata)
                  .filter(([, value]) => value !== null)
                  .map(([key, value]) => (
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
