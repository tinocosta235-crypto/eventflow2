import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { EmailsClient } from "./EmailsClient";
import { ensureDefaultEventTemplates } from "@/lib/email-template-defaults";

export const dynamic = "force-dynamic";

export default async function EventEmailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const orgId = session?.user?.organizationId;
  if (!orgId) notFound();

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, title: true, currentCount: true, status: true },
  });
  if (!event) notFound();

  await ensureDefaultEventTemplates(id, event.title);

  const [templates, stats, groups] = await Promise.all([
    prisma.emailTemplate.findMany({ where: { eventId: id }, orderBy: { createdAt: "desc" } }),
    prisma.registration.groupBy({
      by: ["status"],
      where: { eventId: id },
      _count: true,
    }),
    prisma.eventGroup.findMany({
      where: { eventId: id },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const statusCounts = stats.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = s._count;
    return acc;
  }, {});

  return (
    <EmailsClient
      eventId={id}
      eventTitle={event.title}
      templates={templates}
      statusCounts={statusCounts}
      groups={groups}
    />
  );
}
