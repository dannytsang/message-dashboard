import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authOptions, getAuthConfigurationError } from "@/lib/auth";

function buildSignInUrl(callbackUrl: string, error?: string) {
  const params = new URLSearchParams({ callbackUrl });
  if (error) {
    params.set("error", error);
  }
  return `/auth/signin?${params.toString()}`;
}

export async function getOptionalServerSession() {
  if (getAuthConfigurationError()) {
    return null;
  }

  return getServerSession(authOptions);
}

export async function requireAuthenticatedPageSession(callbackUrl: string) {
  const configurationError = getAuthConfigurationError();
  if (configurationError) {
    redirect(buildSignInUrl(callbackUrl, "Configuration"));
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(buildSignInUrl(callbackUrl));
  }

  return session;
}

export async function requireAuthenticatedApiSession() {
  const configurationError = getAuthConfigurationError();
  if (configurationError) {
    return {
      response: NextResponse.json(
        {
          error: "auth_not_configured",
          message: configurationError,
        },
        { status: 503 }
      ),
    } as const;
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      response: NextResponse.json(
        {
          error: "unauthenticated",
          message: "Authentication is required.",
        },
        { status: 401 }
      ),
    } as const;
  }

  return { session } as const;
}
