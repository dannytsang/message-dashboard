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

/**
 * A dashboard-safe excerpt of a single source message that is sufficient for
 * Danny to make an informed review decision in the Summary inspector.
 *
 * Properties intentionally match the sanitised WhatsApp timeline entry shape
 * already published by the monitor pipeline. No raw JIDs, phone numbers, or
 * message IDs are exposed.
 */
export interface ReviewMessageExcerpt {
  /** Short display label for the message author, e.g. "Terina". No JID/phone. */
  author: string;
  /**
   * Dashboard-safe message summary produced by the monitor pipeline.
   * May be a verbatim safe-text excerpt or a generated summary — both are
   * already sanitised before publishing. Max ~280 chars is recommended.
   */
  body: string;
  /**
   * Human-readable sent time, e.g. "Today, 14:30" or "Yesterday, 09:15".
   * Already derived by the monitor pipeline; never a raw timestamp string.
   */
  sentLabel: string;
  /**
   * Direction from Danny's perspective: inbound = received from the contact,
   * outbound = sent by Danny.
   */
  direction: "inbound" | "outbound";
}

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
  /** Safe user-facing received/occurred-at timestamp for the item (ISO 8601). */
  receivedAt?: string;
  displayName?: string;
  metadata?: Record<string, string | number | boolean | null>;
  /**
   * For WhatsApp items in `uncertain_needs_review` status, a single dashboard-safe
   * message excerpt (inbound from the contact) that provides sufficient context for
   * Danny to make an informed review decision — e.g. the last incoming message
   * from the contact that triggered the review flag.
   *
   * Absent for all other item types and statuses. No raw JIDs, phone numbers,
   * message IDs, or private paths are included.
   */
  reviewMessageExcerpt?: ReviewMessageExcerpt;
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

export interface EmailDetailContent {
  /** Dashboard-safe body/snippet excerpt, never a raw full mailbox payload. */
  contentExcerpt: string;
}

export interface EmailInboxItem {
  id: string;
  receivedDateTime: string;
  labels: string[];
  subject: string;
  identifiedAction?: EmailIdentifiedAction;
  detail?: EmailDetailContent;
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
  /** Backward-compatible timestamp used by the /emails display model while v1 consumers migrate. */
  receivedDateTime?: string;
  receivedDateLabel?: string;
  receivedTimeLabel?: string;
  labels: string[];
  readState?: "read" | "unread" | "unknown";
  identifiedAction?: EmailDashboardIdentifiedActionV1;
  sortKey?: string;
  searchText?: string;
  sourceStatus?: "available";
  detail?: EmailDetailContent;
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

export type WhatsAppTimelineDirection = "incoming" | "outgoing" | "system";

export interface WhatsAppMessageTimelineEntry {
  id: string;
  speaker: string;
  direction: "inbound" | "outbound" | "system";
  summary: string;
  sentAt: string;
}

export interface WhatsAppConversationHistoryEntryV1 {
  id: string;
  speakerLabel?: string;
  direction: WhatsAppTimelineDirection;
  summary: string;
  createdAt?: string;
  relativeLabel?: string;
}

export interface WhatsAppConversationItem {
  id: string;
  /** Runtime/UI alias for the canonical source contract's conversationKind. */
  kind: WhatsAppConversationKind;
  conversationKind?: WhatsAppConversationKind;
  displayName: string;
  lastMessageSummary: string;
  lastMessageAt?: string;
  lastMessageRelativeLabel?: string;
  listNotes?: string[];
  pendingDraftSnippet?: string;
  draftSummary?: string;
  state?:
    | "monitored"
    | "draft_awaiting_approval"
    | "review_needed"
    | "reminded"
    | "uncertain_needs_review";
  historySummary?: string;
  timeline: WhatsAppMessageTimelineEntry[];
  reviewMessageExcerpt?: ReviewMessageExcerpt;
}

export interface WhatsAppConversationRowV1 {
  id: string;
  conversationKind: WhatsAppConversationKind;
  displayName: string;
  lastMessageSummary: string;
  lastMessageAt?: string;
  lastMessageRelativeLabel?: string;
  draftSummary?: string;
  state?: WhatsAppConversationItem["state"];
  listNotes?: string[];
  historySummary?: string;
  timeline?: WhatsAppConversationHistoryEntryV1[];
  reviewMessageExcerpt?: ReviewMessageExcerpt;
}

export interface WhatsAppFollowUpItem {
  id: string;
  conversationId: string;
  /** Runtime/UI alias for the canonical source contract's conversationKind. */
  kind: WhatsAppConversationKind;
  conversationKind?: WhatsAppConversationKind;
  displayName: string;
  state: WhatsAppFollowUpState;
  title: string;
  dueAt?: string;
  relativeDueLabel?: string;
  dueRelativeLabel?: string;
  contextSummary: string;
  reviewMessageExcerpt?: ReviewMessageExcerpt;
}

export interface WhatsAppFollowUpRowV1 {
  id: string;
  conversationId: string;
  conversationKind: WhatsAppConversationKind;
  displayName: string;
  state: WhatsAppFollowUpState;
  title: string;
  dueAt?: string;
  dueRelativeLabel?: string;
  lastMessageSummary?: string;
  lastMessageAt?: string;
  topicSummary?: string;
  contextSummary?: string;
  confidenceLabel?: "low" | "medium" | "high";
  reviewMessageExcerpt?: ReviewMessageExcerpt;
}

export interface WhatsAppDashboardSummaryV1 {
  monitoredCount: number;
  draftCount: number;
  followUpCount: number;
  groupCount?: number;
  directCount?: number;
  dueSoonCount?: number;
  dueNowCount?: number;
  overdueCount?: number;
  needsReviewCount?: number;
  openCount?: number;
}

export interface WhatsAppDashboardSourceMetadataV1 {
  snapshotHash?: string;
  businessContentHash?: string;
  publisher?: string;
  skippedWriteBecauseUnchanged?: boolean;
  sourceRunId?: string;
}

export interface WhatsAppDashboardSourceSnapshotV1 {
  schemaVersion: "whatsapp-dashboard-source/v1";
  source: "whatsapp";
  sourcePath: "dashboard/v1/whatsapp/latest.json";
  dataGeneratedAt: string;
  monitored: WhatsAppConversationRowV1[];
  drafts: WhatsAppConversationRowV1[];
  followUps: WhatsAppFollowUpRowV1[];
  summary: WhatsAppDashboardSummaryV1;
  metadata?: WhatsAppDashboardSourceMetadataV1;
}

export interface WhatsAppDashboardSnapshot {
  generatedAt: string;
  monitored: WhatsAppConversationItem[];
  drafts: WhatsAppConversationItem[];
  followUps: WhatsAppFollowUpItem[];
  schemaVersion?: "whatsapp-dashboard-source/v1" | "whatsapp-source/v1";
  source?: "whatsapp";
  sourcePath?: "dashboard/v1/whatsapp/latest.json";
  dataGeneratedAt?: string;
  summary?: WhatsAppDashboardSummaryV1;
  metadata?: WhatsAppDashboardSourceMetadataV1;
}

export interface WhatsAppDashboardReadResult {
  mode: "live";
  snapshot: WhatsAppDashboardSnapshot;
  warning?: string;
}
