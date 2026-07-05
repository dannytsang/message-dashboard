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
 *     "source": "whatsapp",
 *     "generatedAt": "2026-07-02T12:00:00+00:00",
 *     "monitored": WhatsAppConversationItem[],
 *     "drafts": WhatsAppConversationItem[],
 *     "followUps": WhatsAppFollowUpItem[],
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
  EmailInboxItem,
  EmailActionState,
  WhatsAppConversationItem,
  WhatsAppFollowUpItem,
  WhatsAppFollowUpState,
  WhatsAppConversationKind,
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
    typeof a.actionPhrase === "string" &&
    a.actionPhrase.trim() !== "" &&
    (a.actionType === undefined || typeof a.actionType === "string")
  );
}

function isEmailInboxItem(value: unknown): value is EmailInboxItem {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.receivedDateTime === "string" &&
    typeof row.subject === "string" &&
    Array.isArray(row.labels) &&
    row.labels.every((l) => typeof l === "string") &&
    isEmailIdentifiedAction(row.identifiedAction)
  );
}

function validateEmailPayload(body: Record<string, unknown>): boolean {
  return (
    typeof body.dataGeneratedAt === "string" &&
    Array.isArray(body.items) &&
    body.items.every(isEmailInboxItem)
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
    typeof e.speaker === "string" &&
    (e.direction === "inbound" || e.direction === "outbound" || e.direction === "system") &&
    typeof e.summary === "string" &&
    typeof e.sentAt === "string"
  );
}

function isWhatsAppConversationItem(value: unknown): value is WhatsAppConversationItem {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    (c.kind === ("group" satisfies WhatsAppConversationKind) ||
      c.kind === ("direct" satisfies WhatsAppConversationKind)) &&
    typeof c.displayName === "string" &&
    typeof c.lastMessageSummary === "string" &&
    Array.isArray(c.timeline) &&
    c.timeline.every(isWhatsAppTimelineEntry)
  );
}

function isWhatsAppFollowUpItem(value: unknown): value is WhatsAppFollowUpItem {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    typeof f.conversationId === "string" &&
    (f.kind === ("group" satisfies WhatsAppConversationKind) ||
      f.kind === ("direct" satisfies WhatsAppConversationKind)) &&
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
    typeof f.contextSummary === "string"
  );
}

function validateWhatsAppPayload(body: Record<string, unknown>): body is {
  source: "whatsapp";
  generatedAt: string;
  monitored: WhatsAppConversationItem[];
  drafts: WhatsAppConversationItem[];
  followUps: WhatsAppFollowUpItem[];
} {
  return (
    typeof body.generatedAt === "string" &&
    Array.isArray(body.monitored) &&
    body.monitored.every(isWhatsAppConversationItem) &&
    Array.isArray(body.drafts) &&
    body.drafts.every(isWhatsAppConversationItem) &&
    Array.isArray(body.followUps) &&
    body.followUps.every(isWhatsAppFollowUpItem)
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
    const incomingItems = b.items as EmailInboxItem[];
    const incomingSummary = b.summary as
      | { itemCount?: number; actionCount?: number }
      | undefined;
    const snapshot = {
      schemaVersion: "email-dashboard-source/v1",
      source: "email" as const,
      sourcePath: "dashboard/v1/email/latest.json",
      dataGeneratedAt: b.dataGeneratedAt as string,
      inboxQuery:
        typeof b.inboxQuery === "string" ? b.inboxQuery : "in:inbox -in:snoozed",
      items: incomingItems,
      summary: incomingSummary ?? {
        itemCount: incomingItems.length,
        actionCount: incomingItems.filter((i) => i.identifiedAction != null).length,
      },
      metadata: {
        ...(incomingMetadata?.snapshotHash != null && {
          snapshotHash: String(incomingMetadata.snapshotHash),
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
    if (!validateWhatsAppPayload(b)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const snapshot = {
      schemaVersion: "whatsapp-source/v1",
      generatedAt: b.generatedAt as string,
      monitored: b.monitored as WhatsAppConversationItem[],
      drafts: b.drafts as WhatsAppConversationItem[],
      followUps: b.followUps as WhatsAppFollowUpItem[],
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
