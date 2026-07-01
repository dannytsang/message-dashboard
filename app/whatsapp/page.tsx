"use client";

import { whatsappFixtures, statusLabel } from "@/lib/fixtures";
import styles from "../page.module.css";

export default function WhatsAppPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>WhatsApp</h1>
        <p className={styles.subtitle}>
          {whatsappFixtures.length} conversations
        </p>
      </header>

      <ul className={styles.detailList} role="list">
        {whatsappFixtures.map((msg) => (
          <li key={msg.id} className={styles.detailItem}>
            <div className={styles.detailTop}>
              <span className={styles.detailFrom}>{msg.fromName}</span>
              <span
                className={`${styles.statusBadge} ${styles[msg.status.replace("-", "_")]}`}
              >
                {statusLabel(msg.status)}
              </span>
            </div>

            <p className={styles.conversation}>{msg.conversation}</p>

            <p className={styles.detailSubject}>{msg.body}</p>

            <p className={styles.detailMeta}>
              {msg.relativeLabel} · {msg.timeLabel}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
