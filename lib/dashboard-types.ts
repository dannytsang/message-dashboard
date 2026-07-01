export type CommunicationSource = "email" | "whatsapp";

export type CommunicationStatus =
  | "open"
  | "reminded"
  | "draft_awaiting_approval"
  | "uncertain_needs_review"
  | "resolved"
  | "resolved_by_history"
  | "dismissed"
  | "suppressed";

export interface CommunicationItem {
  id: string;
  source: CommunicationSource;
  status: CommunicationStatus;
  title: string;
  context: string;
  recommendedAction?: string;
  urgency?: "low" | "normal" | "high";
  updatedAt?: string;
  dueAt?: string;
  displayName?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface DashboardSnapshotV1 {
  schemaVersion: "dashboard-snapshot/v1";
  generatedAt: string;
  items: CommunicationItem[];
  summary?: {
    openCount: number;
    reviewCount: number;
    draftCount: number;
    sourceCounts: Record<CommunicationSource, number>;
  };
}

export type EmailActionState = "proposed" | "confirmed";

export interface EmailInboxItem {
  id: string;
  receivedDateTime: string;
  labels: string[];
  subject: string;
  identifiedAction?: {
    state: EmailActionState;
  };
}

export interface EmailInboxDisplayItem extends EmailInboxItem {
  receivedLabel: string;
  receivedTime: string;
  receivedDate: string;
}

export type WhatsAppConversationKind = "group" | "direct";
export type WhatsAppConversationListKey = "monitored" | "drafts";
export type WhatsAppConversationSortMode = "latest-message" | "name-a-z";
export type WhatsAppFollowUpSortMode = "due-soonest" | "name-a-z";
export type WhatsAppFollowUpState =
  | "proposed"
  | "scheduled"
  | "due_soon"
  | "due_now"
  | "overdue"
  | "needs_review"
  | "resolved"
  | "suppressed";

export interface WhatsAppMessageTimelineEntry {
  id: string;
  speaker: string;
  direction: "inbound" | "outbound" | "system";
  summary: string;
  sentAt: string;
}

export interface WhatsAppConversationItem {
  id: string;
  kind: WhatsAppConversationKind;
  displayName: string;
  lastMessageSummary: string;
  lastMessageAt?: string;
  listNotes?: string[];
  pendingDraftSnippet?: string;
  historySummary?: string;
  timeline: WhatsAppMessageTimelineEntry[];
}

export interface WhatsAppFollowUpItem {
  id: string;
  conversationId: string;
  kind: WhatsAppConversationKind;
  displayName: string;
  state: WhatsAppFollowUpState;
  title: string;
  dueAt?: string;
  relativeDueLabel?: string;
  contextSummary: string;
}

export interface WhatsAppDashboardSnapshot {
  generatedAt: string;
  monitored: WhatsAppConversationItem[];
  drafts: WhatsAppConversationItem[];
  followUps: WhatsAppFollowUpItem[];
}

export interface WhatsAppDashboardReadResult {
  mode: "blob" | "fixture-fallback";
  snapshot: WhatsAppDashboardSnapshot;
  warning?: string;
}
