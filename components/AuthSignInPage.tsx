"use client";

import { signIn } from "next-auth/react";

interface AuthSignInPageProps {
  callbackUrl: string;
  authConfigured: boolean;
  errorCode?: string;
  configurationError?: string | null;
}

const errorMessages: Record<string, string> = {
  Configuration:
    "Authentication is not configured on this deployment yet. The dashboard stays private until the required server environment is present.",
  AccessDenied: "Access was denied by the identity provider.",
  OAuthSignin: "The identity provider could not start sign-in. Please try again.",
  OAuthCallback: "The identity callback failed. Please try again.",
  Default: "Sign-in could not be completed. Please try again.",
};

export default function AuthSignInPage({
  callbackUrl,
  authConfigured,
  errorCode,
  configurationError,
}: AuthSignInPageProps) {
  const errorMessage = errorCode
    ? errorMessages[errorCode] ?? errorMessages.Default
    : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background:
          "radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 34%), var(--color-bg)",
      }}
    >
      <section
        aria-labelledby="signin-heading"
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          boxShadow: "var(--shadow)",
          padding: "2rem",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--color-accent)",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Communication Dashboard
        </p>
        <h1
          id="signin-heading"
          style={{
            margin: "0.4rem 0 0.75rem",
            fontSize: "2rem",
            lineHeight: 1.1,
          }}
        >
          Sign in to view private communications
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Access the private communications dashboard to review activity, follow-ups, and items that need attention.
        </p>

        {(errorMessage || configurationError) && (
          <div
            role="status"
            style={{
              marginTop: "1rem",
              borderRadius: "12px",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              background: "rgba(127, 29, 29, 0.18)",
              color: "#fecaca",
              padding: "0.9rem 1rem",
              lineHeight: 1.5,
              fontSize: "0.92rem",
            }}
          >
            <strong style={{ display: "block", marginBottom: "0.35rem" }}>
              {configurationError ? "Authentication unavailable" : "Sign-in issue"}
            </strong>
            <span>{configurationError ?? errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          disabled={!authConfigured}
          onClick={() => signIn("authentik", { callbackUrl })}
          style={{
            width: "100%",
            marginTop: "1.25rem",
            border: "1px solid var(--color-accent)",
            borderRadius: "12px",
            backgroundColor: authConfigured ? "var(--color-accent)" : "var(--color-border)",
            color: authConfigured ? "white" : "var(--color-text-muted)",
            cursor: authConfigured ? "pointer" : "not-allowed",
            fontSize: "1rem",
            fontWeight: 700,
            padding: "0.95rem 1rem",
          }}
        >
          {authConfigured ? "Continue" : "Waiting for auth configuration"}
        </button>
      </section>
    </main>
  );
}
