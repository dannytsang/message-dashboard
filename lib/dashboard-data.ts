import "server-only";

import {
  dashboardFixtureSnapshot,
  emailInboxFixtureItems,
  whatsappDashboardFixtureSnapshot,
} from "@/lib/dashboard-fixtures";
import { VercelBlobStorageClient } from "@/lib/blob-storage";
import type {
  CommunicationItem,
  CommunicationSource,
  CommunicationStatus,
  DashboardSnapshotV1,
  EmailInboxDisplayItem,
  EmailInboxItem,
  WhatsAppConversationItem,
  WhatsAppConversationKind,
  WhatsAppDashboardReadResult,
  WhatsAppDashboardSnapshot,
  WhatsAppFollowUpItem,
  WhatsAppFollowUpState,
} from "@/lib/dashboard-types";

const DASHBOARD_SNAPSHOT_URL_ENV = "COMMUNICATION_DASHBOARD_SNAPSHOT_URL";
const EMAIL_INBOX_URL_ENV = "COMMUNICATION_EMAIL_INBOX_URL";
const WHATSAPP_DASHBOARD_URL_ENV = "COMMUNICATION_WHATSAPP_DASHBOARD_URL";

// Deterministic blob paths for separated source storage (spec 007/008)
const EMAIL_SOURCE_BLOB_PATH = "dashboard/v1/email/latest.json";
const WHATSAPP_SOURCE_BLOB_PATH = "dashboard/v1/whatsapp/latest.json";

export type DashboardDataMode = "blob" | "fixture-fallback";

interface DashboardReadResult {
  mode: DashboardDataMode;
  snapshot: DashboardSnapshotV1;
  warning?: string;
}

interface EmailInboxReadResult {
  mode: DashboardDataMode;
  items: EmailInboxDisplayItem[];
  warning?: string;
}

interface EmailSourceReadResult {
  mode: DashboardDataMode;
  snapshot: EmailSourceSnapshot | null;
  warning?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCommunicationStatus(value: unknown): value is CommunicationStatus {
  return (
    value === "open" ||
    value === "reminded" ||
    value === "draft_awaiting_approval" ||
    value === "uncertain_needs_review" ||
    value === "resolved" ||
    value === "resolved_by_history" ||
    value === "dismissed" ||
    value === "suppressed"
  );
}

function isCommunicationSource(value: unknown): value is CommunicationSource {
  return value === "email" || value === "whatsapp";
}

function isCommunicationItem(value: unknown): value is CommunicationItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isCommunicationSource(value.source) &&
    isCommunicationStatus(value.status) &&
    typeof value.title === "string" &&
    typeof value.context === "string"
  );
}

function isDashboardSnapshot(value: unknown): value is DashboardSnapshotV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === "dashboard-snapshot/v1" &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.items) &&
    value.items.every(isCommunicationItem)
  );
}

function isEmailInboxItem(value: unknown): value is EmailInboxItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.receivedDateTime === "string" &&
    typeof value.subject === "string" &&
    Array.isArray(value.labels) &&
    value.labels.every((label) => typeof label === "string") &&
    (value.identifiedAction === undefined ||
      (isRecord(value.identifiedAction) &&
        typeof value.identifiedAction.actionPhrase === "string" &&
        (value.identifiedAction.state === "proposed" ||
          value.identifiedAction.state === "confirmed") &&
        (value.identifiedAction.actionType === undefined ||
          typeof value.identifiedAction.actionType === "string")))
  );
}

function isEmailSourceSnapshot(value: unknown): value is EmailSourceSnapshot {
  return (
    isRecord(value) &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.items)
  );
}

export interface EmailSourceSnapshot {
  schemaVersion?: string;
  generatedAt: string;
  summary?: Record<string, unknown> | null;
  items: EmailInboxItem[];
}

function isWhatsAppConversationKind(value: unknown): value is WhatsAppConversationKind {
  return value === "group" || value === "direct";
}

function isWhatsAppFollowUpState(value: unknown): value is WhatsAppFollowUpState {
  return (
    value === "proposed" ||
    value === "scheduled" ||
    value === "due_soon" ||
    value === "due_now" ||
    value === "overdue" ||
    value === "needs_review" ||
    value === "resolved" ||
    value === "suppressed"
  );
}

function isWhatsAppConversationItem(value: unknown): value is WhatsAppConversationItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isWhatsAppConversationKind(value.kind) &&
    typeof value.displayName === "string" &&
    typeof value.lastMessageSummary === "string" &&
    Array.isArray(value.timeline) &&
    value.timeline.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === "string" &&
        typeof entry.speaker === "string" &&
        (entry.direction === "inbound" ||
          entry.direction === "outbound" ||
          entry.direction === "system") &&
        typeof entry.summary === "string" &&
        typeof entry.sentAt === "string",
    )
  );
}

function isWhatsAppFollowUpItem(value: unknown): value is WhatsAppFollowUpItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.conversationId === "string" &&
    isWhatsAppConversationKind(value.kind) &&
    typeof value.displayName === "string" &&
    isWhatsAppFollowUpState(value.state) &&
    typeof value.title === "string" &&
    typeof value.contextSummary === "string"
  );
}

function isWhatsAppDashboardSnapshot(value: unknown): value is WhatsAppDashboardSnapshot {
  return (
    isRecord(value) &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.monitored) &&
    value.monitored.every(isWhatsAppConversationItem) &&
    Array.isArray(value.drafts) &&
    value.drafts.every(isWhatsAppConversationItem) &&
    Array.isArray(value.followUps) &&
    value.followUps.every(isWhatsAppFollowUpItem)
  );
}

async function readJsonFromUrl(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Snapshot request failed with ${response.status}`);
  }

  return response.json();
}

async function readBlobText(path: string): Promise<string | null> {
  const client = new VercelBlobStorageClient();
  return client.readBlobText(path);
}

function formatRelativeLabel(date: Date): string {
  const base = Date.UTC(2026, 6, 1);
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayDiff = Math.round((base - target) / 86_400_000);

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return `${dayDiff} days ago`;
}

function formatEmailInboxDisplay(item: EmailInboxItem): EmailInboxDisplayItem {
  const date = new Date(item.receivedDateTime);

  if (Number.isNaN(date.getTime())) {
    return {
      ...item,
      receivedLabel: "Unknown date",
      receivedTime: "—",
      receivedDate: "Unknown date",
    };
  }

  return {
    ...item,
    receivedLabel: formatRelativeLabel(date),
    receivedTime: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date),
    receivedDate: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date),
  };
}

function buildSummary(snapshot: DashboardSnapshotV1): DashboardSnapshotV1["summary"] {
  const items = snapshot.items;

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

export async function readDashboardSnapshot(): Promise<DashboardReadResult> {
  const snapshotUrl = process.env[DASHBOARD_SNAPSHOT_URL_ENV];

  if (snapshotUrl) {
    try {
      const payload = await readJsonFromUrl(snapshotUrl);
      if (!isDashboardSnapshot(payload)) {
        throw new Error("Snapshot payload did not match dashboard-snapshot/v1");
      }

      return {
        mode: "blob",
        snapshot: {
          ...payload,
          summary: payload.summary ?? buildSummary(payload),
        },
      };
    } catch (error) {
      return {
        mode: "fixture-fallback",
        snapshot: {
          ...dashboardFixtureSnapshot,
          summary: dashboardFixtureSnapshot.summary ?? buildSummary(dashboardFixtureSnapshot),
        },
        warning:
          error instanceof Error
            ? `Falling back to fictional dashboard fixtures because the server snapshot could not be read: ${error.message}`
            : "Falling back to fictional dashboard fixtures because the server snapshot could not be read.",
      };
    }
  }

  return {
    mode: "fixture-fallback",
    snapshot: {
      ...dashboardFixtureSnapshot,
      summary: dashboardFixtureSnapshot.summary ?? buildSummary(dashboardFixtureSnapshot),
    },
  };
}

export async function readEmailSourceSnapshot(): Promise<EmailSourceReadResult> {
  const text = await readBlobText(EMAIL_SOURCE_BLOB_PATH);
  // Treat null (not found), empty, or whitespace-only as unavailable
  if (text === null || text.trim() === "") {
    return {
      mode: "fixture-fallback",
      snapshot: null,
      warning: "Email snapshot unavailable; falling back to fictional inbox fixtures.",
    };
  }
  try {
    const payload = JSON.parse(text);
    if (!isEmailSourceSnapshot(payload)) {
      throw new Error("Email source snapshot did not match expected schema");
    }
    return { mode: "blob", snapshot: payload };
  } catch (error) {
    return {
      mode: "fixture-fallback",
      snapshot: null,
      warning:
        error instanceof Error
          ? `Email snapshot malformed; falling back to fictional inbox fixtures: ${error.message}`
          : "Email snapshot malformed; falling back to fictional inbox fixtures.",
    };
  }
}

export async function readEmailInboxItems(): Promise<EmailInboxReadResult> {
  // Priority 1: deterministic blob path (spec 007/008)
  const text = await readBlobText(EMAIL_SOURCE_BLOB_PATH);
  // Treat null (not found), empty, or whitespace-only as unavailable
  if (text !== null && text.trim() !== "") {
    try {
      const payload = JSON.parse(text);
      if (!isEmailSourceSnapshot(payload)) {
        throw new Error("Email source snapshot did not match expected schema");
      }
      if (!payload.items.every(isEmailInboxItem)) {
        throw new Error("Email items did not match expected shape");
      }
      return {
        mode: "blob",
        items: payload.items.map(formatEmailInboxDisplay),
      };
    } catch (error) {
      // Malformed blob — fall through to fixtures
    }
  }

  // Priority 2: legacy URL env var (backward compat for dev/preview)
  const inboxUrl = process.env[EMAIL_INBOX_URL_ENV];
  if (inboxUrl) {
    try {
      const payload = await readJsonFromUrl(inboxUrl);
      if (!Array.isArray(payload) || !payload.every(isEmailInboxItem)) {
        throw new Error("Inbox payload did not match the expected email inbox shape");
      }
      return {
        mode: "blob",
        items: payload.map(formatEmailInboxDisplay),
      };
    } catch (error) {
      return {
        mode: "fixture-fallback",
        items: emailInboxFixtureItems.map(formatEmailInboxDisplay),
        warning:
          error instanceof Error
            ? `Falling back to fictional inbox fixtures because the server inbox snapshot could not be read: ${error.message}`
            : "Falling back to fictional inbox fixtures because the server inbox snapshot could not be read.",
      };
    }
  }

  return {
    mode: "fixture-fallback",
    items: emailInboxFixtureItems.map(formatEmailInboxDisplay),
  };
}

export async function readWhatsAppDashboardData(): Promise<WhatsAppDashboardReadResult> {
  const dashboardUrl = process.env[WHATSAPP_DASHBOARD_URL_ENV];

  if (dashboardUrl) {
    try {
      const payload = await readJsonFromUrl(dashboardUrl);
      if (!isWhatsAppDashboardSnapshot(payload)) {
        throw new Error("WhatsApp dashboard payload did not match the expected shape");
      }

      return {
        mode: "blob",
        snapshot: payload,
      };
    } catch (error) {
      return {
        mode: "fixture-fallback",
        snapshot: whatsappDashboardFixtureSnapshot,
        warning:
          error instanceof Error
            ? `Falling back to fictional WhatsApp fixtures because the server snapshot could not be read: ${error.message}`
            : "Falling back to fictional WhatsApp fixtures because the server snapshot could not be read.",
      };
    }
  }

  return {
    mode: "fixture-fallback",
    snapshot: whatsappDashboardFixtureSnapshot,
  };
}


