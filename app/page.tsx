import {
  whatsappFixtures,
  emailFixtures,
  statusLabel,
} from "@/lib/fixtures";
import styles from "./page.module.css";

export default function SummaryPage() {
  // Interleave and sort by timestamp descending
  type UnifiedItem =
    | { kind: "whatsapp"; id: string; from: string; body: string; timestamp: string; relativeLabel: string; status: string; conversation: string }
    | { kind: "email"; id: string; from: string; subject: string; snippet: string; timestamp: string; relativeLabel: string; status: string };

  const items: UnifiedItem[] = [
    ...whatsappFixtures.map((m) => ({
      kind: "whatsapp" as const,
      id: m.id,
      from: m.fromName,
      body: m.body,
      timestamp: m.timestamp,
      relativeLabel: m.relativeLabel,
      status: m.status,
      conversation: m.conversation,
    })),
    ...emailFixtures.map((m) => ({
      kind: "email" as const,
      id: m.id,
      from: m.from,
      subject: m.subject,
      snippet: m.snippet,
      timestamp: m.timestamp,
      relativeLabel: m.relativeLabel,
      status: m.status,
    })),
  ].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>All Messages</h1>
        <p className={styles.subtitle}>
          {items.length} items across WhatsApp and email
        </p>
      </header>

      <ul className={styles.list} role="list">
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemTop}>
              <span
                className={`${styles.platform} ${
                  item.kind === "whatsapp" ? styles.wa : styles.em
                }`}
              >
                {item.kind === "whatsapp" ? "WhatsApp" : "Email"}
              </span>
              <span
                className={`${styles.statusBadge} ${styles[item.status.replace("-", "_")]}`}
              >
                {statusLabel(item.status as Parameters<typeof statusLabel>[0])}
              </span>
            </div>

            <p className={styles.itemFrom}>
              {item.kind === "whatsapp"
                ? (item as { kind: "whatsapp"; from: string; conversation: string }).from
                : (item as { kind: "email"; from: string }).from}
            </p>

            <p className={styles.itemSubject}>
              {item.kind === "whatsapp"
                ? (item as { kind: "whatsapp"; body: string }).body
                : (item as { kind: "email"; subject: string }).subject}
            </p>

            {item.kind === "whatsapp" && (
              <p className={styles.meta}>
                {(item as { kind: "whatsapp"; conversation: string }).conversation}
                {" · "}
                {item.relativeLabel}
              </p>
            )}
            {item.kind === "email" && (
              <p className={styles.meta}>
                {(item as { kind: "email"; snippet: string }).snippet.slice(0, 80)}
                …
                {" · "}
                {item.relativeLabel}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
