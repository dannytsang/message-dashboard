import { redirect } from "next/navigation";
import { authOptions, getAuthConfigurationError } from "@/lib/auth";
import { getServerSession } from "next-auth";
import AuthSignInPage from "@/components/AuthSignInPage";

export const metadata = {
  title: "Sign in | Communication Dashboard",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; error?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl || "/";
  const configurationError = getAuthConfigurationError();

  if (!configurationError) {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect(callbackUrl);
    }
  }

  return (
    <AuthSignInPage
      callbackUrl={callbackUrl}
      authConfigured={!configurationError}
      errorCode={searchParams?.error}
      configurationError={configurationError}
    />
  );
}
