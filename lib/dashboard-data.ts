import "server-only";

import { VercelBlobStorageClient } from "@/lib/blob-storage";
import { getSiteMode, type DashboardSiteMode } from "@/lib/site-mode";
import type {
  CommunicationItem,
  CommunicationSource,
  CommunicationStatus,
  DashboardSnapshotV1,
  EmailDashboardIdentifiedActionV1,
  EmailDashboardRowV1,
  EmailDashboardSourceMetadataV1,
  EmailDashboardSourceSnapshotV1,
  EmailDashboardSummaryV1,
  EmailInboxDisplayItem,
  EmailInboxItem,
  WhatsAppConversationHistoryEntryV1,
  WhatsAppConversationItem,
  WhatsAppConversationKind,
  WhatsAppConversationRowV1,
  WhatsAppDashboardReadResult,
  WhatsAppDashboardSnapshot,
  WhatsAppDashboardSourceSnapshotV1,
  WhatsAppDashboardSummaryV1,
  WhatsAppFollowUpItem,
  WhatsAppFollowUpRowV1,
  WhatsAppFollowUpState,
} from "@/lib/dashboard-types";

const DASHBOARD_SNAPSHOT_URL_ENV = "COMMUNICATION_DASHBOARD_SNAPSHOT_URL";
const EMAIL_INBOX_URL_ENV = "COMMUNICATION_EMAIL_INBOX_URL";
const WHATSAPP_DASHBOARD_URL_ENV = "COMMUNICATION_WHATSAPP_DASHBOARD_URL";

// Deterministic blob paths for separated source storage (spec 007/008)
const EMAIL_SOURCE_BLOB_PATH = "dashboard/v1/email/latest.json";
const WHATSAPP_SOURCE_BLOB_PATH = "dashboard/v1/whatsapp/latest.json";

const emptyDashboardSnapshot = (): DashboardSnapshotV1 => ({
  schemaVersion: "dashboard-snapshot/v1",
  generatedAt: new Date().toISOString(),
  items: [],
  summary: {
    openCount: 0,
    reviewCount: 0,
    draftCount: 0,
    sourceCounts: { email: 0, whatsapp: 0 },
  },
});

const emptyWhatsAppDashboardSnapshot = (): WhatsAppDashboardSnapshot => ({
  schemaVersion: "whatsapp-dashboard-source/v1",
  source: "whatsapp",
  sourcePath: WHATSAPP_SOURCE_BLOB_PATH,
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: new Date().toISOString(),
  monitored: [],
  drafts: [],
  followUps: [],
  summary: {
    monitoredCount: 0,
    draftCount: 0,
    followUpCount: 0,
    groupCount: 0,
    directCount: 0,
    dueSoonCount: 0,
    dueNowCount: 0,
    overdueCount: 0,
    needsReviewCount: 0,
    openCount: 0,
  },
});

export type DashboardDataMode = DashboardSiteMode;

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

function isEmailDashboardSourceSnapshotV1(
  value: unknown,
): value is EmailDashboardSourceSnapshotV1 {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== "email-dashboard-source/v1") return false;
  if (value.source !== "email") return false;
  if (value.sourcePath !== "dashboard/v1/email/latest.json") return false;
  if (typeof value.dataGeneratedAt !== "string") return false;
  if (typeof value.inboxQuery !== "string") return false;
  if (!Array.isArray(value.items)) return false;

  // Validate summary counts
  const summary = value.summary;
  if (!isRecord(summary)) return false;
  if (typeof summary.itemCount !== "number") return false;
  if (typeof summary.actionCount !== "number") return false;
  if (typeof summary.proposedCount !== "number") return false;
  if (typeof summary.confirmedCount !== "number") return false;
  if (typeof summary.noActionCount !== "number") return false;
  if (
    summary.itemCount !==
    summary.actionCount + summary.noActionCount
  )
    return false;
  if (summary.actionCount !== summary.proposedCount + summary.confirmedCount)
    return false;

  // Validate rows
  const rows = value.items as unknown[];
  for (const row of rows) {
    if (!isRecord(row)) return false;
    if (typeof row.id !== "string") return false;
    if (typeof row.subject !== "string") return false;
    if (typeof row.receivedAt !== "string" || row.receivedAt.trim() === "") return false;
    if (row.receivedDateTime !== undefined && typeof row.receivedDateTime !== "string") return false;
    if (!Array.isArray(row.labels)) return false;
    if (!row.labels.every((l: unknown) => typeof l === "string")) return false;

    const action = row.identifiedAction;
    if (action !== undefined) {
      if (!isRecord(action)) return false;
      if (action.state !== "proposed" && action.state !== "confirmed")
        return false;
      if (typeof action.label !== "string" || action.label.trim() === "") return false;
      if (typeof action.actionPhrase !== "string") return false;
      if (
        action.derivedBy === undefined ||
        !(["monitor_inference", "rule", "human_confirmed"] as string[]).includes(
          action.derivedBy as string,
        )
      )
        return false;
    }
  }

  return true;
}

/**
 * Legacy email source snapshot validator (email-source/v1 with generatedAt).
 * Used only for backward compatibility with existing legacy blobs.
 */
function isLegacyEmailSourceSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.items)
  );
}

/**
 * Current email source snapshot (specs 012/007/008).
 */
export type EmailSourceSnapshot = EmailDashboardSourceSnapshotV1;

export type WhatsAppSourceSnapshot = WhatsAppDashboardSourceSnapshotV1;

export interface WhatsAppSourceReadResult {
  mode: DashboardDataMode;
  snapshot: WhatsAppSourceSnapshot | null;
  warning?: string;
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

function isWhatsAppTimelineDirection(value: unknown): value is "incoming" | "outgoing" | "system" {
  return value === "incoming" || value === "outgoing" || value === "system";
}

function isWhatsAppConversationRowV1(value: unknown): value is WhatsAppConversationRowV1 {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isWhatsAppConversationKind(value.conversationKind) &&
    typeof value.displayName === "string" &&
    typeof value.lastMessageSummary === "string" &&
    isReviewMessageExcerpt(value.reviewMessageExcerpt) &&
    (value.timeline === undefined ||
      (Array.isArray(value.timeline) &&
        value.timeline.length <= 20 &&
        value.timeline.every(
          (entry) =>
            isRecord(entry) &&
            typeof entry.id === "string" &&
            isWhatsAppTimelineDirection(entry.direction) &&
            typeof entry.summary === "string" &&
            (entry.speakerLabel === undefined || typeof entry.speakerLabel === "string") &&
            (entry.createdAt === undefined || typeof entry.createdAt === "string"),
        )))
  );
}

function isReviewMessageExcerpt(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    typeof value.author === "string" &&
    typeof value.body === "string" &&
    typeof value.sentLabel === "string" &&
    (value.direction === "inbound" || value.direction === "outbound")
  );
}

function isWhatsAppFollowUpRowV1(value: unknown): value is WhatsAppFollowUpRowV1 {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.conversationId === "string" &&
    isWhatsAppConversationKind(value.conversationKind) &&
    typeof value.displayName === "string" &&
    isWhatsAppFollowUpState(value.state) &&
    typeof value.title === "string" &&
    (value.contextSummary === undefined || typeof value.contextSummary === "string") &&
    isReviewMessageExcerpt(value.reviewMessageExcerpt)
  );
}

function deriveWhatsAppSummary(
  monitored: Array<WhatsAppConversationRowV1 | WhatsAppConversationItem>,
  drafts: Array<WhatsAppConversationRowV1 | WhatsAppConversationItem>,
  followUps: Array<WhatsAppFollowUpRowV1 | WhatsAppFollowUpItem>,
): WhatsAppDashboardSummaryV1 {
  const conversationKinds = [...monitored, ...drafts].map(
    (item) => "conversationKind" in item && item.conversationKind ? item.conversationKind : "kind" in item ? item.kind : undefined,
  );
  const followUpKinds = followUps.map(
    (item) => "conversationKind" in item && item.conversationKind ? item.conversationKind : "kind" in item ? item.kind : undefined,
  );
  const allKinds = [...conversationKinds, ...followUpKinds];
  return {
    monitoredCount: monitored.length,
    draftCount: drafts.length,
    followUpCount: followUps.length,
    groupCount: allKinds.filter((kind) => kind === "group").length,
    directCount: allKinds.filter((kind) => kind === "direct").length,
    dueSoonCount: followUps.filter((item) => item.state === "due_soon").length,
    dueNowCount: followUps.filter((item) => item.state === "due_now").length,
    overdueCount: followUps.filter((item) => item.state === "overdue").length,
    needsReviewCount: followUps.filter((item) => item.state === "needs_review").length,
    openCount:
      monitored.length +
      drafts.length +
      followUps.filter((item) => !["resolved", "suppressed"].includes(item.state)).length,
  };
}

function summaryMatchesWhatsAppSnapshot(value: WhatsAppDashboardSourceSnapshotV1): boolean {
  const expected = deriveWhatsAppSummary(value.monitored, value.drafts, value.followUps);
  return (
    value.summary.monitoredCount === expected.monitoredCount &&
    value.summary.draftCount === expected.draftCount &&
    value.summary.followUpCount === expected.followUpCount
  );
}

function isWhatsAppSourceSnapshot(value: unknown): value is WhatsAppDashboardSourceSnapshotV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === "whatsapp-dashboard-source/v1" &&
    value.source === "whatsapp" &&
    value.sourcePath === WHATSAPP_SOURCE_BLOB_PATH &&
    typeof value.dataGeneratedAt === "string" &&
    Array.isArray(value.monitored) &&
    value.monitored.every(isWhatsAppConversationRowV1) &&
    Array.isArray(value.drafts) &&
    value.drafts.every(isWhatsAppConversationRowV1) &&
    Array.isArray(value.followUps) &&
    value.followUps.every(isWhatsAppFollowUpRowV1) &&
    isRecord(value.summary) &&
    typeof value.summary.monitoredCount === "number" &&
    typeof value.summary.draftCount === "number" &&
    typeof value.summary.followUpCount === "number" &&
    summaryMatchesWhatsAppSnapshot(value as unknown as WhatsAppDashboardSourceSnapshotV1)
  );
}

function timelineEntryToUi(entry: WhatsAppConversationHistoryEntryV1) {
  return {
    id: entry.id,
    speaker: entry.speakerLabel ?? "Conversation",
    direction:
      entry.direction === "incoming"
        ? ("inbound" as const)
        : entry.direction === "outgoing"
          ? ("outbound" as const)
          : ("system" as const),
    summary: entry.summary,
    sentAt: entry.createdAt ?? "",
  };
}

function whatsAppConversationRowToUi(row: WhatsAppConversationRowV1): WhatsAppConversationItem {
  return {
    id: row.id,
    kind: row.conversationKind,
    conversationKind: row.conversationKind,
    displayName: row.displayName,
    lastMessageSummary: row.lastMessageSummary,
    lastMessageAt: row.lastMessageAt,
    lastMessageRelativeLabel: row.lastMessageRelativeLabel,
    listNotes: row.listNotes,
    pendingDraftSnippet: row.draftSummary,
    draftSummary: row.draftSummary,
    state: row.state,
    historySummary: row.historySummary,
    timeline: (row.timeline ?? []).map(timelineEntryToUi),
    reviewMessageExcerpt: row.reviewMessageExcerpt,
  };
}

function whatsAppFollowUpRowToUi(row: WhatsAppFollowUpRowV1): WhatsAppFollowUpItem {
  return {
    id: row.id,
    conversationId: row.conversationId,
    kind: row.conversationKind,
    conversationKind: row.conversationKind,
    displayName: row.displayName,
    state: row.state,
    title: row.title,
    dueAt: row.dueAt,
    relativeDueLabel: row.dueRelativeLabel,
    dueRelativeLabel: row.dueRelativeLabel,
    contextSummary: row.contextSummary ?? row.topicSummary ?? row.lastMessageSummary ?? "",
    reviewMessageExcerpt: row.reviewMessageExcerpt,
  };
}

function whatsAppSourceSnapshotToUi(snapshot: WhatsAppDashboardSourceSnapshotV1): WhatsAppDashboardSnapshot {
  return {
    schemaVersion: snapshot.schemaVersion,
    source: snapshot.source,
    sourcePath: snapshot.sourcePath,
    generatedAt: snapshot.dataGeneratedAt,
    dataGeneratedAt: snapshot.dataGeneratedAt,
    monitored: snapshot.monitored.map(whatsAppConversationRowToUi),
    drafts: snapshot.drafts.map(whatsAppConversationRowToUi),
    followUps: snapshot.followUps.map(whatsAppFollowUpRowToUi),
    summary: snapshot.summary,
    metadata: snapshot.metadata,
  };
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

function emailDashboardRowToInboxItem(row: EmailDashboardRowV1): EmailInboxItem {
  return {
    id: row.id,
    receivedDateTime: row.receivedAt ?? row.receivedDateTime ?? "",
    labels: row.labels,
    subject: row.subject,
    identifiedAction: row.identifiedAction
      ? {
          state: row.identifiedAction.state,
          actionPhrase: row.identifiedAction.actionPhrase,
          actionType: row.identifiedAction.actionType,
        }
      : undefined,
  };
}

function formatEmailDashboardRowDisplay(row: EmailDashboardRowV1): EmailInboxDisplayItem {
  const item = emailDashboardRowToInboxItem(row);
  return {
    ...formatEmailInboxDisplay(item),
    ...(row.receivedDateLabel ? { receivedLabel: row.receivedDateLabel } : {}),
    ...(row.receivedTimeLabel ? { receivedTime: row.receivedTimeLabel } : {}),
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

export async function readDashboardSnapshot(
  siteMode: DashboardSiteMode = getSiteMode().mode,
): Promise<DashboardReadResult> {
  const snapshotUrl = process.env[DASHBOARD_SNAPSHOT_URL_ENV];

  if (snapshotUrl) {
    try {
      const payload = await readJsonFromUrl(snapshotUrl);
      if (!isDashboardSnapshot(payload)) {
        throw new Error("Snapshot payload did not match dashboard-snapshot/v1");
      }

      return {
        mode: "live",
        snapshot: {
          ...payload,
          summary: payload.summary ?? buildSummary(payload),
        },
      };
    } catch (error) {
      return {
        mode: "live",
        snapshot: emptyDashboardSnapshot(),
        warning:
          error instanceof Error
            ? `Dashboard snapshot unavailable: ${error.message}`
            : "Dashboard snapshot unavailable.",
      };
    }
  }

  return {
    mode: "live",
    snapshot: emptyDashboardSnapshot(),
    warning: "Dashboard snapshot unavailable.",
  };
}

export async function readEmailSourceSnapshot(
  siteMode: DashboardSiteMode = getSiteMode().mode,
): Promise<EmailSourceReadResult> {
  const text = await readBlobText(EMAIL_SOURCE_BLOB_PATH);
  // Treat null (not found), empty, or whitespace-only as unavailable
  if (text === null || text.trim() === "") {
    return {
      mode: "live",
      snapshot: null,
      warning: "Email snapshot unavailable.",
    };
  }
  try {
    const payload = JSON.parse(text);
    // Try current email-dashboard-source/v1 first
    if (isEmailDashboardSourceSnapshotV1(payload)) {
      return { mode: "live", snapshot: payload };
    }
    // Fall back to legacy email-source/v1 for existing fixtures/blobs
    if (isLegacyEmailSourceSnapshot(payload)) {
      // Re-wrap in legacy shape for backward compat
      return { mode: "live", snapshot: payload as unknown as EmailSourceSnapshot };
    }
    throw new Error("Email source snapshot did not match expected schema");
  } catch (error) {
    // When the user explicitly chose live and Blob is available, a per-source
    // validation failure must surface a warning and return null snapshot instead; the page stays live.
    return {
      mode: "live",
      snapshot: null,
      warning:
        error instanceof Error
          ? `Email snapshot malformed: ${error.message}`
          : "Email snapshot malformed.",
    };
  }
}

/**
 * Read WhatsApp source snapshot from its deterministic Blob path (specs 007/008).
 * Falls back to null + warning when missing/malformed.
 */
export async function readWhatsAppSourceSnapshot(
  siteMode: DashboardSiteMode = getSiteMode().mode,
): Promise<WhatsAppSourceReadResult> {
  const text = await readBlobText(WHATSAPP_SOURCE_BLOB_PATH);
  if (text === null || text.trim() === "") {
    return {
      mode: "live",
      snapshot: null,
      warning: "WhatsApp snapshot unavailable.",
    };
  }
  try {
    const payload = JSON.parse(text);
    if (!isWhatsAppSourceSnapshot(payload)) {
      throw new Error("WhatsApp source snapshot did not match expected schema");
    }
    return { mode: "live", snapshot: payload };
  } catch (error) {
    // When the user explicitly chose live and Blob is available, a per-source
    // validation failure must surface a warning and return null snapshot instead; the page stays live.
    return {
      mode: "live",
      snapshot: null,
      warning:
        error instanceof Error
          ? `WhatsApp snapshot malformed: ${error.message}`
          : "WhatsApp snapshot malformed.",
    };
  }
}

export async function readEmailInboxItems(
  siteMode: DashboardSiteMode = getSiteMode().mode,
): Promise<EmailInboxReadResult> {
  // Priority 1: deterministic blob path (spec 007/008)
  const text = await readBlobText(EMAIL_SOURCE_BLOB_PATH);
  // Treat null (not found), empty, or whitespace-only as unavailable
  if (text !== null && text.trim() !== "") {
    try {
      const payload = JSON.parse(text);
      if (isEmailDashboardSourceSnapshotV1(payload)) {
        return {
          mode: "live",
          items: payload.items.map(formatEmailDashboardRowDisplay),
        };
      }
      if (!isLegacyEmailSourceSnapshot(payload)) {
        throw new Error("Email source snapshot did not match expected schema");
      }
      if (!payload.items.every(isEmailInboxItem)) {
        throw new Error("Email items did not match expected shape");
      }
      return {
        mode: "live",
        items: payload.items.map(formatEmailInboxDisplay),
      };
    } catch (error) {
      return {
        mode: "live",
        items: [],
        warning:
          error instanceof Error
            ? `Email snapshot malformed: ${error.message}`
            : "Email snapshot malformed.",
      };
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
        mode: "live",
        items: payload.map(formatEmailInboxDisplay),
      };
    } catch (error) {
      return {
        mode: "live",
        items: [],
        warning:
          error instanceof Error
            ? `Email inbox snapshot unavailable: ${error.message}`
            : "Email inbox snapshot unavailable.",
      };
    }
  }

  return {
    mode: "live",
    items: [],
    warning: "Email inbox snapshot unavailable.",
  };
}

export async function readWhatsAppDashboardData(
  siteMode: DashboardSiteMode = getSiteMode().mode,
): Promise<WhatsAppDashboardReadResult> {
  const sourceResult = await readWhatsAppSourceSnapshot(siteMode);
  if (sourceResult.snapshot) {
    return {
      mode: sourceResult.mode,
      snapshot: whatsAppSourceSnapshotToUi(sourceResult.snapshot),
      warning: sourceResult.warning,
    };
  }

  const dashboardUrl = process.env[WHATSAPP_DASHBOARD_URL_ENV];

  if (dashboardUrl) {
    try {
      const payload = await readJsonFromUrl(dashboardUrl);
      if (!isWhatsAppDashboardSnapshot(payload)) {
        throw new Error("WhatsApp dashboard payload did not match the expected shape");
      }

      return {
        mode: "live",
        snapshot: payload,
      };
    } catch (error) {
      return {
        mode: "live",
        snapshot: emptyWhatsAppDashboardSnapshot(),
        warning:
          error instanceof Error
            ? `WhatsApp dashboard snapshot unavailable: ${error.message}`
            : "WhatsApp dashboard snapshot unavailable.",
      };
    }
  }

  return {
    mode: "live",
    snapshot: emptyWhatsAppDashboardSnapshot(),
    warning: sourceResult.warning ?? "WhatsApp snapshot unavailable.",
  };
}

export function getEffectiveRenderMode(): "live" {
  return "live";
}


