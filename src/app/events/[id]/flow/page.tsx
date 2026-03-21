import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { prisma } from "@/lib/db";
import { FlowBuilder } from "@/components/flow-builder";

export const dynamic = "force-dynamic";

export default async function EventFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!event) notFound();

  return (
    <DashboardLayout noPadding>
      <FlowBuilder eventId={event.id} eventTitle={event.title} />
    </DashboardLayout>
  );
}
