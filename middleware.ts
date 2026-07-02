import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthConfigurationError } from "@/lib/auth";

function buildRedirect(request: NextRequest, error?: string) {
  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  if (error) {
    signInUrl.searchParams.set("error", error);
  }

  return NextResponse.redirect(signInUrl);
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/dashboard/sync") {
    return NextResponse.next();
  }

  const configurationError = getAuthConfigurationError();
  if (configurationError) {
    return buildRedirect(request, "Configuration");
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return buildRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/whatsapp/:path*", "/emails/:path*", "/api/dashboard/:path*"],
};
