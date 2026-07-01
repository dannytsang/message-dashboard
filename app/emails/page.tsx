import EmailsInboxPage from "@/components/EmailsInboxPage";
import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import { readEmailInboxItems } from "@/lib/dashboard-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await requireAuthenticatedPageSession("/emails");
  const { items, mode } = await readEmailInboxItems();

  return <EmailsInboxPage items={items} dataMode={mode} />;
}
