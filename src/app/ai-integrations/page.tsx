import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AiIntegrationsClient } from "./AiIntegrationsClient";

export const dynamic = "force-dynamic";

export default async function AiIntegrationsPage() {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  if (!orgId) notFound();

  const events = await prisma.event.findMany({
    where: { organizationId: orgId },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  return (
    <DashboardLayout>
      <Header
        title="Integrazioni"
        subtitle="Connetti Phorma ai tuoi strumenti — CRM, email, AI e molto altro"
      />
      <AiIntegrationsClient events={events} />
    </DashboardLayout>
  );
}
