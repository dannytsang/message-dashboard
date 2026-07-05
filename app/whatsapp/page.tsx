import Navigation from "@/components/Navigation";
import WhatsAppDashboardPage from "@/components/WhatsAppDashboardPage";
import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import { getEffectiveRenderMode, readWhatsAppDashboardData } from "@/lib/dashboard-data";
import { getSiteMode } from "@/lib/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  await requireAuthenticatedPageSession("/whatsapp");
  const topLevelMode = getSiteMode().mode;
  const { snapshot, mode: readerMode } = await readWhatsAppDashboardData(topLevelMode);

  // Spec 010 FR-004: if the source reader fell back to demo, the whole site renders as demo
  const effectiveMode = getEffectiveRenderMode(readerMode);

  return (
    <>
      <Navigation effectiveModeOverride={effectiveMode} />
      <WhatsAppDashboardPage snapshot={snapshot} dataMode={readerMode} />
    </>
  );
}
