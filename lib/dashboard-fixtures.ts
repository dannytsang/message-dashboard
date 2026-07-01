import type {
  DashboardSnapshotV1,
  EmailInboxItem,
} from "@/lib/dashboard-types";

export const dashboardFixtureSnapshot: DashboardSnapshotV1 = {
  schemaVersion: "dashboard-snapshot/v1",
  generatedAt: "2026-07-01T08:30:00Z",
  items: [
    {
      id: "wa-open-q3-report",
      source: "whatsapp",
      status: "open",
      title: "Share the Q3 report pack",
      context:
        "A fictional work-chat reminder asks for the latest Q3 report pack before the afternoon review.",
      recommendedAction: "Confirm whether the dashboard should prepare a reply draft.",
      urgency: "high",
      updatedAt: "2026-07-01T08:05:00Z",
      dueAt: "2026-07-01T13:00:00Z",
      displayName: "Alex Rivera",
      metadata: {
        conversation: "Work chat",
        stateReason: "Explicit request awaiting acknowledgement",
      },
    },
    {
      id: "wa-reminded-sync",
      source: "whatsapp",
      status: "reminded",
      title: "Team sync moved to 15:00 tomorrow",
      context:
        "A fictional schedule-change note has already been surfaced once and remains visible as a reminder.",
      recommendedAction: "Keep visible until the schedule note is acknowledged elsewhere.",
      urgency: "normal",
      updatedAt: "2026-06-30T17:45:00Z",
      displayName: "Sam Patel",
      metadata: {
        conversation: "Project Alpha",
        reminderState: true,
      },
    },
    {
      id: "wa-review-wireframes",
      source: "whatsapp",
      status: "uncertain_needs_review",
      title: "Review updated wireframes before Friday",
      context:
        "A fictional design thread references updated wireframes, but the monitor is not confident about whether a response is expected.",
      recommendedAction: "Review the thread context before deciding whether to draft a reply.",
      urgency: "normal",
      updatedAt: "2026-06-29T11:02:00Z",
      dueAt: "2026-07-03T17:00:00Z",
      displayName: "Jordan Lee",
      metadata: {
        conversation: "Design review",
        confidence: "low",
      },
    },
    {
      id: "wa-draft-client-brief",
      source: "whatsapp",
      status: "draft_awaiting_approval",
      title: "Client brief reply draft awaiting approval",
      context:
        "A fictional outbound brief response has been prepared but must remain approval-only in the dashboard.",
      recommendedAction: "Review the draft externally before any send flow is added later.",
      urgency: "normal",
      updatedAt: "2026-07-01T07:40:00Z",
      displayName: "Morgan Chen",
      metadata: {
        conversation: "Client brief",
        draftState: "awaiting approval",
      },
    },
    {
      id: "wa-resolved-history",
      source: "whatsapp",
      status: "resolved_by_history",
      title: "Pull request merge note already resolved",
      context:
        "A fictional engineering follow-up no longer needs attention because later conversation history confirms it was handled.",
      recommendedAction: "No action needed.",
      urgency: "low",
      updatedAt: "2026-06-28T14:30:00Z",
      displayName: "Taylor Kim",
      metadata: {
        conversation: "Engineering",
        resolution: "Later history confirmed merge",
      },
    },
    {
      id: "wa-suppressed-birthday",
      source: "whatsapp",
      status: "suppressed",
      title: "Low-priority social reminder suppressed",
      context:
        "A fictional casual check-in was classified as non-operational and kept only as a suppressed record.",
      recommendedAction: "No action needed.",
      urgency: "low",
      updatedAt: "2026-06-27T18:20:00Z",
      displayName: "Jamie Foster",
      metadata: {
        conversation: "Friends",
        suppressionReason: "Out of scope for operational dashboard",
      },
    },
    {
      id: "email-open-expense-form",
      source: "email",
      status: "open",
      title: "Complete the fictional expense reconciliation form",
      context:
        "A fictional finance email asks for a reimbursement form before the weekly close.",
      recommendedAction: "Confirm whether the form should be completed today.",
      urgency: "high",
      updatedAt: "2026-07-01T07:55:00Z",
      dueAt: "2026-07-01T16:00:00Z",
      displayName: "Finance Ops",
      metadata: {
        labels: "Finance, Inbox",
        actionState: "proposed",
      },
    },
    {
      id: "email-confirm-guest-list",
      source: "email",
      status: "open",
      title: "Confirm the fictional guest list update",
      context:
        "A fictional event-planning email proposes a guest list change that still needs confirmation.",
      recommendedAction: "Confirm whether the proposed update should be accepted.",
      urgency: "normal",
      updatedAt: "2026-07-01T06:40:00Z",
      dueAt: "2026-07-02T10:00:00Z",
      displayName: "Events Desk",
      metadata: {
        labels: "Inbox, Planning",
        actionState: "confirmed",
      },
    },
    {
      id: "email-dismissed-newsletter",
      source: "email",
      status: "dismissed",
      title: "Promotional newsletter dismissed",
      context:
        "A fictional marketing message was intentionally retained only as a dismissed dashboard item.",
      recommendedAction: "No action needed.",
      urgency: "low",
      updatedAt: "2026-06-30T09:10:00Z",
      displayName: "Studio Weekly",
      metadata: {
        labels: "Updates",
        suppressionReason: "Informational only",
      },
    },
  ],
};

export const emailInboxFixtureItems: EmailInboxItem[] = [
  {
    id: "email-inbox-001",
    receivedDateTime: "2026-07-01T07:55:00Z",
    labels: ["Inbox", "Finance"],
    subject: "Expense reconciliation form due today",
    identifiedAction: {
      state: "proposed",
    },
  },
  {
    id: "email-inbox-002",
    receivedDateTime: "2026-07-01T06:40:00Z",
    labels: ["Inbox", "Planning"],
    subject: "Guest list update ready for confirmation",
    identifiedAction: {
      state: "confirmed",
    },
  },
  {
    id: "email-inbox-003",
    receivedDateTime: "2026-06-30T12:15:00Z",
    labels: ["Inbox", "Travel"],
    subject: "Review the fictional rail booking change notice",
    identifiedAction: {
      state: "proposed",
    },
  },
  {
    id: "email-inbox-004",
    receivedDateTime: "2026-06-29T09:30:00Z",
    labels: ["Inbox", "Ops"],
    subject: "Weekly operations recap",
  },
  {
    id: "email-inbox-005",
    receivedDateTime: "2026-06-28T16:05:00Z",
    labels: ["Inbox", "Updates"],
    subject: "Community briefing digest",
  },
];
