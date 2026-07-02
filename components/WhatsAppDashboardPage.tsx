"use client";

import { useMemo, useState } from "react";
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
  dataMode: "blob" | "fixture-fallback";
}

interface ConversationBucket {
  id: "now" | "next" | "recent";
  label: string;
  helper: string;
  items: WhatsAppConversationItem[];
}

const conversationSortLabels: Record<WhatsAppConversationSortMode, string> = {
  "latest-message": "Latest message",
  "name-a-z": "Name A–Z",
};

const followUpSortLabels: Record<WhatsAppFollowUpSortMode, string> = {
  "due-soonest": "Due soonest",
  "name-a-z": "Name A–Z",
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

function sortConversations(
  items: WhatsAppConversationItem[],
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
  return [...items].sort(sort === "name-a-z" ? compareFollowUpsByName : compareFollowUpsByDue);
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function kindLabel(kind: WhatsAppConversationItem["kind"] | WhatsAppFollowUpItem["kind"]) {
  return kind === "group" ? "Group" : "Direct";
}

function bucketConversationItems(
  items: WhatsAppConversationItem[],
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

function conversationRowTokens(item: WhatsAppConversationItem, origin: WhatsAppConversationListKey) {
  const tokens: string[] = [];

  if (origin === "drafts" && item.pendingDraftSnippet) {
    tokens.push(`Draft · ${item.pendingDraftSnippet}`);
  }

  if (item.listNotes?.length) {
    tokens.push(...item.listNotes);
  }

  return tokens;
}

export default function WhatsAppDashboardPage({
  snapshot,
  dataMode,
}: WhatsAppDashboardPageProps) {
  const [monitoredQuery, setMonitoredQuery] = useState("");
  const [draftsQuery, setDraftsQuery] = useState("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [monitoredSort, setMonitoredSort] =
    useState<WhatsAppConversationSortMode>("latest-message");
  const [draftsSort, setDraftsSort] = useState<WhatsAppConversationSortMode>("latest-message");
  const [followUpSort, setFollowUpSort] =
    useState<WhatsAppFollowUpSortMode>("due-soonest");
  const [selection, setSelection] = useState<{
    conversationId: string;
    origin: WhatsAppConversationListKey;
  } | null>(snapshot.monitored[0] ? { conversationId: snapshot.monitored[0].id, origin: "monitored" } : null);

  const conversationLookup = useMemo(() => {
    const map = new Map<string, WhatsAppConversationItem>();
    for (const item of [...snapshot.monitored, ...snapshot.drafts]) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [snapshot.drafts, snapshot.monitored]);

  const selectedConversation = selection
    ? conversationLookup.get(selection.conversationId) ?? null
    : null;

  const monitoredItems = useMemo(() => {
    const query = normalizeQuery(monitoredQuery);
    return sortConversations(
      snapshot.monitored.filter((item) => matchesDisplayName(item.displayName, query)),
      monitoredSort,
    );
  }, [monitoredQuery, monitoredSort, snapshot.monitored]);

  const draftItems = useMemo(() => {
    const query = normalizeQuery(draftsQuery);
    return sortConversations(
      snapshot.drafts.filter((item) => matchesDisplayName(item.displayName, query)),
      draftsSort,
    );
  }, [draftsQuery, draftsSort, snapshot.drafts]);

  const monitoredBuckets = useMemo(
    () => bucketConversationItems(monitoredItems, snapshot.generatedAt),
    [monitoredItems, snapshot.generatedAt],
  );

  const draftBuckets = useMemo(
    () => bucketConversationItems(draftItems, snapshot.generatedAt),
    [draftItems, snapshot.generatedAt],
  );

  const followUpItems = useMemo(() => {
    const query = normalizeQuery(followUpQuery);
    return sortFollowUps(
      snapshot.followUps.filter((item) => matchesDisplayName(item.displayName, query)),
      followUpSort,
    );
  }, [followUpQuery, followUpSort, snapshot.followUps]);

  const selectedFollowUps = selectedConversation
    ? snapshot.followUps.filter((item) => item.conversationId === selectedConversation.id)
    : [];

  const subtitle = `${snapshot.monitored.length + snapshot.drafts.length} tracked conversation views · ${snapshot.followUps.length} active follow-ups · ${
    dataMode === "blob" ? "server snapshot" : "fictional fixture fallback"
  }`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>WhatsApp</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      <div className={styles.dashboard}>
        <section className={styles.splitPane} aria-label="WhatsApp monitored conversations and history">
          <div className={styles.sidePane}>
            <ConversationSection
              title="Monitored"
              subtitle="Read-only watched conversations with recent safe message context."
              countLabel={countLabel(
                monitoredItems.length,
                "monitored conversation",
                "monitored conversations",
              )}
              searchValue={monitoredQuery}
              onSearchChange={setMonitoredQuery}
              searchPlaceholder="Search monitored by display name"
              sort={monitoredSort}
              onSortChange={setMonitoredSort}
              buckets={monitoredBuckets}
              origin="monitored"
              selectedConversationId={selection?.conversationId ?? null}
              onSelect={(conversationId) => setSelection({ conversationId, origin: "monitored" })}
              emptyTitle={snapshot.monitored.length === 0 ? "No monitored conversations" : "No matching monitored conversations"}
              emptyBody={
                snapshot.monitored.length === 0
                  ? "Fictional monitored WhatsApp conversations will appear here once the server-side dashboard feed is connected."
                  : "Try clearing or broadening the display-name search for monitored chats."
              }
            />

            <ConversationSection
              title="Draft responses"
              subtitle="Chats with a pending draft response waiting for review only."
              countLabel={countLabel(draftItems.length, "draft conversation", "draft conversations")}
              searchValue={draftsQuery}
              onSearchChange={setDraftsQuery}
              searchPlaceholder="Search drafts by display name"
              sort={draftsSort}
              onSortChange={setDraftsSort}
              buckets={draftBuckets}
              origin="drafts"
              selectedConversationId={selection?.conversationId ?? null}
              onSelect={(conversationId) => setSelection({ conversationId, origin: "drafts" })}
              emptyTitle={snapshot.drafts.length === 0 ? "No draft-response conversations" : "No matching draft-response conversations"}
              emptyBody={
                snapshot.drafts.length === 0
                  ? "Pending-draft conversations will appear here without exposing any send or approval actions."
                  : "Try clearing or broadening the display-name search for draft-response chats."
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
  buckets: ConversationBucket[];
  origin: WhatsAppConversationListKey;
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
  buckets,
  origin,
  selectedConversationId,
  onSelect,
  emptyTitle,
  emptyBody,
}: ConversationSectionProps) {
  const visibleCount = buckets.reduce((sum, bucket) => sum + bucket.items.length, 0);

  return (
    <section className={styles.sectionCard} aria-labelledby={`${origin}-title`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrap}>
          <h2 id={`${origin}-title`} className={styles.sectionTitle}>
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
          <div className={styles.sortWrap}>
            <label className={styles.sortLabel} htmlFor={`${origin}-sort`}>
              Sort
            </label>
            <select
              id={`${origin}-sort`}
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
          <span className={styles.metaLabel}>Read-only conversation list · {visibleCount} visible</span>
        </div>
      </div>

      {visibleCount === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className={styles.bucketStack}>
          {buckets.map((bucket) => (
            <section key={`${origin}-${bucket.id}`} className={styles.bucketSection}>
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
                    key={`${origin}-${item.id}`}
                    item={item}
                    isSelected={selectedConversationId === item.id}
                    origin={origin}
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
  origin,
  onSelect,
}: {
  item: WhatsAppConversationItem;
  isSelected: boolean;
  origin: WhatsAppConversationListKey;
  onSelect: () => void;
}) {
  const absoluteTime = formatDashboardDateTime(item.lastMessageAt) ?? "Unknown time";
  const relativeTime = formatDashboardRelativeDateTime(item.lastMessageAt) ?? "No recent timestamp";
  const rowTokens = conversationRowTokens(item, origin);

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
              {origin === "drafts" && <span className={styles.draftBadge}>Pending draft</span>}
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
  selection: { conversationId: string; origin: WhatsAppConversationListKey } | null;
  conversation: WhatsAppConversationItem | null;
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
            Select a conversation from Monitored or Draft responses to open safe recent history inside the WhatsApp dashboard.
          </p>
        </div>
        <EmptyState
          title="No conversation selected"
          body="Choose a monitored or draft-response chat to view recent timeline context, pending draft notes, and related scheduled follow-ups without leaving this dashboard."
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
            <span className={styles.originBadge}>
              Opened from {selection.origin === "monitored" ? "Monitored" : "Draft responses"}
            </span>
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
  sort,
  onSortChange,
}: {
  items: WhatsAppFollowUpItem[];
  totalItems: number;
  query: string;
  onQueryChange: (value: string) => void;
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
          <span className={styles.metaLabel}>Read-only follow-up list</span>
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
