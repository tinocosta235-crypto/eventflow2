import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOwner } from "@/lib/auth-helpers";
import { runEventFlowTrigger } from "@/lib/event-flow-runtime";

export async function POST(req: NextRequest) {
  const { ids, action, eventId } = await req.json();
  if (!ids?.length || !action) return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });

  // delete requires OWNER; other bulk actions require MEMBER
  const result = action === "delete" ? await requireOwner() : await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const regs = await prisma.registration.findMany({
    where: { id: { in: ids }, event: { organizationId: orgId } },
    select: { id: true, status: true, eventId: true },
  });
  if (!regs.length) return NextResponse.json({ error: "Nessun partecipante trovato" }, { status: 404 });

  const validIds = regs.map((r) => r.id);

  if (action === "confirm") {
    await prisma.registration.updateMany({ where: { id: { in: validIds } }, data: { status: "CONFIRMED" } });
    const sample = regs.slice(0, 100);
    await Promise.all(
      sample.map((r) =>
        runEventFlowTrigger({
          eventId: r.eventId,
          trigger: "guest_status_updated",
          registrationId: r.id,
          payload: { to: "CONFIRMED", bulk: true },
        }).catch(() => null)
      )
    );
    return NextResponse.json({ updated: validIds.length });
  }

  if (action === "cancel") {
    await prisma.registration.updateMany({ where: { id: { in: validIds } }, data: { status: "CANCELLED" } });
    if (eventId) await promoteFromWaitlist(eventId, validIds.length);
    const sample = regs.slice(0, 100);
    await Promise.all(
      sample.map((r) =>
        runEventFlowTrigger({
          eventId: r.eventId,
          trigger: "guest_status_updated",
          registrationId: r.id,
          payload: { to: "CANCELLED", bulk: true },
        }).catch(() => null)
      )
    );
    return NextResponse.json({ updated: validIds.length });
  }

  if (action === "delete") {
    await prisma.registration.deleteMany({ where: { id: { in: validIds } } });
    const byEvent = regs.reduce<Record<string, number>>((acc, r) => {
      acc[r.eventId] = (acc[r.eventId] ?? 0) + 1;
      return acc;
    }, {});
    await Promise.all(
      Object.entries(byEvent).map(([eId, count]) =>
        prisma.event.update({ where: { id: eId }, data: { currentCount: { decrement: count } } })
      )
    );
    return NextResponse.json({ deleted: validIds.length });
  }

  if (action === "pending") {
    await prisma.registration.updateMany({ where: { id: { in: validIds } }, data: { status: "PENDING" } });
    const sample = regs.slice(0, 100);
    await Promise.all(
      sample.map((r) =>
        runEventFlowTrigger({
          eventId: r.eventId,
          trigger: "guest_status_updated",
          registrationId: r.id,
          payload: { to: "PENDING", bulk: true },
        }).catch(() => null)
      )
    );
    return NextResponse.json({ updated: validIds.length });
  }

  return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
}

async function promoteFromWaitlist(eventId: string, slotsFreed: number) {
  const waitlisted = await prisma.registration.findMany({
    where: { eventId, status: "WAITLIST" },
    orderBy: { createdAt: "asc" },
    take: slotsFreed,
    select: { id: true },
  });
  if (!waitlisted.length) return;
  await prisma.registration.updateMany({
    where: { id: { in: waitlisted.map((w) => w.id) } },
    data: { status: "PENDING" },
  });
}
