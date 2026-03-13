import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import EventEditForm from "./EventEditForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const orgId = session?.user?.organizationId ?? "";
  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!event) notFound();
  return <EventEditForm event={event} />;
}
