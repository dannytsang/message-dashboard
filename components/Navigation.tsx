import NavigationClient from "@/components/NavigationClient";
import { getSessionDisplayName } from "@/lib/auth";
import { getOptionalServerSession } from "@/lib/auth-helpers";

export default async function Navigation() {
  const session = await getOptionalServerSession();

  return (
    <NavigationClient
      displayName={getSessionDisplayName(session?.user)}
      isAuthenticated={Boolean(session)}
    />
  );
}
