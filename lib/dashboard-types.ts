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
