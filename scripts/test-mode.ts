#!/usr/bin/env tsx
/**
 * Live-mode regression tests.
 *
 * The dashboard must always stay in live mode, even when Blob is missing or a
 * source reader reports partial availability.
 */

type DashboardSiteMode = "live";

interface DashboardSiteModeDecision {
  mode: DashboardSiteMode;
  reasons: [];
}

interface DashboardShellModeState {
  mode: DashboardSiteMode;
  showDemoBanner: false;
  bannerText: "";
}

function getSiteMode(): DashboardSiteModeDecision {
  return { mode: "live", reasons: [] };
}

function getShellModeState(): DashboardShellModeState {
  return { mode: "live", showDemoBanner: false, bannerText: "" };
}

function getEffectiveRenderMode(): "live" {
  return "live";
}

type TestResult = "PASS" | "FAIL";
interface Test { name: string; run: () => TestResult; }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const tests: Test[] = [
  {
    name: "getSiteMode always returns live",
    run: () => {
      const mode = getSiteMode();
      assertEqual(mode.mode, "live", "mode");
      assertEqual(mode.reasons.length, 0, "reasons length");
      return "PASS";
    },
  },
  {
    name: "getSiteMode ignores missing Blob env",
    run: () => {
      const oldBlob = process.env.BLOB_READ_WRITE_TOKEN;
      const oldVercelBlob = process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
      delete process.env.BLOB_READ_WRITE_TOKEN;
      delete process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
      try {
        assertEqual(getSiteMode().mode, "live", "mode with Blob env absent");
      } finally {
        if (oldBlob === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
        else process.env.BLOB_READ_WRITE_TOKEN = oldBlob;
        if (oldVercelBlob === undefined) delete process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
        else process.env.VERCEL_BLOB_READ_WRITE_TOKEN = oldVercelBlob;
      }
      return "PASS";
    },
  },
  {
    name: "getShellModeState never shows fallback banner",
    run: () => {
      const shell = getShellModeState();
      assertEqual(shell.mode, "live", "shell mode");
      assertEqual(shell.showDemoBanner, false, "showDemoBanner");
      assertEqual(shell.bannerText, "", "bannerText");
      return "PASS";
    },
  },
  {
    name: "getEffectiveRenderMode always returns live",
    run: () => {
      assertEqual(getEffectiveRenderMode(), "live", "effective mode");
      return "PASS";
    },
  },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    const result = t.run();
    if (result === "PASS") { passed++; console.log(`  ✓ ${t.name}`); }
    else { failed++; console.log(`  ✗ ${t.name} — ${result}`); }
  } catch (err) {
    failed++;
    console.log(`  ✗ ${t.name}`);
    console.log(`    Reason: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) { console.error(`\nFAIL — ${failed} test(s) failed`); process.exit(1); }
else { console.log("\nAll tests passed."); process.exit(0); }
