import "server-only";
import { createHash } from "node:crypto";
import type {
  EmailActionType,
  EmailDashboardIdentifiedActionV1,
  EmailDashboardRowV1,
  EmailDashboardSourceMetadataV1,
  EmailDashboardSourceSnapshotV1,
  EmailDashboardSummaryV1,
  EmailInboxDisplayItem,
  EmailInboxItem,
} from "@/lib/dashboard-types";
import { EMAIL_SOURCE_PATH } from "@/lib/blob-storage";

/**
 * Email Dashboard Source Publisher helper (specs 012/008/007).
 *
 * Builds the current email-dashboard-source/v1 payload consumed by
 * POST /api/dashboard/sync and the /emails + Summary readers.
 *
 * Privacy rules enforced here:
 * - no OAuth tokens or credential paths;
 * - no Gmail raw bodies;
 * - no sender email addresses;
 * - no private local paths or attachment paths;
 * - IDs must be opaque dashboard IDs supplied by the monitor, not raw Gmail IDs.
 */

interface MonitorEmailRow {
  id: string;
  subject: string;
  receivedAt?: string;
  receivedDateTime?: string;
  labels?: string[];
  readState?: "read" | "unread" | "unknown";
  identifiedAction?: MonitorAction | null;
}

interface MonitorAction {
  actionPhrase: string;
  state: "proposed" | "confirmed";
  label?: string;
  actionType?: EmailActionType;
  derivedBy?: "monitor_inference" | "rule" | "human_confirmed";
}

interface BuildOptions {
  items: MonitorEmailRow[];
  dataGeneratedAt?: string;
  inboxQuery?: string;
  metadata?: EmailDashboardSourceMetadataV1;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function toEmailDashboardAction(action: MonitorAction): EmailDashboardIdentifiedActionV1 {
  return {
    state: action.state,
    label: action.label ?? (action.state === "confirmed" ? "Confirmed" : "Proposed"),
    actionPhrase: action.actionPhrase,
    derivedBy: action.derivedBy ?? "monitor_inference",
    ...(action.actionType ? { actionType: action.actionType } : {}),
  };
}

function toEmailDashboardRow(row: MonitorEmailRow): EmailDashboardRowV1 {
  const receivedAt = row.receivedAt ?? row.receivedDateTime;
  return {
    id: row.id,
    subject: row.subject,
    ...(receivedAt ? { receivedAt, receivedDateTime: receivedAt } : {}),
    labels: row.labels ?? [],
    ...(row.readState ? { readState: row.readState } : {}),
    identifiedAction: row.identifiedAction ? toEmailDashboardAction(row.identifiedAction) : undefined,
  };
}

function deriveSummary(items: EmailDashboardRowV1[]): EmailDashboardSummaryV1 {
  const proposedCount = items.filter((item) => item.identifiedAction?.state === "proposed").length;
  const confirmedCount = items.filter((item) => item.identifiedAction?.state === "confirmed").length;
  const actionCount = proposedCount + confirmedCount;
  const unreadCount = items.filter((item) => item.readState === "unread").length;
  const readCount = items.filter((item) => item.readState === "read").length;
  return {
    itemCount: items.length,
    actionCount,
    proposedCount,
    confirmedCount,
    noActionCount: items.length - actionCount,
    ...(unreadCount > 0 ? { unreadCount } : {}),
    ...(readCount > 0 ? { readCount } : {}),
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableBusinessHash(snapshot: Pick<EmailDashboardSourceSnapshotV1, "schemaVersion" | "source" | "sourcePath" | "items" | "summary">): string {
  return sha256Hex(stableJson(snapshot));
}

export function buildEmailDashboardSnapshot(options: BuildOptions): EmailDashboardSourceSnapshotV1 {
  const items = options.items.map(toEmailDashboardRow);
  const summary = deriveSummary(items);
  const base = {
    schemaVersion: "email-dashboard-source/v1" as const,
    source: "email" as const,
    sourcePath: "dashboard/v1/email/latest.json" as const,
    items,
    summary,
  };
  const businessContentHash = stableBusinessHash(base);
  return {
    ...base,
    dataGeneratedAt: options.dataGeneratedAt ?? new Date().toISOString(),
    inboxQuery: options.inboxQuery ?? "in:inbox -in:snoozed",
    metadata: {
      ...options.metadata,
      businessContentHash: options.metadata?.businessContentHash ?? businessContentHash,
      publisher: options.metadata?.publisher ?? "email-monitor",
    },
  };
}

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

export function validateEmailSnapshot(snapshot: EmailDashboardSourceSnapshotV1): void {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot must be a non-null object");
  }
  if (snapshot.schemaVersion !== "email-dashboard-source/v1") {
    throw new Error("Snapshot must use schemaVersion email-dashboard-source/v1");
  }
  if (snapshot.source !== "email" || snapshot.sourcePath !== EMAIL_SOURCE_PATH) {
    throw new Error("Snapshot must use the deterministic email source path");
  }
  if (typeof snapshot.dataGeneratedAt !== "string" || snapshot.dataGeneratedAt.trim() === "") {
    throw new Error("Snapshot must have a non-empty dataGeneratedAt string");
  }
  if (typeof snapshot.inboxQuery !== "string" || snapshot.inboxQuery.trim() === "") {
    throw new Error("Snapshot must have a non-empty inboxQuery string");
  }
  if (!Array.isArray(snapshot.items)) {
    throw new Error("Snapshot must have an items array");
  }
  for (let i = 0; i < snapshot.items.length; i += 1) {
    validateEmailRow(`items[${i}]`, snapshot.items[i]);
  }
  const summary = deriveSummary(snapshot.items);
  if (
    snapshot.summary.itemCount !== summary.itemCount ||
    snapshot.summary.actionCount !== summary.actionCount ||
    snapshot.summary.proposedCount !== summary.proposedCount ||
    snapshot.summary.confirmedCount !== summary.confirmedCount ||
    snapshot.summary.noActionCount !== summary.noActionCount
  ) {
    throw new Error("Snapshot summary counts must match items");
  }
}

const VALID_ACTION_STATES = new Set(["proposed", "confirmed"]);
const VALID_DERIVED_BY = new Set(["monitor_inference", "rule", "human_confirmed"]);

function validateEmailRow(label: string, row: EmailDashboardRowV1): void {
  if (typeof row.id !== "string" || row.id.trim() === "") {
    throw new Error(`${label}: must have a non-empty id`);
  }
  if (typeof row.subject !== "string") {
    throw new Error(`${label}: must have a subject string`);
  }
  if (typeof row.receivedAt !== "string" || row.receivedAt.trim() === "") {
    throw new Error(`${label}: must have a non-empty receivedAt`);
  }
  if (!Array.isArray(row.labels) || row.labels.some((value) => typeof value !== "string")) {
    throw new Error(`${label}: labels must contain only strings`);
  }
  if (row.identifiedAction !== undefined && row.identifiedAction !== null) {
    const action = row.identifiedAction;
    if (!VALID_ACTION_STATES.has(action.state)) {
      throw new Error(`${label}.identifiedAction.state must be "proposed" or "confirmed"`);
    }
    if (typeof action.label !== "string" || action.label.trim() === "") {
      throw new Error(`${label}.identifiedAction.label must be a non-empty string`);
    }
    if (typeof action.actionPhrase !== "string" || action.actionPhrase.trim() === "") {
      throw new Error(`${label}.identifiedAction.actionPhrase must be a non-empty string`);
    }
    if (!VALID_DERIVED_BY.has(action.derivedBy)) {
      throw new Error(`${label}.identifiedAction.derivedBy is invalid`);
    }
  }
}

export interface EmailSyncReport {
  source: "email";
  path: string;
  generatedAt: string;
  itemCounts: {
    itemCount: number;
    actionCount: number;
  };
  written: boolean;
  skipped?: boolean;
  error?: string;
}

export function parseEmailSyncResponse(
  response: { ok: boolean; path?: string; written?: boolean; skipped?: boolean; error?: string },
  snapshot: EmailDashboardSourceSnapshotV1,
): EmailSyncReport {
  return {
    source: "email",
    path: response.path ?? EMAIL_SOURCE_PATH,
    generatedAt: snapshot.dataGeneratedAt,
    itemCounts: {
      itemCount: snapshot.summary.itemCount,
      actionCount: snapshot.summary.actionCount,
    },
    written: response.written ?? false,
    skipped: response.skipped,
    error: response.error,
  };
}
