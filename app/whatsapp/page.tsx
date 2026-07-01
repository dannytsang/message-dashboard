import WhatsAppDashboardPage from "@/components/WhatsAppDashboardPage";
import { requireAuthenticatedPageSession } from "@/lib/auth-helpers";
import { readWhatsAppDashboardData } from "@/lib/dashboard-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  await requireAuthenticatedPageSession("/whatsapp");
  const { snapshot, mode } = await readWhatsAppDashboardData();

  return <WhatsAppDashboardPage snapshot={snapshot} dataMode={mode} />;
}
