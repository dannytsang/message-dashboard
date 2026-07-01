import type { Session } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import AuthentikProvider from "next-auth/providers/authentik";

export const REQUIRED_AUTH_ENV = [
  "AUTHENTIK_CLIENT_ID",
  "AUTHENTIK_CLIENT_SECRET",
  "AUTHENTIK_ISSUER",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
] as const;

function getRequiredEnvRecord() {
  return {
    AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID,
    AUTHENTIK_CLIENT_SECRET: process.env.AUTHENTIK_CLIENT_SECRET,
    AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  };
}

function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function getMissingAuthEnvironment(): string[] {
  const env = getRequiredEnvRecord();
  return REQUIRED_AUTH_ENV.filter((key) => !env[key]);
}

export function getInvalidAuthEnvironment(): string[] {
  const invalid: string[] = [];

  if (process.env.AUTHENTIK_ISSUER && !isValidUrl(process.env.AUTHENTIK_ISSUER)) {
    invalid.push("AUTHENTIK_ISSUER");
  }

  if (process.env.NEXTAUTH_URL && !isValidUrl(process.env.NEXTAUTH_URL)) {
    invalid.push("NEXTAUTH_URL");
  }

  return invalid;
}

export function getAuthConfigurationError(): string | null {
  const missing = getMissingAuthEnvironment();
  if (missing.length > 0) {
    return `Missing required auth environment variable(s): ${missing.join(", ")}`;
  }

  const invalid = getInvalidAuthEnvironment();
  if (invalid.length > 0) {
    return `Invalid auth environment variable(s): ${invalid.join(", ")}`;
  }

  return null;
}

export function isAuthConfigured(): boolean {
  return getAuthConfigurationError() === null;
}

function buildProviders() {
  if (!isAuthConfigured()) {
    return [];
  }

  return [
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_CLIENT_ID!,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
      issuer: process.env.AUTHENTIK_ISSUER!,
    }),
  ];
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  secret: process.env.NEXTAUTH_SECRET ?? "missing-nextauth-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
};

export function getSessionDisplayName(
  user: Session["user"] | null | undefined,
  fallback = "Comms user"
): string {
  return user?.name?.trim() || user?.email?.trim() || fallback;
}
