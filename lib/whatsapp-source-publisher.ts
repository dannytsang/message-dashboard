import "server-only";
import { createHash } from "node:crypto";
import type {
  WhatsAppConversationHistoryEntryV1,
  WhatsAppConversationKind,
  WhatsAppConversationRowV1,
  WhatsAppDashboardSourceMetadataV1,
  WhatsAppDashboardSourceSnapshotV1,
  WhatsAppDashboardSummaryV1,
  WhatsAppFollowUpRowV1,
  WhatsAppFollowUpState,
  WhatsAppTimelineDirection,
} from "@/lib/dashboard-types";
import { WHATSAPP_SOURCE_PATH } from "@/lib/blob-storage";

/**
 * WhatsApp Dashboard Source Publisher helper (specs 011/008/007).
 *
 * Builds the canonical whatsapp-dashboard-source/v1 payload expected by
 * POST /api/dashboard/sync. The helper intentionally produces source rows,
 * not UI-only runtime rows, so the monitor, sync route, Summary page, and
 * /whatsapp page all share the same source contract.
 *
 * Privacy rules enforced here:
 * - no raw WhatsApp JIDs or phone numbers;
 * - no local media paths or raw exports;
 * - no draft packet IDs or approval payloads;
 * - no unbounded transcript dumps;
 * - rows use safe configured display labels only.
 */

interface MonitorConversation {
  id: string;
  kind?: WhatsAppConversationKind;
  conversationKind?: WhatsAppConversationKind;
  displayName: string;
  lastMessageSummary: string;
  lastMessageAt?: string;
  lastMessageRelativeLabel?: string;
  listNotes?: string[];
  pendingDraftSnippet?: string;
  draftSummary?: string;
  state?: WhatsAppConversationRowV1["state"];
  historySummary?: string;
  timeline?: MonitorTimelineEntry[];
}

interface MonitorTimelineEntry {
  id: string;
  speaker?: string;
  speakerLabel?: string;
  direction: "inbound" | "outbound" | "incoming" | "outgoing" | "system";
  summary: string;
  sentAt?: string;
  createdAt?: string;
  relativeLabel?: string;
}

interface MonitorFollowUp {
  id: string;
  conversationId: string;
  kind?: WhatsAppConversationKind;
  conversationKind?: WhatsAppConversationKind;
  displayName: string;
  state: WhatsAppFollowUpState;
  title: string;
  dueAt?: string;
  relativeDueLabel?: string;
  dueRelativeLabel?: string;
  lastMessageSummary?: string;
  lastMessageAt?: string;
  topicSummary?: string;
  contextSummary?: string;
  confidenceLabel?: "low" | "medium" | "high";
}

interface BuildOptions {
  monitored: MonitorConversation[];
  drafts: MonitorConversation[];
  followUps: MonitorFollowUp[];
  dataGeneratedAt?: string;
  metadata?: WhatsAppDashboardSourceMetadataV1;
}

const MAX_TIMELINE_ENTRIES = 20;
const VALID_KINDS = new Set(["group", "direct"]);
const VALID_STATES = new Set([
  "proposed",
  "scheduled",
  "due_soon",
  "due_now",
  "overdue",
  "needs_review",
  "resolved",
  "suppressed",
]);

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalDirection(direction: MonitorTimelineEntry["direction"]): WhatsAppTimelineDirection {
  if (direction === "inbound") return "incoming";
  if (direction === "outbound") return "outgoing";
  return direction;
}

function sanitiseTimelineEntry(entry: MonitorTimelineEntry): WhatsAppConversationHistoryEntryV1 {
  return {
    id: entry.id,
    speakerLabel: entry.speakerLabel ?? entry.speaker,
    direction: canonicalDirection(entry.direction),
    summary: entry.summary,
    createdAt: entry.createdAt ?? entry.sentAt,
    relativeLabel: entry.relativeLabel,
  };
}

function conversationKind(item: { kind?: WhatsAppConversationKind; conversationKind?: WhatsAppConversationKind }): WhatsAppConversationKind {
  const kind = item.conversationKind ?? item.kind;
  if (!kind) throw new Error("Conversation kind is required");
  return kind;
}

function sanitiseConversation(conv: MonitorConversation): WhatsAppConversationRowV1 {
  return {
    id: conv.id,
    conversationKind: conversationKind(conv),
    displayName: conv.displayName,
    lastMessageSummary: conv.lastMessageSummary,
    lastMessageAt: conv.lastMessageAt,
    lastMessageRelativeLabel: conv.lastMessageRelativeLabel,
    draftSummary: conv.draftSummary ?? conv.pendingDraftSnippet,
    state: conv.state,
    listNotes: conv.listNotes,
    historySummary: conv.historySummary,
    timeline: (conv.timeline ?? []).slice(0, MAX_TIMELINE_ENTRIES).map(sanitiseTimelineEntry),
  };
}

function sanitiseFollowUp(item: MonitorFollowUp): WhatsAppFollowUpRowV1 {
  return {
    id: item.id,
    conversationId: item.conversationId,
    conversationKind: conversationKind(item),
    displayName: item.displayName,
    state: item.state,
    title: item.title,
    dueAt: item.dueAt,
    dueRelativeLabel: item.dueRelativeLabel ?? item.relativeDueLabel,
    lastMessageSummary: item.lastMessageSummary,
    lastMessageAt: item.lastMessageAt,
    topicSummary: item.topicSummary,
    contextSummary: item.contextSummary,
    confidenceLabel: item.confidenceLabel,
  };
}

function deriveSummary(
  monitored: WhatsAppConversationRowV1[],
  drafts: WhatsAppConversationRowV1[],
  followUps: WhatsAppFollowUpRowV1[],
): WhatsAppDashboardSummaryV1 {
  const allKinds = [
    ...monitored.map((item) => item.conversationKind),
    ...drafts.map((item) => item.conversationKind),
    ...followUps.map((item) => item.conversationKind),
  ];
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

function businessHash(snapshot: Pick<WhatsAppDashboardSourceSnapshotV1, "schemaVersion" | "source" | "sourcePath" | "monitored" | "drafts" | "followUps" | "summary">): string {
  return sha256Hex(stableJson(snapshot));
}

export function buildWhatsAppDashboardSnapshot(options: BuildOptions): WhatsAppDashboardSourceSnapshotV1 {
  const monitored = options.monitored.map(sanitiseConversation);
  const drafts = options.drafts.map(sanitiseConversation);
  const followUps = options.followUps.map(sanitiseFollowUp);
  const summary = deriveSummary(monitored, drafts, followUps);
  const base = {
    schemaVersion: "whatsapp-dashboard-source/v1" as const,
    source: "whatsapp" as const,
    sourcePath: "dashboard/v1/whatsapp/latest.json" as const,
    monitored,
    drafts,
    followUps,
    summary,
  };
  const businessContentHash = businessHash(base);
  const snapshot: WhatsAppDashboardSourceSnapshotV1 = {
    ...base,
    dataGeneratedAt: options.dataGeneratedAt ?? new Date().toISOString(),
    metadata: {
      ...options.metadata,
      businessContentHash: options.metadata?.businessContentHash ?? businessContentHash,
      publisher: options.metadata?.publisher ?? "whatsapp-monitor",
    },
  };
  validateWhatsAppSnapshot(snapshot);
  return snapshot;
}

export function validateWhatsAppSnapshot(snapshot: WhatsAppDashboardSourceSnapshotV1): void {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot must be a non-null object");
  }
  if (snapshot.schemaVersion !== "whatsapp-dashboard-source/v1") {
    throw new Error("Snapshot must use schemaVersion whatsapp-dashboard-source/v1");
  }
  if (snapshot.source !== "whatsapp" || snapshot.sourcePath !== WHATSAPP_SOURCE_PATH) {
    throw new Error("Snapshot must use the deterministic WhatsApp source path");
  }
  if (typeof snapshot.dataGeneratedAt !== "string" || snapshot.dataGeneratedAt.trim() === "") {
    throw new Error("Snapshot must have a non-empty dataGeneratedAt string");
  }
  if (!Array.isArray(snapshot.monitored) || !Array.isArray(snapshot.drafts) || !Array.isArray(snapshot.followUps)) {
    throw new Error("Snapshot must include monitored, drafts, and followUps arrays");
  }
  snapshot.monitored.forEach((item, index) => validateConversation(`monitored[${index}]`, item));
  snapshot.drafts.forEach((item, index) => validateConversation(`drafts[${index}]`, item));
  snapshot.followUps.forEach((item, index) => validateFollowUp(`followUps[${index}]`, item));
  const expected = deriveSummary(snapshot.monitored, snapshot.drafts, snapshot.followUps);
  if (
    snapshot.summary.monitoredCount !== expected.monitoredCount ||
    snapshot.summary.draftCount !== expected.draftCount ||
    snapshot.summary.followUpCount !== expected.followUpCount
  ) {
    throw new Error("Snapshot summary counts must match published arrays");
  }
}

function validateConversation(label: string, conv: WhatsAppConversationRowV1): void {
  if (typeof conv.id !== "string" || conv.id.trim() === "") throw new Error(`${label}: id is required`);
  if (!VALID_KINDS.has(conv.conversationKind)) throw new Error(`${label}: conversationKind is invalid`);
  if (typeof conv.displayName !== "string" || conv.displayName.trim() === "") throw new Error(`${label}: displayName is required`);
  if (typeof conv.lastMessageSummary !== "string") throw new Error(`${label}: lastMessageSummary is required`);
  if ((conv.timeline ?? []).length > MAX_TIMELINE_ENTRIES) throw new Error(`${label}: timeline exceeds ${MAX_TIMELINE_ENTRIES}`);
}

function validateFollowUp(label: string, item: WhatsAppFollowUpRowV1): void {
  if (typeof item.id !== "string" || item.id.trim() === "") throw new Error(`${label}: id is required`);
  if (typeof item.conversationId !== "string" || item.conversationId.trim() === "") throw new Error(`${label}: conversationId is required`);
  if (!VALID_KINDS.has(item.conversationKind)) throw new Error(`${label}: conversationKind is invalid`);
  if (typeof item.displayName !== "string" || item.displayName.trim() === "") throw new Error(`${label}: displayName is required`);
  if (!VALID_STATES.has(item.state)) throw new Error(`${label}: state is invalid`);
  if (typeof item.title !== "string" || item.title.trim() === "") throw new Error(`${label}: title is required`);
}

export interface WhatsAppSyncReport {
  source: "whatsapp";
  path: string;
  generatedAt: string;
  itemCounts: {
    monitored: number;
    drafts: number;
    followUps: number;
  };
  written: boolean;
  skipped?: boolean;
  error?: string;
}

export function parseWhatsAppSyncResponse(
  response: { ok: boolean; path?: string; written?: boolean; skipped?: boolean; error?: string },
  snapshot: WhatsAppDashboardSourceSnapshotV1,
): WhatsAppSyncReport {
  return {
    source: "whatsapp",
    path: response.path ?? WHATSAPP_SOURCE_PATH,
    generatedAt: snapshot.dataGeneratedAt,
    itemCounts: {
      monitored: snapshot.summary.monitoredCount,
      drafts: snapshot.summary.draftCount,
      followUps: snapshot.summary.followUpCount,
    },
    written: response.written ?? false,
    skipped: response.skipped,
    error: response.error,
  };
}
