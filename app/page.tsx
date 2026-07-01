import styles from "./page.module.css";

export default function PlaceholderPage() {
  return (
    <main className={styles.shell}>
      <div className={styles.hero}>
        <div className={styles.indicator} aria-hidden="true" />
        <h1 className={styles.heading}>Communication Dashboard</h1>
        <p className={styles.sub}>
          A unified view of email and WhatsApp action items — built for Danny.
        </p>
      </div>

      <section className={styles.card}>
        <div className={styles.cardIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 className={styles.cardTitle}>Dashboard in preparation</h2>
        <p className={styles.cardBody}>
          The full communication dashboard is being built. Once ready, it will
          surface email and WhatsApp action items in one place — with source,
          status, context, and recommended next step visible at a glance.
        </p>
      </section>

      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <strong>Status-aware</strong>
            <p>Tracks open, reminded, review-needed, draft, and resolved states.</p>
          </div>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <strong>Privacy-first</strong>
            <p>No credentials, tokens, or raw message data ever reach the client.</p>
          </div>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <strong>Read-only MVP</strong>
            <p>Observes and reports — no auto-sending, no mutations.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Questions? Reach out to{" "}
          <a href="https://github.com/dannytsang" target="_blank" rel="noopener noreferrer">
            @dannytsang
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
