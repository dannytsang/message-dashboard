import type {
  EmailDashboardRowV1,
  EmailDashboardSourceMetadataV1,
  EmailDashboardSourceSnapshotV1,
  EmailDashboardSummaryV1,
} from "@/lib/dashboard-types";

const emailDemoItems: EmailDashboardRowV1[] = [
  {
    id: "email-demo-001",
    subject: "Approve the Acme Robotics launch checklist recap",
    receivedAt: "2026-07-05T08:10:00Z",
    receivedDateTime: "2026-07-05T08:10:00Z",
    receivedDateLabel: "Today",
    receivedTimeLabel: "08:10",
    labels: ["Inbox", "Approvals"],
    readState: "unread",
    identifiedAction: {
      state: "proposed",
      label: "Approve recap",
      actionPhrase: "Approve the launch checklist recap",
      actionType: "review_change",
      derivedBy: "rule",
    },
    sortKey: "2026-07-05T08:10:00Z|email-demo-001",
    searchText: "approve the acme robotics launch checklist recap inbox approvals",
    sourceStatus: "available",
  },
  {
    id: "email-demo-002",
    subject: "Confirm the Sky Logistics workshop room change",
    receivedAt: "2026-07-05T07:25:00Z",
    receivedDateTime: "2026-07-05T07:25:00Z",
    receivedDateLabel: "Today",
    receivedTimeLabel: "07:25",
    labels: ["Inbox", "Planning"],
    readState: "unread",
    identifiedAction: {
      state: "confirmed",
      label: "Confirm room change",
      actionPhrase: "Confirm the workshop room change",
      actionType: "delivery_change",
      derivedBy: "human_confirmed",
    },
    sortKey: "2026-07-05T07:25:00Z|email-demo-002",
    searchText: "confirm the sky logistics workshop room change inbox planning",
    sourceStatus: "available",
  },
  {
    id: "email-demo-003",
    subject: "Review the Orion Studio timing update before noon",
    receivedAt: "2026-07-04T16:45:00Z",
    receivedDateTime: "2026-07-04T16:45:00Z",
    receivedDateLabel: "Yesterday",
    receivedTimeLabel: "16:45",
    labels: ["Inbox", "Operations"],
    readState: "read",
    identifiedAction: {
      state: "proposed",
      label: "Review timing update",
      actionPhrase: "Review the timing update before noon",
      actionType: "review_change",
      derivedBy: "monitor_inference",
    },
    sortKey: "2026-07-04T16:45:00Z|email-demo-003",
    searchText: "review the orion studio timing update before noon inbox operations",
    sourceStatus: "available",
  },
  {
    id: "email-demo-004",
    subject: "Northstar Facilities weekly digest for the team",
    receivedAt: "2026-07-04T09:15:00Z",
    receivedDateTime: "2026-07-04T09:15:00Z",
    receivedDateLabel: "Yesterday",
    receivedTimeLabel: "09:15",
    labels: ["Inbox", "Updates"],
    readState: "read",
    sortKey: "2026-07-04T09:15:00Z|email-demo-004",
    searchText: "northstar facilities weekly digest for the team inbox updates",
    sourceStatus: "available",
  },
  {
    id: "email-demo-005",
    subject: "Confirm the Meadow Transit venue hold for Friday",
    receivedAt: "2026-07-03T14:00:00Z",
    receivedDateTime: "2026-07-03T14:00:00Z",
    receivedDateLabel: "3 Jul",
    receivedTimeLabel: "14:00",
    labels: ["Inbox", "Events"],
    readState: "unread",
    identifiedAction: {
      state: "confirmed",
      label: "Confirm venue hold",
      actionPhrase: "Confirm the venue hold for Friday",
      actionType: "delivery_change",
      derivedBy: "human_confirmed",
    },
    sortKey: "2026-07-03T14:00:00Z|email-demo-005",
    searchText: "confirm the meadow transit venue hold for friday inbox events",
    sourceStatus: "available",
  },
];

function buildEmailSummary(items: EmailDashboardRowV1[]): EmailDashboardSummaryV1 {
  const actionCount = items.filter((item) => item.identifiedAction != null).length;
  const proposedCount = items.filter((item) => item.identifiedAction?.state === "proposed").length;
  const confirmedCount = items.filter((item) => item.identifiedAction?.state === "confirmed").length;

  return {
    itemCount: items.length,
    actionCount,
    proposedCount,
    confirmedCount,
    noActionCount: items.length - actionCount,
    unreadCount: items.filter((item) => item.readState === "unread").length,
    readCount: items.filter((item) => item.readState === "read").length,
  };
}

export const emailDemoSourceSnapshot: EmailDashboardSourceSnapshotV1 = {
  schemaVersion: "email-dashboard-source/v1",
  source: "email",
  sourcePath: "dashboard/v1/email/latest.json",
  dataGeneratedAt: "2026-07-05T08:30:00Z",
  inboxQuery: "label:demo-inbox newer_than:7d",
  items: emailDemoItems,
  summary: buildEmailSummary(emailDemoItems),
  metadata: {
    snapshotHash: "demo-email-snapshot",
    businessContentHash: "demo-email-content",
    publisher: "demo-fixtures",
    sourceRunId: "demo-email-run",
    skippedWriteBecauseUnchanged: false,
  } satisfies EmailDashboardSourceMetadataV1,
};
