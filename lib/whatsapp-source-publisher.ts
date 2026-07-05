/**
 * WhatsApp Dashboard Source Publisher helper (specs 011/008/007).
 *
 * Provides sanitisation helpers for monitor-side scripts that produce
 * dashboard WhatsApp snapshots and publish them via POST /api/dashboard/sync.
 *
 * Privacy rules enforced here (spec 011 FR-003):
 *   - No raw WhatsApp JIDs or phone numbers.
 *   - No local media paths or raw message exports.
 *   - No draft packet IDs or approval payloads.
 *   - No unbounded transcript dumps.
 *   - Rows use safe configured display labels only.
 *
 * Usage in monitor-side scripts:
 *   const snapshot = buildWhatsAppDashboardSnapshot({ monitored, drafts, followUps });
 *   await publishWhatsAppDashboardSnapshot(snapshot);
 */

import "server-only";
import type {
  WhatsAppConversationItem,
  WhatsAppConversationKind,
  WhatsAppDashboardSnapshot,
  WhatsAppFollowUpItem,
  WhatsAppFollowUpState,
  WhatsAppMessageTimelineEntry,
} from "@/lib/dashboard-types";

// ---------------------------------------------------------------------------
// Internal types used by monitor-side scripts (not exported to public types)
// ---------------------------------------------------------------------------

interface MonitorConversation {
  id: string;
  kind: WhatsAppConversationKind;
  displayName: string;
  lastMessageSummary: string;
  lastMessageAt?: string;
  listNotes?: string[];
  pendingDraftSnippet?: string;
  historySummary?: string;
  timeline: MonitorTimelineEntry[];
}

interface MonitorTimelineEntry {
  id: string;
  speaker: string;
  direction: "inbound" | "outbound" | "system";
  summary: string;
  sentAt: string;
}

interface MonitorFollowUp {
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

interface BuildOptions {
  monitored: MonitorConversation[];
  drafts: MonitorConversation[];
  followUps: MonitorFollowUp[];
}

// ---------------------------------------------------------------------------
// Build a complete WhatsApp source snapshot (spec 011 FR-001)
// ---------------------------------------------------------------------------

/**
 * Build a WhatsAppDashboardSnapshot from monitor-side conversation/follow-up state.
 * This is the monitor-side entry point — it applies all sanitisation rules before
 * the snapshot is sent to the dashboard sync endpoint.
 */
export function buildWhatsAppDashboardSnapshot(options: BuildOptions): WhatsAppDashboardSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    monitored: options.monitored.map(sanitiseConversation),
    drafts: options.drafts.map(sanitiseConversation),
    followUps: options.followUps.map(sanitiseFollowUp),
  };
}

// ---------------------------------------------------------------------------
// Privacy sanitisation
// ---------------------------------------------------------------------------

/**
 * Convert a monitor-side conversation to a dashboard-safe WhatsAppConversationItem.
 * Enforces spec 011 FR-003 privacy exclusions:
 *   - No raw JIDs / phone numbers (must use displayName)
 *   - No local media paths
 *   - No raw message exports
 *   - No draft packet IDs / approval payloads
 *   - Bounded sanitised timeline
 */
function sanitiseConversation(conv: MonitorConversation): WhatsAppConversationItem {
  return {
    id: conv.id,
    kind: conv.kind,
    displayName: conv.displayName,
    lastMessageSummary: conv.lastMessageSummary,
    lastMessageAt: conv.lastMessageAt,
    listNotes: conv.listNotes,
    pendingDraftSnippet: conv.pendingDraftSnippet,
    historySummary: conv.historySummary,
    timeline: conv.timeline.slice(0, MAX_TIMELINE_ENTRIES).map(sanitiseTimelineEntry),
  };
}

function sanitiseTimelineEntry(entry: MonitorTimelineEntry): WhatsAppMessageTimelineEntry {
  return {
    id: entry.id,
    speaker: entry.speaker,
    direction: entry.direction,
    summary: entry.summary,
    sentAt: entry.sentAt,
  };
}

function sanitiseFollowUp(item: MonitorFollowUp): WhatsAppFollowUpItem {
  return {
    id: item.id,
    conversationId: item.conversationId,
    kind: item.kind,
    displayName: item.displayName,
    state: item.state,
    title: item.title,
    dueAt: item.dueAt,
    relativeDueLabel: item.relativeDueLabel,
    contextSummary: item.contextSummary,
  };
}

// ---------------------------------------------------------------------------
// Snapshot validation before publish (spec 011 FR-007)
// ---------------------------------------------------------------------------

/**
 * Validate a WhatsAppDashboardSnapshot before sending it to the sync endpoint.
 * Returns true if the snapshot is safe to publish; throws with a descriptive
 * message if validation fails (spec 011 FR-007: "if validation fails, no write should occur").
 */
export function validateWhatsAppSnapshot(snapshot: WhatsAppDashboardSnapshot): void {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot must be a non-null object");
  }
  if (typeof snapshot.generatedAt !== "string" || snapshot.generatedAt.trim() === "") {
    throw new Error("Snapshot must have a non-empty generatedAt string");
  }
  if (!Array.isArray(snapshot.monitored)) {
    throw new Error("Snapshot must have a monitored array");
  }
  if (!Array.isArray(snapshot.drafts)) {
    throw new Error("Snapshot must have a drafts array");
  }
  if (!Array.isArray(snapshot.followUps)) {
    throw new Error("Snapshot must have a followUps array");
  }
  for (const conv of snapshot.monitored) {
    validateConversation("monitored", conv);
  }
  for (const conv of snapshot.drafts) {
    validateConversation("drafts", conv);
  }
  for (const item of snapshot.followUps) {
    validateFollowUp(item);
  }
}

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

function validateConversation(listName: string, conv: unknown): void {
  if (!conv || typeof conv !== "object") {
    throw new Error(`${listName}: each entry must be a non-null object`);
  }
  const c = conv as Record<string, unknown>;
  if (typeof c.id !== "string" || c.id.trim() === "") {
    throw new Error(`${listName}: each conversation must have a non-empty id`);
  }
  if (!VALID_KINDS.has(c.kind as string)) {
    throw new Error(`${listName}: conversation kind must be "group" or "direct"`);
  }
  if (typeof c.displayName !== "string" || c.displayName.trim() === "") {
    throw new Error(`${listName}: each conversation must have a non-empty displayName`);
  }
  if (typeof c.lastMessageSummary !== "string") {
    throw new Error(`${listName}: each conversation must have a lastMessageSummary string`);
  }
  if (!Array.isArray(c.timeline)) {
    throw new Error(`${listName}: each conversation must have a timeline array`);
  }
  if (c.timeline.length > MAX_TIMELINE_ENTRIES) {
    throw new Error(`${listName}: timeline must not exceed ${MAX_TIMELINE_ENTRIES} entries`);
  }
}

function validateFollowUp(item: unknown): void {
  if (!item || typeof item !== "object") {
    throw new Error("followUps: each entry must be a non-null object");
  }
  const f = item as Record<string, unknown>;
  if (typeof f.id !== "string" || f.id.trim() === "") {
    throw new Error("followUps: each item must have a non-empty id");
  }
  if (typeof f.conversationId !== "string" || f.conversationId.trim() === "") {
    throw new Error("followUps: each item must have a non-empty conversationId");
  }
  if (!VALID_KINDS.has(f.kind as string)) {
    throw new Error("followUps: item kind must be \"group\" or \"direct\"");
  }
  if (typeof f.displayName !== "string" || f.displayName.trim() === "") {
    throw new Error("followUps: each item must have a non-empty displayName");
  }
  if (!VALID_STATES.has(f.state as string)) {
    throw new Error("followUps: item state must be a valid WhatsAppFollowUpState");
  }
  if (typeof f.title !== "string" || f.title.trim() === "") {
    throw new Error("followUps: each item must have a non-empty title");
  }
  if (typeof f.contextSummary !== "string") {
    throw new Error("followUps: each item must have a contextSummary string");
  }
}

// ---------------------------------------------------------------------------
// Sync result reporting (spec 008 FR-009)
// ---------------------------------------------------------------------------

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

/**
 * Parse the dashboard sync response into a safe report suitable for cron logs.
 * Safe fields only: source key, path, generated timestamp, item counts, write status.
 * Never includes: raw JIDs, phone numbers, tokens, local paths, sender details.
 */
export function parseWhatsAppSyncResponse(
  response: { ok: boolean; path?: string; written?: boolean; skipped?: boolean; error?: string },
  snapshot: WhatsAppDashboardSnapshot,
): WhatsAppSyncReport {
  return {
    source: "whatsapp",
    path: response.path ?? "dashboard/v1/whatsapp/latest.json",
    generatedAt: snapshot.generatedAt,
    itemCounts: {
      monitored: snapshot.monitored.length,
      drafts: snapshot.drafts.length,
      followUps: snapshot.followUps.length,
    },
    written: response.written ?? false,
    skipped: response.skipped,
    error: response.error,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum timeline entries per conversation to prevent unbounded transcript dumps (spec 011 FR-005) */
const MAX_TIMELINE_ENTRIES = 20;
