import PageClient from "@/app/page-client";
import Navigation from "@/components/Navigation";
import {
  getEffectiveRenderMode,
  readEmailSourceSnapshot,
  readWhatsAppSourceSnapshot,
} from "@/lib/dashboard-data";
import { getSiteMode } from "@/lib/site-mode";
import type {
  CommunicationItem,
  WhatsAppConversationItem,
  WhatsAppFollowUpItem,
} from "@/lib/dashboard-types";

/**
 * Summary dashboard page (spec 013).
 *
 * Merges available WhatsApp and email source snapshots server-side and passes
 * full data to the interactive client component for client-side filtering.
 * No Blob list(), no sync/write calls, no raw credentials.
 */
export default async function HomePage() {
  const { mode: topLevelMode } = getSiteMode();

  // Read both sources independently — partial availability is handled per-source
  const [emailResult, whatsappResult] = await Promise.all([
    readEmailSourceSnapshot(topLevelMode),
    readWhatsAppSourceSnapshot(topLevelMode),
  ]);

  // Spec 010 FR-004: if ANY source fell back to demo, the whole site renders as demo
  const effectiveMode = getEffectiveRenderMode(
    emailResult.mode,
    whatsappResult.mode,
  );

  // Derive merged communication items from available snapshots
  const mergedItems: CommunicationItem[] = [];

  // Email items (spec 012/013)
  if (emailResult.snapshot) {
    const snap = emailResult.snapshot;
    // Support both current email-dashboard-source/v1 and legacy shape
    const emailItems: CommunicationItem[] = Array.isArray(
      snap.items as unknown,
    )
      ? (
          snap.items as unknown as {
            id: string;
            subject: string;
            receivedDateTime?: string;
            receivedAt?: string;
            labels: string[];
            identifiedAction?: { state: string; actionPhrase: string };
          }[]
        ).map((row) => ({
          id: `email:${row.id}`,
          source: "email" as const,
          status:
            row.identifiedAction?.state === "confirmed"
              ? "resolved"
              : row.identifiedAction?.state === "proposed"
                ? "open"
                : "open",
          title: row.subject,
          context:
            row.labels.join(", ") ||
            (row.identifiedAction?.actionPhrase
              ? `Action: ${row.identifiedAction.actionPhrase}`
              : "No action identified"),
        }))
      : [];

    mergedItems.push(...emailItems);
  }

  // WhatsApp items (spec 011/013)
  if (whatsappResult.snapshot) {
    const snap = whatsappResult.snapshot;
    const waItems: CommunicationItem[] = [
      ...(snap.monitored ?? []),
      ...(snap.drafts ?? []),
      ...(snap.followUps ?? []),
    ].map((item) => ({
      id: `whatsapp:${item.id}`,
      source: "whatsapp" as const,
      status: getWhatsAppStatus(item),
      title:
        "displayName" in item
          ? (item as { displayName: string }).displayName
          : "title" in item
            ? (item as { title: string }).title
            : "Unknown",
      context:
        "lastMessageSummary" in item
          ? (item as { lastMessageSummary: string }).lastMessageSummary
          : "contextSummary" in item
            ? (item as { contextSummary: string }).contextSummary
            : "",
    }));

    mergedItems.push(...waItems);
  }

  // Compute counts from the merged dataset (spec 013: counts based on full merged dataset)
  const whatsappCount = mergedItems.filter(
    (i): i is CommunicationItem & { source: "whatsapp" } =>
      i.source === "whatsapp",
  ).length;
  const emailCount = mergedItems.filter(
    (i): i is CommunicationItem & { source: "email" } => i.source === "email",
  ).length;
  const openCount = mergedItems.filter((i) => i.status === "open").length;
  const needsReviewCount = mergedItems.filter(
    (i) => i.status === "uncertain_needs_review",
  ).length;

  // Extract source-level timestamps and warnings (spec 013: partial availability)
  const whatsappTimestamp = whatsappResult.snapshot
    ? (whatsappResult.snapshot as { dataGeneratedAt?: string; generatedAt?: string })
        .dataGeneratedAt ||
      (whatsappResult.snapshot as { generatedAt?: string }).generatedAt
    : undefined;
  const emailTimestamp = emailResult.snapshot
    ? (
        emailResult.snapshot as {
          dataGeneratedAt?: string;
          generatedAt?: string;
        }
      ).dataGeneratedAt ||
      (emailResult.snapshot as { generatedAt?: string }).generatedAt
    : undefined;

  return (
    <>
      <Navigation effectiveModeOverride={effectiveMode} />
      <PageClient
      allItems={mergedItems}
      whatsappCount={whatsappCount}
      emailCount={emailCount}
      openCount={openCount}
      needsReviewCount={needsReviewCount}
      whatsappTimestamp={whatsappTimestamp}
      emailTimestamp={emailTimestamp}
      whatsappWarning={whatsappResult.warning}
      emailWarning={emailResult.warning}
    />
    </>
  );
}

/**
 * Derive a CommunicationStatus from a WhatsApp snapshot item.
 */
function getWhatsAppStatus(
  item:
    | { state?: string; status?: string }
    | WhatsAppConversationItem
    | WhatsAppFollowUpItem,
): CommunicationItem["status"] {
  const state =
    "state" in item
      ? (item as { state?: string }).state
      : "status" in item
        ? (item as { status?: string }).status
        : undefined;
  if (typeof state === "string") {
    const stateMap: Record<string, CommunicationItem["status"]> = {
      proposed: "open",
      scheduled: "open",
      due_soon: "open",
      due_now: "open",
      overdue: "open",
      needs_review: "uncertain_needs_review",
      resolved: "resolved",
      suppressed: "suppressed",
      dismissed: "dismissed",
    };
    return stateMap[state] ?? "open";
  }
  return "open";
}
