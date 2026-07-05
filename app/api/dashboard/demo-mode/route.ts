/**
 * POST /api/dashboard/demo-mode
 *
 * Sets or clears the `dashboard-demo-mode` cookie that controls whether the
 * dashboard renders in live or demo mode for the current authenticated user.
 *
 * Auth: requires an active OIDC session (next-auth). Unauthenticated callers
 * receive 401.
 *
 * Cookie semantics (spec 010 FR-003):
 *   `dashboard-demo-mode=demo`   → forces demo mode regardless of runtime triggers
 *   `dashboard-demo-mode=live`  → live mode honoured only when Blob is available;
 *                                  silently falls back to demo when Blob is unavailable
 *   absent / invalid value      → runtime-decided mode is used (no override)
 *
 * Cookie attributes: HttpOnly, SameSite=Lax, Path=/, Max-Age=30 days.
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getOptionalServerSession } from "@/lib/auth-helpers";

const COOKIE_NAME = "dashboard-demo-mode";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function makeCookie(mode: "demo" | "live"): string {
  return `${COOKIE_NAME}=${mode}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

function validMode(value: unknown): value is "demo" | "live" {
  return value === "demo" || value === "live";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await getOptionalServerSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !validMode((body as Record<string, unknown>).mode)) {
    return NextResponse.json(
      { error: "Body must contain { mode: 'demo' | 'live' }." },
      { status: 400 }
    );
  }

  const mode = (body as { mode: "demo" | "live" }).mode;

  // ── Set cookie and respond ───────────────────────────────────────────────────
  const response = NextResponse.json({ ok: true, mode });
  response.cookies.set({
    name: COOKIE_NAME,
    value: mode,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return response;
}
