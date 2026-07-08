/**
 * POST /api/dashboard/sync
 *
 * Accepts a sanitised dashboard source snapshot from monitor-side sync scripts
 * and writes it to the appropriate Vercel Blob path (specs 007/008).
 *
 * Authenticated with `x-dashboard-secret` header using COMS_DASHBOARD_DATA_SECRET.
 *
 * Request body shape for email source:
 *   {
 *     "source": "email",
 *     "items": EmailInboxItem[],
 *     "summary": { "total": number, "withAction": number, ... },
 *     "dataGeneratedAt": "2026-07-02T12:00:00+00:00",
 *   }
 *
 * Request body shape for WhatsApp source:
 *   {
 *     "schemaVersion": "whatsapp-dashboard-source/v1",
 *     "source": "whatsapp",
 *     "sourcePath": "dashboard/v1/whatsapp/latest.json",
 *     "dataGeneratedAt": "2026-07-02T12:00:00+00:00",
 *     "summary": { "monitoredCount": number, "draftCount": number, "followUpCount": number },
 *     "monitored": WhatsAppConversationRowV1[],
 *     "drafts": WhatsAppConversationRowV1[],
 *     "followUps": WhatsAppFollowUpRowV1[],
 *   }
 *
 * Response:
 *   200 { "ok": true, "source": "email"|"whatsapp", "path": "...", "written": true|false, "skipped"?: true }
 *   400 { "error": "Invalid source key" | "Invalid payload" }
 *   401 { "error": "Unauthorized" }
 *   500 { "error": "Server not configured" | "Failed to store data" }
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { VercelBlobStorageClient, EMAIL_SOURCE_PATH, WHATSAPP_SOURCE_PATH } from "@/lib/blob-storage";
import type {
  EmailActionState,
  EmailDashboardRowV1,
  WhatsAppConversationKind,
  WhatsAppConversationRowV1,
  WhatsAppDashboardSourceMetadataV1,
  WhatsAppDashboardSummaryV1,
  WhatsAppFollowUpRowV1,
  WhatsAppFollowUpState,
} from "@/lib/dashboard-types";

const DASHBOARD_DATA_SECRET = process.env.COMS_DASHBOARD_DATA_SECRET;

// Deterministic source path map (spec 008 FR-001)
const SOURCE_PATHS: Record<string, string> = {
  email: EMAIL_SOURCE_PATH,
  whatsapp: WHATSAPP_SOURCE_PATH,
};

// ---------------------------------------------------------------------------
// Shared sync result shape
// ---------------------------------------------------------------------------

interface SyncResult {
  ok: boolean;
  source: string;
  path: string;
  written: boolean;
  skipped?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Email snapshot validation (mirrors dashboard-data.ts guard for alignment)
// ---------------------------------------------------------------------------

function isEmailIdentifiedAction(action: unknown): boolean {
  if (action === undefined || action === null) return true;
  if (typeof action !== "object") return false;
  const a = action as Record<string, unknown>;
  return (
    (a.state === ("proposed" satisfies EmailActionState) ||
      a.state === ("confirmed" satisfies EmailActionState)) &&
    typeof a.label === "string" &&
    a.label.trim() !== "" &&
    typeof a.actionPhrase === "string" &&
    a.actionPhrase.trim() !== "" &&
    (a.derivedBy === "monitor_inference" ||
      a.derivedBy === "rule" ||
      a.derivedBy === "human_confirmed") &&
    (a.actionType === undefined || typeof a.actionType === "string")
  );
}

function isEmailDetailContent(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  const detail = value as Record<string, unknown>;
  return typeof detail.contentExcerpt === "string";
}

function isEmailDashboardRow(value: unknown): value is EmailDashboardRowV1 {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.subject === "string" &&
    typeof row.receivedAt === "string" &&
    row.receivedAt.trim() !== "" &&
    (row.receivedDateTime === undefined || typeof row.receivedDateTime === "string") &&
    isEmailDetailContent(row.detail) &&
    Array.isArray(row.labels) &&
    row.labels.every((l) => typeof l === "string") &&
    (row.readState === undefined ||
      row.readState === "read" ||
      row.readState === "unread" ||
      row.readState === "unknown") &&
    isEmailIdentifiedAction(row.identifiedAction)
  );
}

function validateEmailPayload(body: Record<string, unknown>): boolean {
  if (body.schemaVersion !== "email-dashboard-source/v1") return false;
  if (body.source !== "email") return false;
  if (body.sourcePath !== EMAIL_SOURCE_PATH) return false;
  if (typeof body.dataGeneratedAt !== "string") return false;
  if (typeof body.inboxQuery !== "string") return false;
  if (!Array.isArray(body.items) || !body.items.every(isEmailDashboardRow)) return false;
  const items = body.items as EmailDashboardRowV1[];

  const summary = body.summary;
  if (typeof summary !== "object" || summary === null) return false;
  const s = summary as Record<string, unknown>;
  const proposed = items.filter(
    (item) => item.identifiedAction?.state === "proposed",
  ).length;
  const confirmed = items.filter(
    (item) => item.identifiedAction?.state === "confirmed",
  ).length;
  const actionCount = proposed + confirmed;
  return (
    s.itemCount === items.length &&
    s.actionCount === actionCount &&
    s.proposedCount === proposed &&
    s.confirmedCount === confirmed &&
    s.noActionCount === items.length - actionCount
  );
}

// ---------------------------------------------------------------------------
// WhatsApp snapshot validation
// ---------------------------------------------------------------------------

function isWhatsAppTimelineEntry(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    (e.direction === "incoming" || e.direction === "outgoing" || e.direction === "system") &&
    typeof e.summary === "string" &&
    (e.speakerLabel === undefined || typeof e.speakerLabel === "string") &&
    (e.createdAt === undefined || typeof e.createdAt === "string")
  );
}

function isWhatsAppConversationRow(value: unknown): value is WhatsAppConversationRowV1 {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    (c.conversationKind === ("group" satisfies WhatsAppConversationKind) ||
      c.conversationKind === ("direct" satisfies WhatsAppConversationKind)) &&
    typeof c.displayName === "string" &&
    typeof c.lastMessageSummary === "string" &&
    isReviewMessageExcerpt(c.reviewMessageExcerpt) &&
    (c.timeline === undefined ||
      (Array.isArray(c.timeline) && c.timeline.length <= 20 && c.timeline.every(isWhatsAppTimelineEntry)))
  );
}

function isReviewMessageExcerpt(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.author === "string" &&
    typeof r.body === "string" &&
    typeof r.sentLabel === "string" &&
    (r.direction === "inbound" || r.direction === "outbound")
  );
}

function isWhatsAppFollowUpRow(value: unknown): value is WhatsAppFollowUpRowV1 {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    typeof f.conversationId === "string" &&
    (f.conversationKind === ("group" satisfies WhatsAppConversationKind) ||
      f.conversationKind === ("direct" satisfies WhatsAppConversationKind)) &&
    typeof f.displayName === "string" &&
    (f.state === ("proposed" satisfies WhatsAppFollowUpState) ||
      f.state === ("scheduled" satisfies WhatsAppFollowUpState) ||
      f.state === ("due_soon" satisfies WhatsAppFollowUpState) ||
      f.state === ("due_now" satisfies WhatsAppFollowUpState) ||
      f.state === ("overdue" satisfies WhatsAppFollowUpState) ||
      f.state === ("needs_review" satisfies WhatsAppFollowUpState) ||
      f.state === ("resolved" satisfies WhatsAppFollowUpState) ||
      f.state === ("suppressed" satisfies WhatsAppFollowUpState)) &&
    typeof f.title === "string" &&
    (f.contextSummary === undefined || typeof f.contextSummary === "string") &&
    isReviewMessageExcerpt(f.reviewMessageExcerpt)
  );
}

function deriveWhatsAppSummary(
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

function validateWhatsAppPayload(body: Record<string, unknown>): boolean {
  if (body.schemaVersion !== "whatsapp-dashboard-source/v1") return false;
  if (body.source !== "whatsapp") return false;
  if (body.sourcePath !== WHATSAPP_SOURCE_PATH) return false;
  if (typeof body.dataGeneratedAt !== "string") return false;
  if (!Array.isArray(body.monitored) || !body.monitored.every(isWhatsAppConversationRow)) return false;
  if (!Array.isArray(body.drafts) || !body.drafts.every(isWhatsAppConversationRow)) return false;
  if (!Array.isArray(body.followUps) || !body.followUps.every(isWhatsAppFollowUpRow)) return false;
  if (typeof body.summary !== "object" || body.summary === null) return false;
  const summary = body.summary as Record<string, unknown>;
  const expected = deriveWhatsAppSummary(
    body.monitored as WhatsAppConversationRowV1[],
    body.drafts as WhatsAppConversationRowV1[],
    body.followUps as WhatsAppFollowUpRowV1[],
  );
  return (
    summary.monitoredCount === expected.monitoredCount &&
    summary.draftCount === expected.draftCount &&
    summary.followUpCount === expected.followUpCount
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Guard: secret must be configured
  if (!DASHBOARD_DATA_SECRET) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  // Guard: authorised caller
  const authHeader = request.headers.get("x-dashboard-secret");
  if (!authHeader || authHeader !== DASHBOARD_DATA_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  // Resolve source key — reject arbitrary caller-supplied paths (spec 008 FR-001)
  const source = typeof b.source === "string" ? b.source : null;
  const targetPath = source != null ? SOURCE_PATHS[source] : null;
  if (!targetPath) {
    return NextResponse.json({ error: "Invalid source key" }, { status: 400 });
  }

  // Validate source-specific payload; malformed data affects only that source (spec 008 FR-003)
  let snapshotContent: string;
  if (source === "email") {
    // Read metadata before type narrowing (narrowing excludes unknown keys)
    const incomingMetadata = b.metadata as
      | Record<string, unknown>
      | undefined;
    if (!validateEmailPayload(b)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    // Build email snapshot using the current email-dashboard-source/v1 schema (specs 012/008)
    const incomingItems = b.items as EmailDashboardRowV1[];
    const incomingSummary = b.summary as Record<string, unknown>;
    const snapshot = {
      schemaVersion: "email-dashboard-source/v1",
      source: "email" as const,
      sourcePath: EMAIL_SOURCE_PATH,
      dataGeneratedAt: b.dataGeneratedAt as string,
      inboxQuery: b.inboxQuery as string,
      items: incomingItems,
      summary: incomingSummary,
      metadata: {
        ...(incomingMetadata?.snapshotHash != null && {
          snapshotHash: String(incomingMetadata.snapshotHash),
        }),
        ...(incomingMetadata?.businessContentHash != null && {
          businessContentHash: String(incomingMetadata.businessContentHash),
        }),
        ...(incomingMetadata?.publisher != null && {
          publisher: String(incomingMetadata.publisher),
        }),
        ...(incomingMetadata?.sourceRunId != null && {
          sourceRunId: String(incomingMetadata.sourceRunId),
        }),
        ...(incomingMetadata?.skippedWriteBecauseUnchanged === true && {
          skippedWriteBecauseUnchanged: true,
        }),
      },
    };
    snapshotContent = JSON.stringify(snapshot, null, 2);
  } else if (source === "whatsapp") {
    const incomingMetadata = b.metadata as
      | Record<string, unknown>
      | undefined;
    if (!validateWhatsAppPayload(b)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const snapshot = {
      schemaVersion: "whatsapp-dashboard-source/v1" as const,
      source: "whatsapp" as const,
      sourcePath: WHATSAPP_SOURCE_PATH,
      dataGeneratedAt: b.dataGeneratedAt as string,
      monitored: b.monitored as WhatsAppConversationRowV1[],
      drafts: b.drafts as WhatsAppConversationRowV1[],
      followUps: b.followUps as WhatsAppFollowUpRowV1[],
      summary: b.summary as WhatsAppDashboardSummaryV1,
      metadata: {
        ...(incomingMetadata?.snapshotHash != null && {
          snapshotHash: String(incomingMetadata.snapshotHash),
        }),
        ...(incomingMetadata?.businessContentHash != null && {
          businessContentHash: String(incomingMetadata.businessContentHash),
        }),
        ...(incomingMetadata?.publisher != null && {
          publisher: String(incomingMetadata.publisher),
        }),
        ...(incomingMetadata?.sourceRunId != null && {
          sourceRunId: String(incomingMetadata.sourceRunId),
        }),
        ...(incomingMetadata?.skippedWriteBecauseUnchanged === true && {
          skippedWriteBecauseUnchanged: true,
        }),
      } satisfies WhatsAppDashboardSourceMetadataV1,
    };
    snapshotContent = JSON.stringify(snapshot, null, 2);
  } else {
    // Already caught by targetPath check above, but satisfy TypeScript
    return NextResponse.json({ error: "Invalid source key" }, { status: 400 });
  }

  // Write to Blob (spec 008 FR-007: no list(), no copy() in normal path)
  const client = new VercelBlobStorageClient();
  try {
    const { written } = await client.writeBlob(targetPath, snapshotContent);

    const result: SyncResult = {
      ok: true,
      source,
      path: targetPath,
      written,
      // spec 008 FR-007: report skipped when unchanged (safe result, no secrets)
      ...(written === false ? { skipped: true } : {}),
    };
    // Extract item count in type-safe way — TypeScript cannot narrow through ternary
    const itemCount: number =
      source === "email"
        ? (b as { items: unknown[] }).items.length
        : (b as { monitored: unknown[]; drafts: unknown[]; followUps: unknown[] }).monitored.length +
          (b as { monitored: unknown[]; drafts: unknown[]; followUps: unknown[] }).drafts.length +
          (b as { monitored: unknown[]; drafts: unknown[]; followUps: unknown[] }).followUps.length;
    console.log(
      `[dashboard/sync] ${source} sync: path=${targetPath} written=${written} items=${itemCount}`
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[dashboard/sync] ${source} sync failed:`, message);
    return NextResponse.json(
      { error: "Failed to store data", detail: message },
      { status: 500 }
    );
  }
}
