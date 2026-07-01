import { NextResponse } from "next/server";
import { requireAuthenticatedApiSession } from "@/lib/auth-helpers";
import { readDashboardSnapshot } from "@/lib/dashboard-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthenticatedApiSession();
  if ("response" in auth) {
    return auth.response;
  }

  const { snapshot, mode, warning } = await readDashboardSnapshot();

  return NextResponse.json({
    mode,
    warning,
    snapshot,
  });
}
