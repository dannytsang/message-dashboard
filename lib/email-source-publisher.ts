/**
 * Email Dashboard Source Publisher helper (specs 012/008/007).
 *
 * Provides sanitisation helpers for monitor-side scripts that produce
 * dashboard email snapshots and publish them via POST /api/dashboard/sync.
 *
 * Privacy rules enforced here (spec 012 FR-003):
 *   - No OAuth tokens or credential paths.
 *   - No Gmail raw message bodies.
 *   - No raw Gmail IDs where avoidable.
 *   - No sender email addresses.
 *   - No private local paths or attachment paths.
 *
 * Usage in monitor-side scripts:
 *   const snapshot = buildEmailDashboardSnapshot({ items, summary, dataGeneratedAt });
 *   await publishEmailDashboardSnapshot(snapshot);
 */

import "server-only";
import type { EmailInboxItem, EmailInboxDisplayItem } from "@/lib/dashboard-types";

// ---------------------------------------------------------------------------
// Internal types used by monitor-side scripts (not exported to public types)
// ---------------------------------------------------------------------------

interface MonitorEmailRow {
  id: string;
  subject: string;
  receivedDateTime: string;
  labels?: string[];
  identifiedAction?: MonitorAction | null;
}

interface MonitorAction {
  actionPhrase: string;
  state: "proposed" | "confirmed";
  actionType?: string;
}

interface BuildOptions {
  items: MonitorEmailRow[];
  summary?: {
    total?: number;
    withAction?: number;
    [key: string]: unknown;
  };
  dataGeneratedAt?: string;
}

// ---------------------------------------------------------------------------
// Build a complete Email source snapshot (spec 012 FR-001)
// ---------------------------------------------------------------------------

/**
 * Build an email inbox snapshot from monitor-side Gmail/unresolved-work state.
 * Applies all sanitisation rules before the snapshot is sent to the dashboard sync endpoint.
 */
export function buildEmailDashboardSnapshot(options: BuildOptions): EmailDashboardSnapshot {
  return {
    schemaVersion: "email-source/v1",
    generatedAt: options.dataGeneratedAt ?? new Date().toISOString(),
    summary: options.summary ?? null,
    items: options.items.map(toEmailInboxItem),
  };
}

// ---------------------------------------------------------------------------
// Privacy sanitisation
// ---------------------------------------------------------------------------

/**
 * Convert a monitor-side email row to a dashboard-safe EmailInboxItem.
 * Enforces spec 012 FR-003 privacy exclusions:
 *   - No sender email addresses.
 *   - No raw Gmail IDs where avoidable (monitor id is used instead).
 *   - No OAuth tokens, raw bodies, or credential paths.
 */
function toEmailInboxItem(row: MonitorEmailRow): EmailInboxItem {
  return {
    id: row.id,
    subject: row.subject,
    receivedDateTime: row.receivedDateTime,
    labels: row.labels ?? [],
    identifiedAction:
      row.identifiedAction !== undefined && row.identifiedAction !== null
        ? {
            actionPhrase: row.identifiedAction.actionPhrase,
            state: row.identifiedAction.state,
            actionType: row.identifiedAction.actionType,
          }
        : undefined,
  };
}

/**
 * Build an EmailInboxDisplayItem ready for direct dashboard rendering.
 * The receivedLabel, receivedDate, and receivedTime fields are display-only
 * derived fields computed by the caller from receivedDateTime — they are
 * NOT stored in the blob snapshot and must be supplied here.
 */
export function toEmailInboxDisplayItem(
  inboxItem: EmailInboxItem,
  displayFields: { receivedLabel: string; receivedDate: string; receivedTime: string },
): EmailInboxDisplayItem {
  return {
    id: inboxItem.id,
    subject: inboxItem.subject,
    receivedDateTime: inboxItem.receivedDateTime,
    receivedLabel: displayFields.receivedLabel,
    receivedDate: displayFields.receivedDate,
    receivedTime: displayFields.receivedTime,
    labels: inboxItem.labels,
    identifiedAction: inboxItem.identifiedAction,
  };
}

// ---------------------------------------------------------------------------
// Snapshot validation before publish (spec 012 FR-007)
// ---------------------------------------------------------------------------

export interface EmailDashboardSnapshot {
  schemaVersion: string;
  generatedAt: string;
  summary: Record<string, unknown> | null;
  items: EmailInboxItem[];
}

/**
 * Validate an EmailDashboardSnapshot before sending it to the sync endpoint.
 * Returns true if valid; throws with a descriptive message on failure
 * (spec 012 FR-007: "if validation fails, no write should occur").
 */
export function validateEmailSnapshot(snapshot: EmailDashboardSnapshot): void {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot must be a non-null object");
  }
  if (typeof snapshot.generatedAt !== "string" || snapshot.generatedAt.trim() === "") {
    throw new Error("Snapshot must have a non-empty generatedAt string");
  }
  if (!Array.isArray(snapshot.items)) {
    throw new Error("Snapshot must have an items array");
  }
  for (let i = 0; i < snapshot.items.length; i++) {
    validateEmailRow(`items[${i}]`, snapshot.items[i]);
  }
}

const VALID_ACTION_STATES = new Set(["proposed", "confirmed"]);

function validateEmailRow(label: string, row: unknown): void {
  if (!row || typeof row !== "object") {
    throw new Error(`${label}: must be a non-null object`);
  }
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id.trim() === "") {
    throw new Error(`${label}: must have a non-empty id`);
  }
  if (typeof r.subject !== "string") {
    throw new Error(`${label}: must have a subject string`);
  }
  if (typeof r.receivedDateTime !== "string" || r.receivedDateTime.trim() === "") {
    throw new Error(`${label}: must have a non-empty receivedDateTime`);
  }
  if (!Array.isArray(r.labels)) {
    throw new Error(`${label}: labels must be an array of strings`);
  }
  if (r.labels.some((l) => typeof l !== "string")) {
    throw new Error(`${label}: labels must contain only strings`);
  }
  if (r.identifiedAction !== undefined && r.identifiedAction !== null) {
    const a = r.identifiedAction as Record<string, unknown>;
    if (typeof a.actionPhrase !== "string" || a.actionPhrase.trim() === "") {
      throw new Error(`${label}.identifiedAction.actionPhrase must be a non-empty string`);
    }
    if (!VALID_ACTION_STATES.has(a.state as string)) {
      throw new Error(`${label}.identifiedAction.state must be "proposed" or "confirmed"`);
    }
    if (a.actionType !== undefined && typeof a.actionType !== "string") {
      throw new Error(`${label}.identifiedAction.actionType must be a string if provided`);
    }
  }
}

// ---------------------------------------------------------------------------
// Sync result reporting (spec 008 FR-009)
// ---------------------------------------------------------------------------

export interface EmailSyncReport {
  source: "email";
  path: string;
  generatedAt: string;
  itemCounts: {
    total: number;
    withAction: number;
  };
  written: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Parse the dashboard sync response into a safe report suitable for cron logs.
 * Safe fields only: source key, path, generated timestamp, item counts, write status.
 * Never includes: OAuth tokens, raw Gmail IDs, sender email addresses, local paths.
 */
export function parseEmailSyncResponse(
  response: { ok: boolean; path?: string; written?: boolean; skipped?: boolean; error?: string },
  snapshot: EmailDashboardSnapshot,
): EmailSyncReport {
  const withAction = snapshot.items.filter((i) => i.identifiedAction != null).length;
  return {
    source: "email",
    path: response.path ?? "dashboard/v1/email/latest.json",
    generatedAt: snapshot.generatedAt,
    itemCounts: {
      total: snapshot.items.length,
      withAction,
    },
    written: response.written ?? false,
    skipped: response.skipped,
    error: response.error,
  };
}
