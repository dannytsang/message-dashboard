import Navigation from "@/components/Navigation";
import WhatsAppDashboardPage from "@/components/WhatsAppDashboardPage";
import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import { readWhatsAppDashboardData } from "@/lib/dashboard-data";
import { getSiteMode } from "@/lib/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  await requireAuthenticatedPageSession("/whatsapp");
  const topLevelMode = getSiteMode().mode;
  const { snapshot, mode: readerMode } = await readWhatsAppDashboardData(topLevelMode);


  return (
    <>
      <Navigation />
      <WhatsAppDashboardPage snapshot={snapshot} dataMode={readerMode} />
    </>
  );
}
