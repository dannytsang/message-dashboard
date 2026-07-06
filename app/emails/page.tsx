import Navigation from "@/components/Navigation";
import EmailsInboxPage from "@/components/EmailsInboxPage";
import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import { readEmailInboxItems } from "@/lib/dashboard-data";
import { getSiteMode } from "@/lib/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await requireAuthenticatedPageSession("/emails");
  const topLevelMode = getSiteMode().mode;
  const { items, mode: readerMode } = await readEmailInboxItems(topLevelMode);


  return (
    <>
      <Navigation />
      <EmailsInboxPage items={items} dataMode={readerMode} />
    </>
  );
}
