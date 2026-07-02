/**
 * POST /api/dashboard/sync
 *
 * Accepts an email dashboard snapshot from the monitor-side sync script and
 * writes it to Vercel Blob at `dashboard/v1/email/latest.json` (spec 007/008).
 *
 * Authenticated with `x-dashboard-secret` header using COMS_DASHBOARD_DATA_SECRET.
 *
 * Request body shape:
 *   {
 *     "items": EmailInboxItem[],
 *     "summary": { "total": number, "withAction": number, ... },
 *     "dataGeneratedAt": "2026-07-02T12:00:00+00:00",
 *   }
 *
 * Response:
 *   200 { "ok": true, "path": "dashboard/v1/email/latest.json", "written": true|false }
 *   400 { "error": "Invalid payload" }
 *   401 { "error": "Unauthorized" }
 *   500 { "error": "Server not configured" | "Failed to store data" }
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { VercelBlobStorageClient, EMAIL_SOURCE_PATH } from "@/lib/blob-storage";
import type { EmailInboxItem, EmailActionState } from "@/lib/dashboard-types";

const DASHBOARD_DATA_SECRET = process.env.COMS_DASHBOARD_DATA_SECRET;

interface SyncPayload {
  items: unknown[];
  summary?: Record<string, unknown>;
  dataGeneratedAt: string;
}

function isEmailInboxItem(value: unknown): value is EmailInboxItem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as EmailInboxItem).id === "string" &&
    typeof (value as EmailInboxItem).receivedDateTime === "string" &&
    typeof (value as EmailInboxItem).subject === "string" &&
    Array.isArray((value as EmailInboxItem).labels) &&
    (value as EmailInboxItem).labels.every((l) => typeof l === "string") &&
    ((value as EmailInboxItem).identifiedAction === undefined ||
      ((value as EmailInboxItem).identifiedAction !== null &&
        typeof (value as EmailInboxItem).identifiedAction === "object" &&
        ((value as EmailInboxItem).identifiedAction as { state?: string }).state ===
          ("proposed" satisfies EmailActionState) ||
        ((value as EmailInboxItem).identifiedAction as { state?: string }).state ===
          ("confirmed" satisfies EmailActionState)))
  );
}

function validatePayload(body: unknown): body is SyncPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.items)) return false;
  if (typeof b.dataGeneratedAt !== "string") return false;
  return b.items.every(isEmailInboxItem);
}

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!DASHBOARD_DATA_SECRET) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("x-dashboard-secret");
  if (!authHeader || authHeader !== DASHBOARD_DATA_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!validatePayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const client = new VercelBlobStorageClient();
  const snapshot = {
    schemaVersion: "email-source/v1",
    generatedAt: body.dataGeneratedAt,
    summary: body.summary ?? null,
    items: body.items as EmailInboxItem[],
  };
  const content = JSON.stringify(snapshot, null, 2);

  try {
    const { written } = await client.writeBlob(EMAIL_SOURCE_PATH, content);
    console.log(
      `[dashboard/sync] email sync: path=${EMAIL_SOURCE_PATH} written=${written} items=${body.items.length}`
    );
    return NextResponse.json({ ok: true, path: EMAIL_SOURCE_PATH, written });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[dashboard/sync] Failed:", message);
    return NextResponse.json({ error: "Failed to store data", detail: message }, { status: 500 });
  }
}
