/**
 * Email inbox fixtures — entirely fictional placeholder data.
 *
 * SCOPE: Used only for UI development and demo purposes.
 * NOT part of the dashboard's content model — real data must arrive
 * through the server-side dashboard data boundary (spec 001 / 007 / 008).
 *
 * Do NOT commit real email subjects, real mailbox labels, OAuth tokens,
 * Gmail IDs, or any private communication content.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionState = "proposed" | "confirmed";

export interface EmailInboxItem {
  id: string;
  /** ISO 8601 received timestamp */
  receivedDateTime: string;
  /** Display-ready received label, e.g. "Today" or "Yesterday" */
  receivedLabel: string;
  /** Display-ready received time, e.g. "14:32" */
  receivedTime: string;
  /** Display-ready received date, e.g. "30 Jun 2026" */
  receivedDate: string;
  /** Folder or label chips — safe dashboard labels only */
  labels: string[];
  /** Primary subject line */
  subject: string;
  /**
   * Action identified by the email monitor.
   * undefined / absent means no action identified.
   */
  identifiedAction?: {
    state: ActionState;
  };
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * No committed inbox rows — data must arrive through the server-side
 * dashboard data boundary (spec 001 / 007 / 008), never through fixtures.
 */
export const emailInboxFixtures: EmailInboxItem[] = [];
