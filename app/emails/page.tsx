"use client";

import { emailFixtures, statusLabel } from "@/lib/fixtures";
import styles from "../page.module.css";

export default function EmailsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Emails</h1>
        <p className={styles.subtitle}>
          {emailFixtures.length} messages
        </p>
      </header>

      <ul className={styles.detailList} role="list">
        {emailFixtures.map((msg) => (
          <li key={msg.id} className={styles.detailItem}>
            <div className={styles.detailTop}>
              <span className={styles.detailFrom}>
                {msg.from}
                <span className={styles.detailMeta}> · {msg.fromAddress}</span>
              </span>
              <span
                className={`${styles.statusBadge} ${styles[msg.status.replace("-", "_")]}`}
              >
                {statusLabel(msg.status)}
              </span>
            </div>

            <p className={styles.detailSubject}>{msg.subject}</p>

            <p className={styles.detailBody}>{msg.snippet}</p>

            <div className={styles.detailTop}>
              <div className={styles.labels}>
                {msg.labels.map((label) => (
                  <span key={label} className={styles.label}>
                    {label}
                  </span>
                ))}
              </div>
              <p className={styles.detailMeta}>
                {msg.relativeLabel} · {msg.dateLabel}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
