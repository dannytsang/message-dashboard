// Shared skeleton fixture data — entirely fictional, no real messages/contacts/JIDs
//
// NOTE: emailFixtures is kept as a minimal type-level stub for the /
// summary page only. The /emails inbox list uses lib/email-fixtures.ts
// with its own separate fictional fixture set.
//
// Do NOT commit real email subjects, real mailbox labels, OAuth tokens,
// Gmail message/thread IDs, or any private communication content.

export type MessageStatus = "open" | "reminded" | "review-needed" | "draft" | "resolved";

export interface WhatsAppMessage {
  id: string;
  fromName: string;
  body: string;
  timestamp: string;
  relativeLabel: string;
  timeLabel: string;
  status: MessageStatus;
  conversation: string;
}

/**
 * Minimal email stub for the / summary page only.
 * Inbox-specific fields (receivedDateTime, labels, identifiedAction)
 * live in lib/email-fixtures.ts instead.
 */
export interface EmailMessage {
  id: string;
  from: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  timestamp: string;
  relativeLabel: string;
  dateLabel: string;
  status: MessageStatus;
  labels: string[];
}

// ── WhatsApp fixtures (unchanged — WhatsApp is not in scope for spec 009) ──

export const whatsappFixtures: WhatsAppMessage[] = [
  {
    id: "wa-001",
    fromName: "Alex Rivera",
    body: "Hey, can you send over the Q3 report when you get a chance?",
    timestamp: "2026-06-30T09:14:00Z",
    relativeLabel: "Today",
    timeLabel: "09:14",
    status: "open",
    conversation: "Work Chat",
  },
  {
    id: "wa-002",
    fromName: "Sam Patel",
    body: "Reminder: team sync moved to 3 PM tomorrow.",
    timestamp: "2026-06-29T17:45:00Z",
    relativeLabel: "Yesterday",
    timeLabel: "17:45",
    status: "reminded",
    conversation: "Project Alpha",
  },
  {
    id: "wa-003",
    fromName: "Jordan Lee",
    body: "Shared the updated wireframes — please review before Friday.",
    timestamp: "2026-06-28T11:02:00Z",
    relativeLabel: "2 days ago",
    timeLabel: "11:02",
    status: "review-needed",
    conversation: "Design Review",
  },
  {
    id: "wa-004",
    fromName: "Taylor Kim",
    body: "LGTM! Merging the PR shortly.",
    timestamp: "2026-06-27T14:30:00Z",
    relativeLabel: "3 days ago",
    timeLabel: "14:30",
    status: "resolved",
    conversation: "Engineering",
  },
  {
    id: "wa-005",
    fromName: "Morgan Chen",
    body: "Drafting the brief for the new client — will share by EOD.",
    timestamp: "2026-06-30T08:00:00Z",
    relativeLabel: "Today",
    timeLabel: "08:00",
    status: "draft",
    conversation: "Client Brief",
  },
];

/**
 * Minimal email stub — intentionally sparse so the / summary page
 * continues to render without regression.
 * Real inbox data must arrive through the server-side dashboard
 * data boundary (spec 001 / 007 / 008), not through this fixture.
 */
export const emailFixtures: EmailMessage[] = [
  {
    id: "stub-001",
    from: "—",
    fromAddress: "no-reply@example",
    subject: "Inbox items loading…",
    snippet: "Your email inbox will appear here once connected.",
    timestamp: new Date().toISOString(),
    relativeLabel: "Today",
    dateLabel: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    status: "open",
    labels: ["inbox"],
  },
];

export function statusLabel(status: MessageStatus): string {
  const map: Record<MessageStatus, string> = {
    open: "Open",
    reminded: "Reminded",
    "review-needed": "Review needed",
    draft: "Draft",
    resolved: "Resolved",
  };
  return map[status];
}
