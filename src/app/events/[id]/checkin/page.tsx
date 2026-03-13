import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CheckinClient } from "./CheckinClient";

export const dynamic = "force-dynamic";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true, title: true, startDate: true, capacity: true,
      registrations: {
        orderBy: { lastName: "asc" },
        include: { checkIn: true },
      },
    },
  });

  if (!event) notFound();

  const checkedInCount = event.registrations.filter((r) => r.checkedInAt).length;
  const confirmedCount = event.registrations.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING").length;

  return (
    <DashboardLayout>
      <Header
        title={`Check-in — ${event.title}`}
        subtitle={`${checkedInCount} in sede su ${confirmedCount} attesi`}
        actions={
          <Link href={`/events/${id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />Torna all&apos;evento
            </Button>
          </Link>
        }
      />
      <CheckinClient event={event} initialCheckedIn={checkedInCount} total={confirmedCount} />
    </DashboardLayout>
  );
}
