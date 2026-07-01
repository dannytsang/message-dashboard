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
 * Fictional inbox rows for UI development.
 * Mix of: no-action, proposed action, confirmed action.
 * Subjects and labels are deliberately generic and fictional.
 */
export const emailInboxFixtures: EmailInboxItem[] = [
  {
    id: "fixt-em-01",
    receivedDateTime: "2026-06-30T08:14:00Z",
    receivedLabel: "Today",
    receivedTime: "08:14",
    receivedDate: "30 Jun 2026",
    labels: ["inbox", "billing"],
    subject: "Invoice due — subscription renewal coming up",
    identifiedAction: { state: "proposed" },
  },
  {
    id: "fixt-em-02",
    receivedDateTime: "2026-06-30T07:45:00Z",
    receivedLabel: "Today",
    receivedTime: "07:45",
    receivedDate: "30 Jun 2026",
    labels: ["inbox", "automated"],
    subject: "Weekly summary — no action required",
  },
  {
    id: "fixt-em-03",
    receivedDateTime: "2026-06-29T16:22:00Z",
    receivedLabel: "Yesterday",
    receivedTime: "16:22",
    receivedDate: "29 Jun 2026",
    labels: ["inbox", "work"],
    subject: "Schedule change — please confirm your availability",
    identifiedAction: { state: "confirmed" },
  },
  {
    id: "fixt-em-04",
    receivedDateTime: "2026-06-29T11:05:00Z",
    receivedLabel: "Yesterday",
    receivedTime: "11:05",
    receivedDate: "29 Jun 2026",
    labels: ["inbox", "notifications"],
    subject: "System notification — new sign-in from unfamiliar device",
  },
  {
    id: "fixt-em-05",
    receivedDateTime: "2026-06-28T09:30:00Z",
    receivedLabel: "2 days ago",
    receivedTime: "09:30",
    receivedDate: "28 Jun 2026",
    labels: ["inbox", "work"],
    subject: "Quarterly review — action items attached",
    identifiedAction: { state: "proposed" },
  },
  {
    id: "fixt-em-06",
    receivedDateTime: "2026-06-27T14:00:00Z",
    receivedLabel: "3 days ago",
    receivedTime: "14:00",
    receivedDate: "27 Jun 2026",
    labels: ["inbox", "automated"],
    subject: "Daily digest — no action items",
  },
];
