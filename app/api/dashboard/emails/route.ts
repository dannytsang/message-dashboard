import { NextResponse } from "next/server";
import { requireAuthenticatedApiSession } from "@/lib/auth-helpers";
import { readEmailInboxItems } from "@/lib/dashboard-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthenticatedApiSession();
  if ("response" in auth) {
    return auth.response;
  }

  const { items, mode, warning } = await readEmailInboxItems();

  return NextResponse.json({
    mode,
    warning,
    items,
  });
}
