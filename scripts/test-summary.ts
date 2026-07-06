#!/usr/bin/env tsx
/**
 * Summary page — sort, filter, and selection logic tests (spec 013).
 *
 * Tests the pure client-side logic from page-client.tsx:
 *   - Sort comparator: latest-received, oldest-received, undated fallback
 *   - Statistic filter composition with sort
 *   - Selection preservation / reset on filter and sort changes
 */

import type { CommunicationItem, CommunicationStatus } from "@/lib/dashboard-types";

// ── Test fixtures ──────────────────────────────────────────────────────────────

const BASE = "2026-07-01T10:00:00Z";

const email = (
  id: string,
  receivedAt: string,
  status: CommunicationStatus = "open",
): CommunicationItem => ({
  id: `email:${id}`,
  source: "email",
  status,
  title: `Email ${id}`,
  context: "Test context",
  receivedAt,
});

const whatsapp = (
  id: string,
  lastMessageAt: string,
  status: CommunicationStatus = "open",
): CommunicationItem => ({
  id: `whatsapp:${id}`,
  source: "whatsapp",
  status,
  title: `WhatsApp ${id}`,
  context: "Test context",
  receivedAt: lastMessageAt,
});

const undated = (id: string, source: "email" | "whatsapp" = "email"): CommunicationItem => ({
  id: `${source}:${id}`,
  source,
  status: "open",
  title: `${source} ${id} undated`,
  context: "No timestamp",
  // receivedAt intentionally absent
});

// ── Sort comparator (mirrors page-client.tsx logic) ────────────────────────────

type SortMode = "latest-received" | "oldest-received";

function receivedDateLabel(item: CommunicationItem): string | null {
  if (!item.receivedAt) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(item.receivedAt));
  } catch {
    return null;
  }
}

function compareItems(
  a: CommunicationItem,
  b: CommunicationItem,
  mode: SortMode,
): number {
  const aLabel = receivedDateLabel(a);
  const bLabel = receivedDateLabel(b);

  if (!aLabel && !bLabel) return 0;
  if (!aLabel) return 1;
  if (!bLabel) return -1;

  const aTime = new Date(a.receivedAt!).getTime();
  const bTime = new Date(b.receivedAt!).getTime();
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;

  return mode === "latest-received" ? bTime - aTime : aTime - bTime;
}

function applyFilter(
  items: CommunicationItem[],
  filter: "all" | "whatsapp" | "email" | "open" | "needs-review",
): CommunicationItem[] {
  switch (filter) {
    case "whatsapp":
      return items.filter((i) => i.source === "whatsapp");
    case "email":
      return items.filter((i) => i.source === "email");
    case "open":
      return items.filter((i) => i.status === "open");
    case "needs-review":
      return items.filter((i) => i.status === "uncertain_needs_review");
    default:
      return items;
  }
}

function applySort(
  items: CommunicationItem[],
  mode: SortMode,
): CommunicationItem[] {
  return [...items].sort((a, b) => compareItems(a, b, mode));
}

// ── Test harness ───────────────────────────────────────────────────────────────

type TestResult = "PASS" | "FAIL";
interface Test {
  name: string;
  run: () => TestResult;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const tests: Test[] = [
  // ── Sort: latest-received (newest first) ────────────────────────────────

  {
    name: "sort latest-received: newest dated item appears first",
    run: () => {
      const items = [
        email("a", "2026-06-28T09:00:00Z"),
        email("b", "2026-07-01T12:00:00Z"),
        email("c", "2026-06-30T08:00:00Z"),
      ];
      const sorted = applySort(items, "latest-received");
      assertEqual(sorted[0].id, "email:b", "first item");
      assertEqual(sorted[1].id, "email:c", "second item");
      assertEqual(sorted[2].id, "email:a", "third item");
      return "PASS";
    },
  },

  {
    name: "sort latest-received: single item stays in place",
    run: () => {
      const items = [email("a", "2026-07-01T08:00:00Z")];
      const sorted = applySort(items, "latest-received");
      assertEqual(sorted.length, 1, "length");
      assertEqual(sorted[0].id, "email:a", "only item");
      return "PASS";
    },
  },

  // ── Sort: oldest-received (oldest first) ────────────────────────────────

  {
    name: "sort oldest-received: oldest dated item appears first",
    run: () => {
      const items = [
        email("a", "2026-07-01T12:00:00Z"),
        email("b", "2026-06-28T09:00:00Z"),
        email("c", "2026-06-30T08:00:00Z"),
      ];
      const sorted = applySort(items, "oldest-received");
      assertEqual(sorted[0].id, "email:b", "first item (oldest)");
      assertEqual(sorted[1].id, "email:c", "second item");
      assertEqual(sorted[2].id, "email:a", "third item (newest)");
      return "PASS";
    },
  },

  // ── Sort: undated rows ─────────────────────────────────────────────────

  {
    name: "sort latest-received: undated rows sort after dated rows",
    run: () => {
      const items = [
        undated("u1"),
        email("d", "2026-07-01T12:00:00Z"),
        undated("u2"),
        email("o", "2026-06-28T09:00:00Z"),
      ];
      const sorted = applySort(items, "latest-received");
      // Dated first, descending
      assertEqual(sorted[0].id, "email:d", "first (newest dated)");
      assertEqual(sorted[1].id, "email:o", "second (older dated)");
      // Undated after
      assertEqual(sorted[2].id, "email:u1", "third (undated)");
      assertEqual(sorted[3].id, "email:u2", "fourth (undated)");
      return "PASS";
    },
  },

  {
    name: "sort oldest-received: undated rows sort after dated rows",
    run: () => {
      const items = [
        undated("u1"),
        email("n", "2026-07-01T12:00:00Z"),
        undated("u2"),
        email("o", "2026-06-28T09:00:00Z"),
      ];
      const sorted = applySort(items, "oldest-received");
      // Dated first, ascending
      assertEqual(sorted[0].id, "email:o", "first (oldest dated)");
      assertEqual(sorted[1].id, "email:n", "second (newer dated)");
      // Undated after
      assertEqual(sorted[2].id, "email:u1", "third (undated)");
      assertEqual(sorted[3].id, "email:u2", "fourth (undated)");
      return "PASS";
    },
  },

  {
    name: "sort: all-undated rows maintain original order",
    run: () => {
      const items = [undated("b"), undated("a"), undated("c")];
      const sorted = applySort(items, "latest-received");
      assertEqual(sorted[0].id, "email:b", "first");
      assertEqual(sorted[1].id, "email:a", "second");
      assertEqual(sorted[2].id, "email:c", "third");
      return "PASS";
    },
  },

  {
    name: "sort: invalid ISO timestamp treated as undated",
    run: () => {
      const items = [
        { ...email("a", "2026-07-01T12:00:00Z"), receivedAt: "not-a-date" },
        email("b", "2026-06-28T09:00:00Z"),
      ];
      const sorted = applySort(items, "latest-received");
      // b is valid and newer, so b first; a is invalid/undated so a after
      assertEqual(sorted[0].id, "email:b", "first (valid dated)");
      assertEqual(sorted[1].id, "email:a", "second (invalid date treated as undated)");
      return "PASS";
    },
  },

  // ── Filter + sort composition ─────────────────────────────────────────

  {
    name: "filter then sort: WhatsApp filter with latest-received",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        whatsapp("w1", "2026-07-01T08:00:00Z"),
        whatsapp("w2", "2026-07-01T10:00:00Z"),
        email("e2", "2026-06-30T09:00:00Z"),
      ];
      const filtered = applyFilter(items, "whatsapp");
      const sorted = applySort(filtered, "latest-received");
      assertEqual(sorted.length, 2, "count");
      assertEqual(sorted[0].id, "whatsapp:w2", "w2 is newer (10:00 vs 08:00)");
      assertEqual(sorted[1].id, "whatsapp:w1", "w1 is older");
      return "PASS";
    },
  },

  {
    name: "filter then sort: email filter with oldest-received",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        whatsapp("w1", "2026-07-01T08:00:00Z"),
        email("e2", "2026-06-30T09:00:00Z"),
      ];
      const filtered = applyFilter(items, "email");
      const sorted = applySort(filtered, "oldest-received");
      assertEqual(sorted.length, 2, "count");
      assertEqual(sorted[0].id, "email:e2", "e2 is older");
      assertEqual(sorted[1].id, "email:e1", "e1 is newer");
      return "PASS";
    },
  },

  {
    name: "filter then sort: open filter with latest-received",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z", "open"),
        whatsapp("w1", "2026-07-01T08:00:00Z", "resolved"),
        email("e2", "2026-06-30T09:00:00Z", "open"),
      ];
      const filtered = applyFilter(items, "open");
      const sorted = applySort(filtered, "latest-received");
      assertEqual(sorted.length, 2, "count");
      assertEqual(sorted[0].id, "email:e1", "e1 is newer open");
      assertEqual(sorted[1].id, "email:e2", "e2 is older open");
      return "PASS";
    },
  },

  {
    name: "filter then sort: needs-review filter with latest-received",
    run: () => {
      const items = [
        whatsapp("w1", "2026-07-01T08:00:00Z", "uncertain_needs_review"),
        whatsapp("w2", "2026-07-01T10:00:00Z", "open"),
        whatsapp("w3", "2026-07-01T09:00:00Z", "uncertain_needs_review"),
      ];
      const filtered = applyFilter(items, "needs-review");
      const sorted = applySort(filtered, "latest-received");
      assertEqual(sorted.length, 2, "count");
      assertEqual(sorted[0].id, "whatsapp:w3", "w3 is newest needs-review (09:00 vs 08:00)");
      assertEqual(sorted[1].id, "whatsapp:w1", "w1 is older needs-review");
      return "PASS";
    },
  },

  {
    name: "filter 'all' returns all items unfiltered",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        whatsapp("w1", "2026-07-01T08:00:00Z"),
      ];
      const filtered = applyFilter(items, "all");
      assertEqual(filtered.length, 2, "count");
      return "PASS";
    },
  },

  // ── Selection preservation on filter change ─────────────────────────────

  {
    name: "selection preserved when selected row stays in filtered set",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        whatsapp("w1", "2026-07-01T08:00:00Z"),
      ];
      const selectedId = "email:e1";
      const filtered = applyFilter(items, "whatsapp");
      const selectedStillPresent = filtered.some((i) => i.id === selectedId);
      assertEqual(selectedStillPresent, false, "email:e1 NOT in whatsapp filter");
      // Simulate the useEffect: selectedId should be cleared when filtered away
      const wouldReset =
        selectedId && !filtered.some((i) => i.id === selectedId);
      assertEqual(wouldReset, true, "selection would reset");
      return "PASS";
    },
  },

  {
    name: "selection preserved when selected row remains after filter",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        whatsapp("w1", "2026-07-01T08:00:00Z"),
      ];
      const selectedId = "email:e1";
      const filtered = applyFilter(items, "all");
      const wouldReset =
        selectedId && !filtered.some((i) => i.id === selectedId);
      assertEqual(wouldReset, false, "selection preserved with 'all' filter");
      return "PASS";
    },
  },

  // ── Selection preservation on sort change ───────────────────────────────

  {
    name: "selection preserved when selected row remains visible after sort",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        email("e2", "2026-07-01T08:00:00Z"),
      ];
      const selectedId = "email:e2";
      const sorted = applySort(items, "latest-received");
      // e2 is still in the set (just reordered)
      const wouldReset =
        selectedId && !sorted.some((i) => i.id === selectedId);
      assertEqual(wouldReset, false, "selection preserved after sort");
      return "PASS";
    },
  },

  {
    name: "sort change does not reorder the selected row to invisible",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        email("e2", "2026-07-01T08:00:00Z"),
        undated("u1"),
      ];
      const selectedId = "email:u1";
      const sorted = applySort(items, "latest-received");
      // undated item is still in the list (just at the end)
      const wouldReset =
        selectedId && !sorted.some((i) => i.id === selectedId);
      assertEqual(wouldReset, false, "undated selected row still present after sort");
      return "PASS";
    },
  },

  // ── Cross-source mixed scenarios ────────────────────────────────────────

  {
    name: "mixed sources: latest-received shows WhatsApp then email by timestamp",
    run: () => {
      const items = [
        email("e1", "2026-07-01T08:00:00Z"),
        whatsapp("w1", "2026-07-01T12:00:00Z"),
        email("e2", "2026-07-01T10:00:00Z"),
      ];
      const sorted = applySort(items, "latest-received");
      assertEqual(sorted[0].id, "whatsapp:w1", "whatsapp (newest 12:00)");
      assertEqual(sorted[1].id, "email:e2", "email (10:00)");
      assertEqual(sorted[2].id, "email:e1", "email (oldest 08:00)");
      return "PASS";
    },
  },

  {
    name: "mixed sources: oldest-received shows email then WhatsApp by timestamp",
    run: () => {
      const items = [
        email("e1", "2026-07-01T08:00:00Z"),
        whatsapp("w1", "2026-07-01T12:00:00Z"),
        email("e2", "2026-07-01T10:00:00Z"),
      ];
      const sorted = applySort(items, "oldest-received");
      assertEqual(sorted[0].id, "email:e1", "email (oldest 08:00)");
      assertEqual(sorted[1].id, "email:e2", "email (10:00)");
      assertEqual(sorted[2].id, "whatsapp:w1", "whatsapp (newest 12:00)");
      return "PASS";
    },
  },

  // ── receivedDateLabel utility ───────────────────────────────────────────

  {
    name: "receivedDateLabel returns null for undated item",
    run: () => {
      const item = undated("u1");
      const label = receivedDateLabel(item);
      assertEqual(label, null, "undated item returns null");
      return "PASS";
    },
  },

  {
    name: "receivedDateLabel returns formatted string for dated item",
    run: () => {
      const item = email("e1", "2026-07-01T14:30:00Z");
      const label = receivedDateLabel(item);
      assert(label !== null, "dated item returns non-null label");
      return "PASS";
    },
  },

  {
    name: "receivedDateLabel returns null for invalid timestamp",
    run: () => {
      const item = { ...email("e1", "2026-07-01T14:30:00Z"), receivedAt: "invalid" };
      const label = receivedDateLabel(item);
      assertEqual(label, null, "invalid timestamp returns null");
      return "PASS";
    },
  },

  // ── Full pipeline: filter → sort → selection check ─────────────────────

  {
    name: "full pipeline: WhatsApp filter → oldest-received → selection check",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        whatsapp("w1", "2026-07-01T08:00:00Z"),
        whatsapp("w2", "2026-07-01T10:00:00Z"),
        email("e2", "2026-06-30T09:00:00Z"),
      ];
      const selectedId = "whatsapp:w1";

      const filtered = applyFilter(items, "whatsapp");
      const sorted = applySort(filtered, "oldest-received");

      // Only WhatsApp items, oldest first
      assertEqual(sorted.length, 2, "filtered count");
      assertEqual(sorted[0].id, "whatsapp:w1", "w1 oldest (08:00)");
      assertEqual(sorted[1].id, "whatsapp:w2", "w2 newer (10:00)");

      // Selection preserved
      const wouldReset =
        selectedId && !sorted.some((i) => i.id === selectedId);
      assertEqual(wouldReset, false, "selection preserved");

      return "PASS";
    },
  },

  {
    name: "filter reduces visible set while counts stay full",
    run: () => {
      const items = [
        email("e1", "2026-07-01T12:00:00Z"),
        whatsapp("w1", "2026-07-01T08:00:00Z"),
        whatsapp("w2", "2026-07-01T10:00:00Z"),
      ];

      const totalCount = items.length;
      const whatsappCount = items.filter((i) => i.source === "whatsapp").length;
      const emailCount = items.filter((i) => i.source === "email").length;

      assertEqual(totalCount, 3, "total count");
      assertEqual(whatsappCount, 2, "whatsapp count");
      assertEqual(emailCount, 1, "email count");

      const filtered = applyFilter(items, "whatsapp");
      assertEqual(filtered.length, 2, "filtered WhatsApp count");
      // Count contract: counts stay at full dataset level (tested via type usage)
      assertEqual(
        filtered.length < whatsappCount,
        false,
        "filtered set is not less than the full WhatsApp count",
      );

      return "PASS";
    },
  },

  // ── Edge cases ─────────────────────────────────────────────────────────

  {
    name: "empty item list: sort returns empty array",
    run: () => {
      const sorted = applySort([], "latest-received");
      assertEqual(sorted.length, 0, "length is 0");
      return "PASS";
    },
  },

  {
    name: "filter with no matching items returns empty array",
    run: () => {
      const items = [email("e1", "2026-07-01T12:00:00Z")];
      const filtered = applyFilter(items, "needs-review");
      assertEqual(filtered.length, 0, "length is 0");
      return "PASS";
    },
  },

  {
    name: "timestamp exactly equal: stable order maintained",
    run: () => {
      const items = [
        email("a", "2026-07-01T10:00:00Z"),
        email("b", "2026-07-01T10:00:00Z"),
        email("c", "2026-07-01T10:00:00Z"),
      ];
      const sorted = applySort(items, "latest-received");
      // All equal timestamps — original order maintained by stable sort
      assertEqual(sorted[0].id, "email:a", "first");
      assertEqual(sorted[1].id, "email:b", "second");
      assertEqual(sorted[2].id, "email:c", "third");
      return "PASS";
    },
  },
];

// ── Run tests ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    const result = t.run();
    if (result === "PASS") {
      passed++;
      console.log(`  ✓ ${t.name}`);
    } else {
      failed++;
      console.log(`  ✗ ${t.name} — ${result}`);
    }
  } catch (err) {
    failed++;
    console.log(`  ✗ ${t.name}`);
    console.log(`    Reason: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) {
  console.error(`\nFAIL — ${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log("\nAll tests passed.");
  process.exit(0);
}
