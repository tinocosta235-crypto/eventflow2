import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import AgentsClient from "./AgentsClient";

export const dynamic = "force-dynamic";

export default async function AgentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const orgId = session?.user?.organizationId ?? "";

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, title: true },
  });

  if (!event) return notFound();

  return (
    <DashboardLayout>
      <AgentsClient eventId={event.id} eventTitle={event.title} />
    </DashboardLayout>
  );
}
