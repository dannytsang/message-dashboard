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

export type EmailActionType =
  | "consent_form"
  | "delivery_change"
  | "payment"
  | "calendar_proposal"
  | "review_change"
  | "general_action";

export interface EmailIdentifiedAction {
  state: EmailActionState;
  /** Short dashboard-safe phrase describing what needs doing. Required when an action is identified. */
  actionPhrase: string;
  /** Optional action type label such as "Confirm", "Complete", "Review", "Pay". */
  actionType?: string;
}

export interface EmailInboxItem {
  id: string;
  receivedDateTime: string;
  labels: string[];
  subject: string;
  identifiedAction?: EmailIdentifiedAction;
}

export interface EmailInboxDisplayItem extends EmailInboxItem {
  receivedLabel: string;
  receivedTime: string;
  receivedDate: string;
}

// ─── Current email source schema (specs 012 / 007 / 008) ───────────────────

/**
 * Email source snapshot matching email-dashboard-source/v1 schema.
 * Used by the email source reader and sync route.
 */
export interface EmailDashboardSourceSnapshotV1 {
  schemaVersion: "email-dashboard-source/v1";
  source: "email";
  sourcePath: "dashboard/v1/email/latest.json";
  dataGeneratedAt: string;
  inboxQuery: string;
  items: EmailDashboardRowV1[];
  summary: EmailDashboardSummaryV1;
  metadata?: EmailDashboardSourceMetadataV1;
}

export interface EmailDashboardRowV1 {
  id: string;
  subject: string;
  receivedAt?: string;
  receivedDateLabel?: string;
  receivedTimeLabel?: string;
  labels: string[];
  readState?: "read" | "unread" | "unknown";
  identifiedAction?: EmailDashboardIdentifiedActionV1;
  sortKey?: string;
  searchText?: string;
  sourceStatus?: "available";
}

export interface EmailDashboardIdentifiedActionV1 {
  emoji?: string;
  state: EmailActionState;
  label: string;
  actionType?: EmailActionType;
  actionPhrase: string;
  derivedBy: "monitor_inference" | "rule" | "human_confirmed";
}

export interface EmailDashboardSummaryV1 {
  itemCount: number;
  actionCount: number;
  proposedCount: number;
  confirmedCount: number;
  noActionCount: number;
  unreadCount?: number;
  readCount?: number;
}

export interface EmailDashboardSourceMetadataV1 {
  snapshotHash?: string;
  businessContentHash?: string;
  publisher?: string;
  skippedWriteBecauseUnchanged?: boolean;
  sourceRunId?: string;
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
