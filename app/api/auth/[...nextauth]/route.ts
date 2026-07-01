import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, getAuthConfigurationError } from "@/lib/auth";

const handler = NextAuth(authOptions);

export async function GET(request: Request, context: { params: { nextauth: string[] } }) {
  const configurationError = getAuthConfigurationError();
  if (configurationError) {
    return NextResponse.json(
      {
        error: "auth_not_configured",
        message: configurationError,
      },
      { status: 503 }
    );
  }

  return handler(request, context);
}

export async function POST(request: Request, context: { params: { nextauth: string[] } }) {
  const configurationError = getAuthConfigurationError();
  if (configurationError) {
    return NextResponse.json(
      {
        error: "auth_not_configured",
        message: configurationError,
      },
      { status: 503 }
    );
  }

  return handler(request, context);
}
