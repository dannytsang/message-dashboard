import type { CommunicationItem, DashboardSnapshotV1 } from "@/lib/dashboard-types";
import { emailDemoSourceSnapshot } from "./email-demo";
import { whatsappDemoSourceSnapshot } from "./whatsapp-demo";

function emailItemToSummaryRow(item: (typeof emailDemoSourceSnapshot.items)[number]): CommunicationItem {
  return {
    id: `email:${item.id}`,
    source: "email",
    status: item.identifiedAction?.state === "confirmed" ? "resolved" : "open",
    title: item.subject,
    context:
      item.identifiedAction?.actionPhrase ??
      item.labels.join(", ") ??
      "Demo inbox item",
    recommendedAction: item.identifiedAction?.actionPhrase,
    urgency: item.readState === "unread" ? "high" : "normal",
    updatedAt: item.receivedAt,
    displayName: item.identifiedAction?.label ?? "Demo inbox",
    metadata: {
      labels: item.labels.join(", "),
      actionState: item.identifiedAction?.state ?? "none",
    },
  };
}

function whatsappConversationToSummaryRow(
  item: (typeof whatsappDemoSourceSnapshot.monitored)[number] | (typeof whatsappDemoSourceSnapshot.drafts)[number],
): CommunicationItem {
  const status =
    item.state === "draft_awaiting_approval"
      ? "draft_awaiting_approval"
      : item.state === "review_needed"
        ? "uncertain_needs_review"
        : "open";

  return {
    id: `whatsapp:${item.id}`,
    source: "whatsapp",
    status,
    title: item.displayName,
    context: item.lastMessageSummary,
    recommendedAction: item.draftSummary ?? item.historySummary,
    urgency: item.state === "draft_awaiting_approval" ? "normal" : "high",
    updatedAt: item.lastMessageAt,
    dueAt: item.state === "draft_awaiting_approval" ? undefined : item.lastMessageAt,
    displayName: item.displayName,
    metadata: {
      kind: item.conversationKind,
      state: item.state ?? "monitored",
    },
  };
}

function followUpToSummaryRow(
  item: (typeof whatsappDemoSourceSnapshot.followUps)[number],
): CommunicationItem {
  const statusMap: Record<string, CommunicationItem["status"]> = {
    proposed: "open",
    scheduled: "open",
    due_soon: "open",
    due_now: "open",
    overdue: "open",
    needs_review: "uncertain_needs_review",
    resolved: "resolved",
    suppressed: "suppressed",
  };

  return {
    id: `whatsapp-followup:${item.id}`,
    source: "whatsapp",
    status: statusMap[item.state] ?? "open",
    title: item.title,
    context: item.contextSummary ?? item.title,
    recommendedAction: item.contextSummary,
    urgency:
      item.state === "overdue" || item.state === "due_now"
        ? "high"
        : item.state === "due_soon"
          ? "normal"
          : "low",
    updatedAt: item.dueAt ?? item.lastMessageAt ?? "2026-07-05T00:00:00Z",
    dueAt: item.dueAt,
    displayName: item.displayName,
    metadata: {
      state: item.state,
      conversationKind: item.conversationKind,
    },
  };
}

const combinedItems: CommunicationItem[] = [
  ...whatsappDemoSourceSnapshot.monitored.map(whatsappConversationToSummaryRow),
  ...whatsappDemoSourceSnapshot.drafts.map(whatsappConversationToSummaryRow),
  ...whatsappDemoSourceSnapshot.followUps.map(followUpToSummaryRow),
  ...emailDemoSourceSnapshot.items.map(emailItemToSummaryRow),
];

function buildSummary(items: CommunicationItem[]): DashboardSnapshotV1["summary"] {
  return {
    openCount: items.filter((item) => item.status === "open").length,
    reviewCount: items.filter((item) => item.status === "uncertain_needs_review").length,
    draftCount: items.filter((item) => item.status === "draft_awaiting_approval").length,
    sourceCounts: {
      email: items.filter((item) => item.source === "email").length,
      whatsapp: items.filter((item) => item.source === "whatsapp").length,
    },
  };
}

export const dashboardDemoSnapshot: DashboardSnapshotV1 = {
  schemaVersion: "dashboard-snapshot/v1",
  generatedAt: "2026-07-05T08:30:00Z",
  items: combinedItems,
  summary: buildSummary(combinedItems),
};
