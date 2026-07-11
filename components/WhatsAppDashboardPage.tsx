"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatDashboardDateTime,
  formatDashboardRelativeDateTime,
} from "@/lib/dashboard-format";
import type {
  WhatsAppConversationItem,
  WhatsAppConversationListKey,
  WhatsAppConversationSortMode,
  WhatsAppDashboardSnapshot,
  WhatsAppFollowUpItem,
  WhatsAppFollowUpSortMode,
  WhatsAppFollowUpState,
} from "@/lib/dashboard-types";
import styles from "@/app/whatsapp/whatsapp.module.css";

interface WhatsAppDashboardPageProps {
  snapshot: WhatsAppDashboardSnapshot;
  dataMode: "live";
}

interface CombinedConversationItem extends WhatsAppConversationItem {
  origins: WhatsAppConversationListKey[];
}

interface ConversationBucket {
  id: "now" | "next" | "recent";
  label: string;
  helper: string;
  items: CombinedConversationItem[];
}

type ConversationKindFilter = "all" | "group" | "direct";
type ConversationSourceFilter = "all" | "monitored" | "drafts";
type ConversationOperationalFilter = "all" | "action_required" | "needs_review";
type FollowUpOperationalFilter = "all" | "action_required" | "needs_review";

const conversationSortLabels: Record<WhatsAppConversationSortMode, string> = {
  "latest-message": "Latest message",
  "name-a-z": "Name A–Z",
};

const followUpSortLabels: Record<WhatsAppFollowUpSortMode, string> = {
  "latest-message": "Latest message",
  "due-soonest": "Due soonest",
  "name-a-z": "Name A–Z",
};

const conversationKindFilterLabels: Record<ConversationKindFilter, string> = {
  all: "All chats",
  group: "Groups",
  direct: "Direct",
};

const conversationSourceFilterLabels: Record<ConversationSourceFilter, string> = {
  all: "All sources",
  monitored: "Monitored",
  drafts: "Drafts",
};

const conversationOperationalFilterLabels: Record<ConversationOperationalFilter, string> = {
  all: "All messages",
  action_required: "Actions",
  needs_review: "Reviews",
};

const followUpOperationalFilterLabels: Record<FollowUpOperationalFilter, string> = {
  all: "All follow-ups",
  action_required: "Actions",
  needs_review: "Reviews",
};

const followUpStateLabels: Record<WhatsAppFollowUpState, string> = {
  proposed: "Proposed",
  scheduled: "Scheduled",
  due_soon: "Due soon",
  due_now: "Due now",
  overdue: "Overdue",
  needs_review: "Needs review",
  resolved: "Resolved",
  suppressed: "Suppressed",
};

const followUpStateClassNames: Record<WhatsAppFollowUpState, string> = {
  proposed: styles.stateProposed,
  scheduled: styles.stateScheduled,
  due_soon: styles.stateDueSoon,
  due_now: styles.stateDueNow,
  overdue: styles.stateOverdue,
  needs_review: styles.stateNeedsReview,
  resolved: styles.stateResolved,
  suppressed: styles.stateSuppressed,
};

function normalizeQuery(query: string) {
  return query.trim().toLocaleLowerCase();
}

function matchesDisplayName(displayName: string, query: string) {
  if (!query) return true;
  return displayName.toLocaleLowerCase().includes(query);
}

function matchesConversationKind(
  item: WhatsAppConversationItem,
  kindFilter: ConversationKindFilter,
) {
  return kindFilter === "all" || item.kind === kindFilter;
}

function matchesConversationSource(item: CombinedConversationItem, sourceFilter: ConversationSourceFilter) {
  return sourceFilter === "all" || item.origins.includes(sourceFilter === "drafts" ? "drafts" : "monitored");
}

function combineConversationItems(
  monitored: WhatsAppConversationItem[],
  drafts: WhatsAppConversationItem[],
): CombinedConversationItem[] {
  const byId = new Map<string, CombinedConversationItem>();

  for (const item of monitored) {
    byId.set(item.id, { ...item, origins: ["monitored"] });
  }

  for (const item of drafts) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item, origins: ["drafts"] });
      continue;
    }

    byId.set(item.id, {
      ...existing,
      ...item,
      origins: ["monitored", "drafts"],
      listNotes: [...(existing.listNotes ?? []), ...(item.listNotes ?? [])],
      timeline: item.timeline.length > 0 ? item.timeline : existing.timeline,
      historySummary: item.historySummary ?? existing.historySummary,
      pendingDraftSnippet: item.pendingDraftSnippet ?? existing.pendingDraftSnippet,
      draftSummary: item.draftSummary ?? existing.draftSummary,
      reviewMessageExcerpt: item.reviewMessageExcerpt ?? existing.reviewMessageExcerpt,
    });
  }

  return Array.from(byId.values());
}

function hasActionRequiredConversationState(item: WhatsAppConversationItem) {
  return (
    item.state === "draft_awaiting_approval" ||
    item.state === "review_needed" ||
    item.state === "uncertain_needs_review" ||
    Boolean(item.pendingDraftSnippet)
  );
}

function hasReviewConversationState(item: WhatsAppConversationItem) {
  return item.state === "review_needed" || item.state === "uncertain_needs_review";
}

function matchesConversationOperationalFilter(
  item: WhatsAppConversationItem,
  filter: ConversationOperationalFilter,
  actionConversationIds: Set<string>,
  reviewConversationIds: Set<string>,
) {
  switch (filter) {
    case "action_required":
      return hasActionRequiredConversationState(item) || actionConversationIds.has(item.id);
    case "needs_review":
      return hasReviewConversationState(item) || reviewConversationIds.has(item.id);
    default:
      return true;
  }
}

function matchesFollowUpOperationalFilter(
  item: WhatsAppFollowUpItem,
  filter: FollowUpOperationalFilter,
) {
  switch (filter) {
    case "action_required":
      return item.state !== "needs_review" && item.state !== "resolved" && item.state !== "suppressed";
    case "needs_review":
      return item.state === "needs_review";
    default:
      return true;
  }
}

function compareConversationByLatest(
  a: WhatsAppConversationItem,
  b: WhatsAppConversationItem,
) {
  const ta = new Date(a.lastMessageAt ?? 0).getTime();
  const tb = new Date(b.lastMessageAt ?? 0).getTime();
  const aMissing = Number.isNaN(ta) || a.lastMessageAt == null;
  const bMissing = Number.isNaN(tb) || b.lastMessageAt == null;

  if (aMissing && bMissing) {
    return a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" });
  }

  if (aMissing) return 1;
  if (bMissing) return -1;
  if (tb !== ta) return tb - ta;

  return a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" });
}

function compareConversationByName(a: WhatsAppConversationItem, b: WhatsAppConversationItem) {
  const nameComparison = a.displayName.localeCompare(b.displayName, "en", {
    sensitivity: "base",
  });

  if (nameComparison !== 0) return nameComparison;
  return compareConversationByLatest(a, b);
}

function sortConversations<T extends WhatsAppConversationItem>(
  items: T[],
  sort: WhatsAppConversationSortMode,
) {
  return [...items].sort(sort === "name-a-z" ? compareConversationByName : compareConversationByLatest);
}

function followUpUrgencyRank(state: WhatsAppFollowUpState) {
  switch (state) {
    case "overdue":
      return 0;
    case "due_now":
      return 1;
    case "due_soon":
      return 2;
    case "scheduled":
      return 3;
    case "needs_review":
      return 4;
    case "proposed":
      return 5;
    case "resolved":
      return 6;
    case "suppressed":
      return 7;
    default:
      return 99;
  }
}

function compareFollowUpsByLatestMessage(a: WhatsAppFollowUpItem, b: WhatsAppFollowUpItem) {
  const ta = new Date(a.lastMessageAt ?? a.dueAt ?? 0).getTime();
  const tb = new Date(b.lastMessageAt ?? b.dueAt ?? 0).getTime();
  const aMissing = Number.isNaN(ta) || (a.lastMessageAt == null && a.dueAt == null);
  const bMissing = Number.isNaN(tb) || (b.lastMessageAt == null && b.dueAt == null);

  if (aMissing && bMissing) {
    const stateRank = followUpUrgencyRank(a.state) - followUpUrgencyRank(b.state);
    if (stateRank !== 0) return stateRank;
    return a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" });
  }

  if (aMissing) return 1;
  if (bMissing) return -1;
  if (tb !== ta) return tb - ta;

  const stateRank = followUpUrgencyRank(a.state) - followUpUrgencyRank(b.state);
  if (stateRank !== 0) return stateRank;

  return a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" });
}

function compareFollowUpsByDue(a: WhatsAppFollowUpItem, b: WhatsAppFollowUpItem) {
  const ta = new Date(a.dueAt ?? 0).getTime();
  const tb = new Date(b.dueAt ?? 0).getTime();
  const aMissing = Number.isNaN(ta) || a.dueAt == null;
  const bMissing = Number.isNaN(tb) || b.dueAt == null;

  if (aMissing && bMissing) {
    const stateRank = followUpUrgencyRank(a.state) - followUpUrgencyRank(b.state);
    if (stateRank !== 0) return stateRank;
    return a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" });
  }

  if (aMissing) return 1;
  if (bMissing) return -1;
  if (ta !== tb) return ta - tb;

  const stateRank = followUpUrgencyRank(a.state) - followUpUrgencyRank(b.state);
  if (stateRank !== 0) return stateRank;

  return a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" });
}

function compareFollowUpsByName(a: WhatsAppFollowUpItem, b: WhatsAppFollowUpItem) {
  const nameComparison = a.displayName.localeCompare(b.displayName, "en", {
    sensitivity: "base",
  });

  if (nameComparison !== 0) return nameComparison;
  return compareFollowUpsByDue(a, b);
}

function sortFollowUps(items: WhatsAppFollowUpItem[], sort: WhatsAppFollowUpSortMode) {
  if (sort === "name-a-z") return [...items].sort(compareFollowUpsByName);
  if (sort === "due-soonest") return [...items].sort(compareFollowUpsByDue);
  return [...items].sort(compareFollowUpsByLatestMessage);
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function kindLabel(kind: WhatsAppConversationItem["kind"] | WhatsAppFollowUpItem["kind"]) {
  return kind === "group" ? "Group" : "Direct";
}

function bucketConversationItems(
  items: CombinedConversationItem[],
  snapshotGeneratedAt: string,
): ConversationBucket[] {
  const generatedAt = new Date(snapshotGeneratedAt).getTime();
  const hasReferenceTime = Number.isFinite(generatedAt);

  const buckets: ConversationBucket[] = [
    { id: "now", label: "Now", helper: "Fresh or time-sensitive chats", items: [] },
    { id: "next", label: "Next", helper: "Still active but not immediate", items: [] },
    { id: "recent", label: "Recent", helper: "Older context to keep visible", items: [] },
  ];

  for (const item of items) {
    const messageTime = new Date(item.lastMessageAt ?? 0).getTime();
    const ageHours =
      hasReferenceTime && Number.isFinite(messageTime) ? (generatedAt - messageTime) / (1000 * 60 * 60) : null;

    if (ageHours != null && ageHours <= 6) {
      buckets[0].items.push(item);
      continue;
    }

    if (ageHours != null && ageHours <= 30) {
      buckets[1].items.push(item);
      continue;
    }

    buckets[2].items.push(item);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

function conversationRowTokens(item: CombinedConversationItem) {
  const tokens: string[] = [];

  if (item.origins.includes("monitored")) {
    tokens.push("Monitored");
  }

  if (item.origins.includes("drafts")) {
    tokens.push("Draft");
  }

  if (hasActionRequiredConversationState(item)) {
    tokens.push("Action");
  }

  if (hasReviewConversationState(item)) {
    tokens.push("Review");
  }

  if (item.listNotes?.length) {
    tokens.push(...item.listNotes);
  }

  return Array.from(new Set(tokens));
}

export default function WhatsAppDashboardPage({
  snapshot,
  dataMode,
}: WhatsAppDashboardPageProps) {
  const [conversationQuery, setConversationQuery] = useState("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [conversationSort, setConversationSort] =
    useState<WhatsAppConversationSortMode>("latest-message");
  const [conversationKindFilter, setConversationKindFilter] =
    useState<ConversationKindFilter>("all");
  const [conversationSourceFilter, setConversationSourceFilter] =
    useState<ConversationSourceFilter>("all");
  const [conversationStatusFilter, setConversationStatusFilter] =
    useState<ConversationOperationalFilter>("action_required");
  const [followUpSort, setFollowUpSort] =
    useState<WhatsAppFollowUpSortMode>("latest-message");
  const [followUpFilter, setFollowUpFilter] =
    useState<FollowUpOperationalFilter>("action_required");

  const combinedConversations = useMemo(
    () => combineConversationItems(snapshot.monitored, snapshot.drafts),
    [snapshot.drafts, snapshot.monitored],
  );

  const [selection, setSelection] = useState<{ conversationId: string } | null>(
    combinedConversations[0] ? { conversationId: combinedConversations[0].id } : null,
  );

  const conversationLookup = useMemo(() => {
    const map = new Map<string, CombinedConversationItem>();
    for (const item of combinedConversations) {
      map.set(item.id, item);
    }
    return map;
  }, [combinedConversations]);

  const selectedConversation = selection
    ? conversationLookup.get(selection.conversationId) ?? null
    : null;

  const actionConversationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of snapshot.followUps) {
      if (matchesFollowUpOperationalFilter(item, "action_required")) {
        ids.add(item.conversationId);
      }
    }
    return ids;
  }, [snapshot.followUps]);

  const reviewConversationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of snapshot.followUps) {
      if (matchesFollowUpOperationalFilter(item, "needs_review")) {
        ids.add(item.conversationId);
      }
    }
    return ids;
  }, [snapshot.followUps]);

  const conversationItems = useMemo(() => {
    const query = normalizeQuery(conversationQuery);
    return sortConversations(
      combinedConversations.filter(
        (item) =>
          matchesDisplayName(item.displayName, query) &&
          matchesConversationKind(item, conversationKindFilter) &&
          matchesConversationSource(item, conversationSourceFilter) &&
          matchesConversationOperationalFilter(
            item,
            conversationStatusFilter,
            actionConversationIds,
            reviewConversationIds,
          ),
      ),
      conversationSort,
    );
  }, [
    actionConversationIds,
    combinedConversations,
    conversationKindFilter,
    conversationQuery,
    conversationSort,
    conversationSourceFilter,
    conversationStatusFilter,
    reviewConversationIds,
  ]);

  const conversationBuckets = useMemo(
    () => bucketConversationItems(conversationItems, snapshot.generatedAt),
    [conversationItems, snapshot.generatedAt],
  );

  const followUpItems = useMemo(() => {
    const query = normalizeQuery(followUpQuery);
    return sortFollowUps(
      snapshot.followUps.filter(
        (item) =>
          matchesDisplayName(item.displayName, query) &&
          matchesFollowUpOperationalFilter(item, followUpFilter),
      ),
      followUpSort,
    );
  }, [followUpFilter, followUpQuery, followUpSort, snapshot.followUps]);

  useEffect(() => {
    if (!selection) return;

    if (!conversationItems.some((item) => item.id === selection.conversationId)) {
      setSelection(null);
    }
  }, [conversationItems, selection]);

  const selectedFollowUps = selectedConversation
    ? snapshot.followUps.filter((item) => item.conversationId === selectedConversation.id)
    : [];

  const subtitle = `${snapshot.monitored.length + snapshot.drafts.length} tracked conversation views · ${snapshot.followUps.length} active follow-ups · server snapshot`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>WhatsApp</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      <div className={styles.dashboard}>
        <section className={styles.splitPane} aria-label="WhatsApp messages and history">
          <div className={styles.sidePane}>
            <ConversationSection
              title="Messages"
              subtitle="Combined monitored and draft-response conversations with source tags."
              countLabel={countLabel(
                conversationItems.length,
                "message conversation",
                "message conversations",
              )}
              searchValue={conversationQuery}
              onSearchChange={setConversationQuery}
              searchPlaceholder="Search messages by display name"
              sort={conversationSort}
              onSortChange={setConversationSort}
              kindFilter={conversationKindFilter}
              onKindFilterChange={setConversationKindFilter}
              sourceFilter={conversationSourceFilter}
              onSourceFilterChange={setConversationSourceFilter}
              statusFilter={conversationStatusFilter}
              onStatusFilterChange={setConversationStatusFilter}
              buckets={conversationBuckets}
              selectedConversationId={selection?.conversationId ?? null}
              onSelect={(conversationId) => setSelection({ conversationId })}
              emptyTitle={combinedConversations.length === 0 ? "No WhatsApp messages" : "No matching WhatsApp messages"}
              emptyBody={
                combinedConversations.length === 0
                  ? "Monitored and draft-response WhatsApp conversations will appear here once the server-side dashboard feed is connected."
                  : "Try clearing or broadening the display-name, source, status, or type filters."
              }
            />
          </div>

          <HistoryPane
            selection={selection}
            conversation={selectedConversation}
            followUps={selectedFollowUps}
            onClearSelection={() => setSelection(null)}
          />
        </section>

        <FollowUpSection
          items={followUpItems}
          totalItems={snapshot.followUps.length}
          query={followUpQuery}
          onQueryChange={setFollowUpQuery}
          operationalFilter={followUpFilter}
          onOperationalFilterChange={setFollowUpFilter}
          sort={followUpSort}
          onSortChange={setFollowUpSort}
        />
      </div>
    </main>
  );
}

interface ConversationSectionProps {
  title: string;
  subtitle: string;
  countLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sort: WhatsAppConversationSortMode;
  onSortChange: (value: WhatsAppConversationSortMode) => void;
  kindFilter: ConversationKindFilter;
  onKindFilterChange: (value: ConversationKindFilter) => void;
  sourceFilter: ConversationSourceFilter;
  onSourceFilterChange: (value: ConversationSourceFilter) => void;
  statusFilter: ConversationOperationalFilter;
  onStatusFilterChange: (value: ConversationOperationalFilter) => void;
  buckets: ConversationBucket[];
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
  emptyTitle: string;
  emptyBody: string;
}

function ConversationSection({
  title,
  subtitle,
  countLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sort,
  onSortChange,
  kindFilter,
  onKindFilterChange,
  sourceFilter,
  onSourceFilterChange,
  statusFilter,
  onStatusFilterChange,
  buckets,
  selectedConversationId,
  onSelect,
  emptyTitle,
  emptyBody,
}: ConversationSectionProps) {
  const visibleCount = buckets.reduce((sum, bucket) => sum + bucket.items.length, 0);

  return (
    <section className={styles.sectionCard} aria-labelledby="messages-title">
      <div className={styles.stickySectionControls}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <h2 id="messages-title" className={styles.sectionTitle}>
              {title}
            </h2>
            <p className={styles.sectionSubtitle}>{subtitle}</p>
          </div>
          <span className={styles.countPill}>{countLabel}</span>
        </div>

        <div className={styles.controls}>
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            ariaLabel={`${title} search by display name`}
          />

          <div className={styles.controlsRow}>
            <div className={styles.filterControls}>
              <div className={styles.sortWrap}>
                <label className={styles.sortLabel} htmlFor="messages-kind">
                  Type
                </label>
                <select
                  id="messages-kind"
                  className={styles.sortSelect}
                  value={kindFilter}
                  onChange={(event) => onKindFilterChange(event.target.value as ConversationKindFilter)}
                >
                  {Object.entries(conversationKindFilterLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.sortWrap}>
                <label className={styles.sortLabel} htmlFor="messages-source">
                  Source
                </label>
                <select
                  id="messages-source"
                  className={styles.sortSelect}
                  value={sourceFilter}
                  onChange={(event) => onSourceFilterChange(event.target.value as ConversationSourceFilter)}
                >
                  {Object.entries(conversationSourceFilterLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.sortWrap}>
                <label className={styles.sortLabel} htmlFor="messages-status">
                  Status
                </label>
                <select
                  id="messages-status"
                  className={styles.sortSelect}
                  value={statusFilter}
                  onChange={(event) => onStatusFilterChange(event.target.value as ConversationOperationalFilter)}
                >
                  {Object.entries(conversationOperationalFilterLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.sortWrap}>
                <label className={styles.sortLabel} htmlFor="messages-sort">
                  Sort
                </label>
                <select
                  id="messages-sort"
                  className={styles.sortSelect}
                  value={sort}
                  onChange={(event) => onSortChange(event.target.value as WhatsAppConversationSortMode)}
                >
                  {Object.entries(conversationSortLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className={styles.metaLabel}>Read-only conversation list · {visibleCount} visible</span>
          </div>
        </div>
      </div>

      {visibleCount === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className={styles.bucketStack}>
          {buckets.map((bucket) => (
            <section key={`messages-${bucket.id}`} className={styles.bucketSection}>
              <div className={styles.bucketHeader}>
                <div>
                  <h3 className={styles.bucketTitle}>{bucket.label}</h3>
                  <p className={styles.bucketHelper}>{bucket.helper}</p>
                </div>
                <span className={styles.bucketCount}>{bucket.items.length}</span>
              </div>
              <ul className={styles.list} role="list">
                {bucket.items.map((item) => (
                  <ConversationRow
                    key={`messages-${item.id}`}
                    item={item}
                    isSelected={selectedConversationId === item.id}
                    onSelect={() => onSelect(item.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className={styles.searchWrap}>
      <svg
        className={styles.searchIcon}
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        className={styles.searchInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  );
}

function ConversationRow({
  item,
  isSelected,
  onSelect,
}: {
  item: CombinedConversationItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const absoluteTime = formatDashboardDateTime(item.lastMessageAt) ?? "Unknown time";
  const relativeTime = formatDashboardRelativeDateTime(item.lastMessageAt) ?? "No recent timestamp";
  const rowTokens = conversationRowTokens(item);

  return (
    <li>
      <button
        type="button"
        className={`${styles.rowButton} ${isSelected ? styles.rowButtonSelected : ""}`}
        aria-pressed={isSelected}
        onClick={onSelect}
      >
        <div className={styles.compactRowTop}>
          <div className={styles.compactIdentity}>
            <div className={styles.badges}>
              <span
                className={`${styles.kindBadge} ${
                  item.kind === "group" ? styles.kindGroup : styles.kindDirect
                }`}
              >
                {kindLabel(item.kind)}
              </span>

            </div>
            <span className={styles.displayName}>{item.displayName}</span>
          </div>

          <div className={styles.compactMeta}>
            <span className={styles.timeLabel}>{relativeTime}</span>
            <span className={styles.metaLabel}>{absoluteTime}</span>
          </div>
        </div>

        <div className={styles.compactRowBottom}>
          <p className={styles.lastMessage}>{item.lastMessageSummary}</p>
          {rowTokens.length > 0 && (
            <div className={styles.noteList}>
              {rowTokens.map((note) => (
                <span key={note} className={styles.noteBadge}>
                  {note}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
    </li>
  );
}

function HistoryPane({
  selection,
  conversation,
  followUps,
  onClearSelection,
}: {
  selection: { conversationId: string } | null;
  conversation: CombinedConversationItem | null;
  followUps: WhatsAppFollowUpItem[];
  onClearSelection: () => void;
}) {
  if (!conversation || !selection) {
    return (
      <section className={styles.historyPane} aria-labelledby="history-pane-title">
        <div className={styles.sectionTitleWrap}>
          <h2 id="history-pane-title" className={styles.sectionTitle}>
            Conversation history
          </h2>
          <p className={styles.sectionSubtitle}>
            Select a conversation from Messages to open safe recent history inside the WhatsApp dashboard.
          </p>
        </div>
        <EmptyState
          title="No conversation selected"
          body="Choose a message conversation to view recent timeline context, source tags, pending draft notes, and related scheduled follow-ups without leaving this dashboard."
        />
      </section>
    );
  }

  return (
    <section className={styles.historyPane} aria-labelledby="history-pane-title">
      <div className={styles.historyHeader}>
        <div className={styles.historyHeaderMain}>
          <div className={styles.badges}>
            <span
              className={`${styles.kindBadge} ${
                conversation.kind === "group" ? styles.kindGroup : styles.kindDirect
              }`}
            >
              {kindLabel(conversation.kind)}
            </span>
            {conversation.origins.map((origin) => (
              <span key={origin} className={styles.originBadge}>
                {origin === "monitored" ? "Monitored" : "Draft"}
              </span>
            ))}
          </div>
          <h2 id="history-pane-title" className={styles.title}>
            {conversation.displayName}
          </h2>
          <p className={styles.historyOrigin}>
            Selected conversation history stays read-only and preserves list context.
          </p>
        </div>

        <button type="button" className={styles.historyAction} onClick={onClearSelection}>
          Return to all conversations
        </button>
      </div>

      <div className={styles.historyBody}>
        <div className={styles.historyCards}>
          <div className={styles.historyCard}>
            <span className={styles.historyCardTitle}>Why it is visible</span>
            <p className={styles.historyCardBody}>
              {conversation.historySummary ?? conversation.lastMessageSummary}
            </p>
          </div>
          <div className={styles.historyCard}>
            <span className={styles.historyCardTitle}>Latest message</span>
            <p className={styles.historyCardBody}>{conversation.lastMessageSummary}</p>
            <span className={styles.historyOrigin}>
              {formatDashboardDateTime(conversation.lastMessageAt) ?? "Unknown time"}
              {" · "}
              {formatDashboardRelativeDateTime(conversation.lastMessageAt) ?? "No relative timestamp"}
            </span>
          </div>
          {conversation.reviewMessageExcerpt && (
            <div className={styles.historyCard}>
              <span className={styles.historyCardTitle}>Message this draft relates to</span>
              <div className={styles.relatedMessageCard}>
                <div className={styles.relatedMessageMeta}>
                  <span className={styles.relatedMessageAuthor}>
                    {conversation.reviewMessageExcerpt.author}
                  </span>
                  <span className={styles.timelineBadge}>
                    {conversation.reviewMessageExcerpt.direction === "inbound" ? "Incoming" : "Outgoing"}
                  </span>
                  <span className={styles.timelineTime}>
                    {conversation.reviewMessageExcerpt.sentLabel}
                  </span>
                </div>
                <p className={styles.historyCardBody}>{conversation.reviewMessageExcerpt.body}</p>
              </div>
            </div>
          )}
          {conversation.pendingDraftSnippet && (
            <div className={styles.historyCard}>
              <span className={styles.historyCardTitle}>Pending draft context</span>
              <p className={styles.historyCardBody}>{conversation.pendingDraftSnippet}</p>
            </div>
          )}
        </div>

        {followUps.length > 0 && (
          <div className={styles.historyCard}>
            <span className={styles.historyCardTitle}>Related scheduled follow-ups</span>
            <div className={styles.noteList}>
              {followUps.map((item) => (
                <span
                  key={item.id}
                  className={`${styles.stateBadge} ${followUpStateClassNames[item.state]}`}
                >
                  {followUpStateLabels[item.state]} · {item.title}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={styles.sectionTitleWrap}>
          <h3 className={styles.sectionTitle}>Recent timeline</h3>
          <p className={styles.sectionSubtitle}>
            Safe recent context only — no raw JIDs, phone numbers, private payloads, or transcript dumps.
          </p>
        </div>

        <ul className={styles.timelineList} role="list">
          {conversation.timeline.map((entry) => (
            <li key={entry.id} className={styles.timelineItem}>
              <div className={styles.timelineTop}>
                <div className={styles.timelineSpeakerWrap}>
                  <span className={styles.timelineSpeaker}>{entry.speaker}</span>
                  <span
                    className={`${styles.timelineBadge} ${
                      entry.direction === "inbound"
                        ? styles.timelineInbound
                        : entry.direction === "outbound"
                          ? styles.timelineOutbound
                          : styles.timelineSystem
                    }`}
                  >
                    {entry.direction === "inbound"
                      ? "Incoming"
                      : entry.direction === "outbound"
                        ? "Outgoing"
                        : "System"}
                  </span>
                </div>
                <time className={styles.timelineTime} dateTime={entry.sentAt}>
                  {formatDashboardDateTime(entry.sentAt) ?? "Unknown time"}
                  {" · "}
                  {formatDashboardRelativeDateTime(entry.sentAt) ?? "No relative timestamp"}
                </time>
              </div>
              <p className={styles.timelineSummary}>{entry.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FollowUpSection({
  items,
  totalItems,
  query,
  onQueryChange,
  operationalFilter,
  onOperationalFilterChange,
  sort,
  onSortChange,
}: {
  items: WhatsAppFollowUpItem[];
  totalItems: number;
  query: string;
  onQueryChange: (value: string) => void;
  operationalFilter: FollowUpOperationalFilter;
  onOperationalFilterChange: (value: FollowUpOperationalFilter) => void;
  sort: WhatsAppFollowUpSortMode;
  onSortChange: (value: WhatsAppFollowUpSortMode) => void;
}) {
  return (
    <section className={styles.sectionCard} aria-labelledby="follow-ups-title">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrap}>
          <h2 id="follow-ups-title" className={styles.sectionTitle}>
            Scheduled follow-ups
          </h2>
          <p className={styles.sectionSubtitle}>
            Action-oriented reminder rows tied to conversations and topics, with explicit state and due timing.
          </p>
        </div>
        <span className={styles.countPill}>
          {countLabel(items.length, "follow-up item", "follow-up items")}
        </span>
      </div>

      <div className={styles.controls}>
        <SearchInput
          value={query}
          onChange={onQueryChange}
          placeholder="Search follow-ups by display name"
          ariaLabel="Search scheduled follow-ups by display name"
        />

        <div className={styles.controlsRow}>
          <div className={styles.filterControls}>
            <div className={styles.sortWrap}>
              <label className={styles.sortLabel} htmlFor="follow-up-filter">
                Filter
              </label>
              <select
                id="follow-up-filter"
                className={styles.sortSelect}
                value={operationalFilter}
                onChange={(event) =>
                  onOperationalFilterChange(event.target.value as FollowUpOperationalFilter)
                }
              >
                {Object.entries(followUpOperationalFilterLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.sortWrap}>
              <label className={styles.sortLabel} htmlFor="follow-up-sort">
                Sort
              </label>
              <select
                id="follow-up-sort"
                className={styles.sortSelect}
                value={sort}
                onChange={(event) => onSortChange(event.target.value as WhatsAppFollowUpSortMode)}
              >
                {Object.entries(followUpSortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <span className={styles.metaLabel}>Read-only follow-up list · {items.length} visible</span>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={totalItems === 0 ? "No active follow-ups" : "No matching follow-ups"}
          body={
            totalItems === 0
              ? "Scheduled follow-up rows will appear here once the WhatsApp reminder feed is available."
              : "Try clearing or broadening the display-name search for scheduled follow-ups."
          }
        />
      ) : (
        <ul className={styles.followUpList} role="list">
          {items.map((item) => (
            <FollowUpRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FollowUpRow({ item }: { item: WhatsAppFollowUpItem }) {
  const dueLabel = formatDashboardDateTime(item.dueAt) ?? "No due time";
  const relativeDue = item.relativeDueLabel ?? formatDashboardRelativeDateTime(item.dueAt) ?? "Undated";

  return (
    <li className={styles.followUpRow}>
      <div className={styles.followUpTop}>
        <div className={styles.rowTitleWrap}>
          <div className={styles.badges}>
            <span
              className={`${styles.kindBadge} ${
                item.kind === "group" ? styles.kindGroup : styles.kindDirect
              }`}
            >
              {kindLabel(item.kind)}
            </span>
            <span className={`${styles.stateBadge} ${followUpStateClassNames[item.state]}`}>
              {followUpStateLabels[item.state]}
            </span>
          </div>
          <span className={styles.displayName}>{item.displayName}</span>
        </div>

        <div className={styles.followUpDue}>
          <span className={styles.timeLabel}>{relativeDue}</span>
          <span className={styles.metaLabel}>{dueLabel}</span>
        </div>
      </div>

      <p className={styles.followUpTitle}>{item.title}</p>
      <p className={styles.followUpContext}>{item.contextSummary}</p>
    </li>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.emptyState} role="status">
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
    </div>
  );
}
