import type {
  WhatsAppConversationRowV1,
  WhatsAppDashboardSourceMetadataV1,
  WhatsAppDashboardSourceSnapshotV1,
  WhatsAppDashboardSummaryV1,
  WhatsAppFollowUpRowV1,
} from "@/lib/dashboard-types";

const monitored: WhatsAppConversationRowV1[] = [
  {
    id: "whatsapp-demo-mon-001",
    conversationKind: "group",
    displayName: "Acme Robotics Launch Ops",
    lastMessageSummary: "The checklist pack still needs one clean repost before the noon standup.",
    lastMessageAt: "2026-07-05T08:18:00Z",
    lastMessageRelativeLabel: "Today",
    listNotes: ["Checklist repost pending", "Morning activity high"],
    historySummary: "Monitored because the group is coordinating a launch checklist with a time-sensitive ask.",
    timeline: [
      {
        id: "whatsapp-demo-mon-001-a",
        speakerLabel: "System note",
        direction: "system",
        summary: "Marked as monitored after repeated checklist references.",
        createdAt: "2026-07-05T07:48:00Z",
      },
      {
        id: "whatsapp-demo-mon-001-b",
        speakerLabel: "Launch Ops",
        direction: "incoming",
        summary: "Can someone repost the clean checklist summary before the noon huddle?",
        createdAt: "2026-07-05T08:18:00Z",
      },
    ],
  },
  {
    id: "whatsapp-demo-mon-002",
    conversationKind: "direct",
    displayName: "Sky Logistics Planning",
    lastMessageSummary: "The review slot moved to 15:00 and needs one tidy acknowledgement.",
    lastMessageAt: "2026-07-05T07:42:00Z",
    lastMessageRelativeLabel: "Today",
    listNotes: ["Schedule change", "Awaiting acknowledgement"],
    historySummary: "Direct thread kept visible because a schedule update is waiting for a brief reply.",
    timeline: [
      {
        id: "whatsapp-demo-mon-002-a",
        speakerLabel: "Sky Logistics",
        direction: "incoming",
        summary: "The planning review has moved to 15:00 UTC.",
        createdAt: "2026-07-05T07:42:00Z",
      },
      {
        id: "whatsapp-demo-mon-002-b",
        speakerLabel: "You",
        direction: "outgoing",
        summary: "Acknowledged — I will keep the updated slot visible in the dashboard.",
        createdAt: "2026-07-05T07:48:00Z",
      },
    ],
  },
  {
    id: "whatsapp-demo-mon-003",
    conversationKind: "group",
    displayName: "Orion Studio Design Circle",
    lastMessageSummary: "Updated wireframes were posted and need a careful read before Friday.",
    lastMessageAt: "2026-07-04T16:22:00Z",
    lastMessageRelativeLabel: "Yesterday",
    listNotes: ["Review requested", "Tone still uncertain"],
    historySummary: "Tracked because the thread may need a design review response, but the ask is not yet fully clear.",
    timeline: [
      {
        id: "whatsapp-demo-mon-003-a",
        speakerLabel: "Orion Studio",
        direction: "incoming",
        summary: "Shared the updated wireframes for the Friday walkthrough.",
        createdAt: "2026-07-04T16:05:00Z",
      },
      {
        id: "whatsapp-demo-mon-003-b",
        speakerLabel: "System note",
        direction: "system",
        summary: "Thread marked for review because the reply intent is still uncertain.",
        createdAt: "2026-07-04T16:22:00Z",
      },
    ],
  },
];

const drafts: WhatsAppConversationRowV1[] = [
  {
    id: "whatsapp-demo-draft-001",
    conversationKind: "direct",
    displayName: "Northstar Facilities Desk",
    lastMessageSummary: "A short reply draft is waiting for approval before anything is sent.",
    lastMessageAt: "2026-07-05T07:10:00Z",
    lastMessageRelativeLabel: "Today",
    draftSummary: "Draft saved: thank them for the update and confirm the next checkpoint.",
    state: "draft_awaiting_approval",
    listNotes: ["Draft only", "No send action"],
    historySummary: "Opened from the drafts bucket because a reply was prepared but kept read-only.",
    timeline: [
      {
        id: "whatsapp-demo-draft-001-a",
        speakerLabel: "Northstar Facilities",
        direction: "incoming",
        summary: "Could you tighten up the note before I forward it to the team?",
        createdAt: "2026-07-05T06:55:00Z",
      },
      {
        id: "whatsapp-demo-draft-001-b",
        speakerLabel: "System note",
        direction: "system",
        summary: "A fictional reply draft was generated and parked for review only.",
        createdAt: "2026-07-05T07:10:00Z",
      },
    ],
  },
  {
    id: "whatsapp-demo-draft-002",
    conversationKind: "group",
    displayName: "Meadow Transit Board",
    lastMessageSummary: "The follow-up note is drafted and waiting for a better timing window.",
    lastMessageAt: "2026-07-04T18:30:00Z",
    lastMessageRelativeLabel: "Yesterday",
    draftSummary: "Draft saved: propose two timing options and keep the tone concise.",
    state: "review_needed",
    listNotes: ["Draft pending review", "Board context included"],
    historySummary: "Draft response kept separate so the read-only dashboard does not imply a send flow.",
    timeline: [
      {
        id: "whatsapp-demo-draft-002-a",
        speakerLabel: "Meadow Transit Board",
        direction: "incoming",
        summary: "Can someone send a concise recap after the venue walkthrough?",
        createdAt: "2026-07-04T18:05:00Z",
      },
      {
        id: "whatsapp-demo-draft-002-b",
        speakerLabel: "You",
        direction: "outgoing",
        summary: "I can prepare a tidy recap draft for approval.",
        createdAt: "2026-07-04T18:12:00Z",
      },
      {
        id: "whatsapp-demo-draft-002-c",
        speakerLabel: "System note",
        direction: "system",
        summary: "Draft saved for later review.",
        createdAt: "2026-07-04T18:30:00Z",
      },
    ],
  },
];

const followUps: WhatsAppFollowUpRowV1[] = [
  {
    id: "whatsapp-demo-follow-001",
    conversationId: "whatsapp-demo-mon-001",
    conversationKind: "group",
    displayName: "Acme Robotics Launch Ops",
    state: "due_now",
    title: "Repost the checklist summary before the noon huddle",
    dueAt: "2026-07-05T11:45:00Z",
    dueRelativeLabel: "Due now",
    contextSummary: "The latest message asks for one easy-to-share checklist link before lunch.",
  },
  {
    id: "whatsapp-demo-follow-002",
    conversationId: "whatsapp-demo-mon-002",
    conversationKind: "direct",
    displayName: "Sky Logistics Planning",
    state: "proposed",
    title: "Propose a short acknowledgement for the shifted review time",
    dueAt: "2026-07-05T14:00:00Z",
    dueRelativeLabel: "Proposed for this afternoon",
    contextSummary: "Useful if the updated schedule needs one clean confirmation note.",
  },
  {
    id: "whatsapp-demo-follow-003",
    conversationId: "whatsapp-demo-mon-003",
    conversationKind: "group",
    displayName: "Orion Studio Design Circle",
    state: "due_soon",
    title: "Check the updated wireframes before the Friday agenda locks",
    dueAt: "2026-07-05T12:30:00Z",
    dueRelativeLabel: "Due soon",
    contextSummary: "The thread may need one concise read before the next design meeting.",
  },
  {
    id: "whatsapp-demo-follow-004",
    conversationId: "whatsapp-demo-draft-001",
    conversationKind: "direct",
    displayName: "Northstar Facilities Desk",
    state: "scheduled",
    title: "Review the saved reply draft during the late-morning batch",
    dueAt: "2026-07-05T10:30:00Z",
    dueRelativeLabel: "Scheduled",
    contextSummary: "The draft exists already; this row tracks review timing only.",
  },
  {
    id: "whatsapp-demo-follow-005",
    conversationId: "whatsapp-demo-draft-002",
    conversationKind: "group",
    displayName: "Meadow Transit Board",
    state: "needs_review",
    title: "Verify the recap draft still matches the latest venue notes",
    dueAt: "2026-07-05T15:00:00Z",
    dueRelativeLabel: "Review needed",
    contextSummary: "A fresh walkthrough note may have changed the wording.",
  },
];

function buildSummary(
  monitoredRows: WhatsAppConversationRowV1[],
  draftRows: WhatsAppConversationRowV1[],
  followUpRows: WhatsAppFollowUpRowV1[],
): WhatsAppDashboardSummaryV1 {
  const allKinds = [
    ...monitoredRows.map((item) => item.conversationKind),
    ...draftRows.map((item) => item.conversationKind),
    ...followUpRows.map((item) => item.conversationKind),
  ];

  return {
    monitoredCount: monitoredRows.length,
    draftCount: draftRows.length,
    followUpCount: followUpRows.length,
    groupCount: allKinds.filter((kind) => kind === "group").length,
    directCount: allKinds.filter((kind) => kind === "direct").length,
    dueSoonCount: followUpRows.filter((item) => item.state === "due_soon").length,
    dueNowCount: followUpRows.filter((item) => item.state === "due_now").length,
    overdueCount: followUpRows.filter((item) => item.state === "overdue").length,
    needsReviewCount: followUpRows.filter((item) => item.state === "needs_review").length,
    openCount:
      monitoredRows.length +
      draftRows.length +
      followUpRows.filter((item) => !["resolved", "suppressed"].includes(item.state)).length,
  };
}

export const whatsappDemoSourceSnapshot: WhatsAppDashboardSourceSnapshotV1 = {
  schemaVersion: "whatsapp-dashboard-source/v1",
  source: "whatsapp",
  sourcePath: "dashboard/v1/whatsapp/latest.json",
  dataGeneratedAt: "2026-07-05T08:30:00Z",
  monitored,
  drafts,
  followUps,
  summary: buildSummary(monitored, drafts, followUps),
  metadata: {
    snapshotHash: "demo-whatsapp-snapshot",
    businessContentHash: "demo-whatsapp-content",
    publisher: "demo-fixtures",
    sourceRunId: "demo-whatsapp-run",
    skippedWriteBecauseUnchanged: false,
  } satisfies WhatsAppDashboardSourceMetadataV1,
};
