import Navigation from "@/components/Navigation";
import EmailsInboxPage from "@/components/EmailsInboxPage";
import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import { getEffectiveRenderMode, readEmailInboxItems } from "@/lib/dashboard-data";
import { getSiteMode } from "@/lib/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await requireAuthenticatedPageSession("/emails");
  const topLevelMode = getSiteMode().mode;
  const { items, mode: readerMode } = await readEmailInboxItems(topLevelMode);

  // Spec 010 FR-004: if the source reader fell back to demo, the whole site renders as demo
  const effectiveMode = getEffectiveRenderMode(readerMode);

  return (
    <>
      <Navigation effectiveModeOverride={effectiveMode} />
      <EmailsInboxPage items={items} dataMode={readerMode} />
    </>
  );
}
