// Shared skeleton fixture data — entirely fictional, no real messages/contacts/JIDs

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

export interface EmailMessage {
  id: string;
  from: string;
  fromAddress: string; // fictional
  subject: string;
  snippet: string;
  timestamp: string;
  relativeLabel: string;
  dateLabel: string;
  status: MessageStatus;
  labels: string[];
}

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

export const emailFixtures: EmailMessage[] = [
  {
    id: "em-001",
    from: "Infrastructure Team",
    fromAddress: "infra@example.com",
    subject: "Weekly infrastructure health summary",
    snippet: "All systems nominal. No incidents reported this week.",
    timestamp: "2026-06-30T07:00:00Z",
    relativeLabel: "Today",
    dateLabel: "30 Jun 2026",
    status: "resolved",
    labels: ["infrastructure", "automated"],
  },
  {
    id: "em-002",
    from: "Casey Nguyen",
    fromAddress: "casey.nguyen@example.com",
    subject: "Re: API integration question",
    snippet: "Thanks for the clarification — I'll update the docs accordingly.",
    timestamp: "2026-06-29T15:22:00Z",
    relativeLabel: "Yesterday",
    dateLabel: "29 Jun 2026",
    status: "resolved",
    labels: ["work", "external"],
  },
  {
    id: "em-003",
    from: "DevOps Bot",
    fromAddress: "devops-bot@example.com",
    subject: "Deployment succeeded: message-dashboard@2.1.0",
    snippet: "Build completed in 94 s. Preview: https://preview.example.com/deploy/abc123",
    timestamp: "2026-06-29T12:10:00Z",
    relativeLabel: "Yesterday",
    dateLabel: "29 Jun 2026",
    status: "open",
    labels: ["devops", "automated", "deployment"],
  },
  {
    id: "em-004",
    from: "Drew Hassan",
    fromAddress: "drew.hassan@example.com",
    subject: "Q3 roadmap review — action items",
    snippet: "Please review the attached and flag anything that needs re-prioritisation.",
    timestamp: "2026-06-28T09:55:00Z",
    relativeLabel: "2 days ago",
    dateLabel: "28 Jun 2026",
    status: "review-needed",
    labels: ["work", "roadmap"],
  },
  {
    id: "em-005",
    from: "Newsletter",
    fromAddress: "newsletter@techdigest.example.com",
    subject: "Tech Digest — Issue #241",
    snippet: "This week: new messaging protocols, edge computing updates, and more.",
    timestamp: "2026-06-27T08:00:00Z",
    relativeLabel: "3 days ago",
    dateLabel: "27 Jun 2026",
    status: "draft",
    labels: ["newsletter"],
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
