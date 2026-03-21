import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOrg, requireOwner } from "@/lib/auth-helpers";
import { sendEmail, buildWaitlistPromotionEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";
import { runEventFlowTrigger } from "@/lib/event-flow-runtime";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const reg = await prisma.registration.findFirst({
    where: { id, event: { organizationId: orgId } },
    include: {
      event: { select: { id: true, title: true, capacity: true } },
      fields: { include: { field: { select: { label: true, type: true } } } },
      checkIn: true,
    },
  });
  if (!reg) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(reg);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const existing = await prisma.registration.findFirst({
    where: { id, event: { organizationId: orgId } },
  });
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const body = await req.json();

  if (body.status === "CANCELLED" && existing.status === "CONFIRMED") {
    await promoteFromWaitlist(existing.eventId, 1);
  }

  const reg = await prisma.registration.update({
    where: { id },
    data: {
      firstName: body.firstName ?? existing.firstName,
      lastName: body.lastName ?? existing.lastName,
      email: body.email ?? existing.email,
      phone: body.phone !== undefined ? (body.phone || null) : existing.phone,
      company: body.company !== undefined ? (body.company || null) : existing.company,
      jobTitle: body.jobTitle !== undefined ? (body.jobTitle || null) : existing.jobTitle,
      notes: body.notes !== undefined ? (body.notes || null) : existing.notes,
      status: body.status ?? existing.status,
      paymentStatus: body.paymentStatus ?? existing.paymentStatus,
      ticketPrice: body.ticketPrice !== undefined
        ? (body.ticketPrice ? parseFloat(body.ticketPrice) : null)
        : existing.ticketPrice,
      groupId: body.groupId !== undefined ? (body.groupId || null) : existing.groupId,
    },
  });

  if (body.status && body.status !== existing.status) {
    runEventFlowTrigger({
      eventId: reg.eventId,
      trigger: "guest_status_updated",
      registrationId: reg.id,
      payload: { from: existing.status, to: body.status },
    }).catch(console.error);
  }
  return NextResponse.json(reg);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const existing = await prisma.registration.findFirst({
    where: { id, event: { organizationId: orgId } },
    select: { id: true, eventId: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  await prisma.registration.delete({ where: { id } });
  await prisma.event.update({ where: { id: existing.eventId }, data: { currentCount: { decrement: 1 } } });

  if (existing.status === "CONFIRMED") {
    await promoteFromWaitlist(existing.eventId, 1);
  }
  return NextResponse.json({ success: true });
}

async function promoteFromWaitlist(eventId: string, slots: number) {
  const waitlisted = await prisma.registration.findMany({
    where: { eventId, status: "WAITLIST" },
    orderBy: { createdAt: "asc" },
    take: slots,
    select: { id: true, email: true, firstName: true, registrationCode: true },
  });
  if (!waitlisted.length) return;

  await prisma.registration.updateMany({
    where: { id: { in: waitlisted.map((w) => w.id) } },
    data: { status: "PENDING" },
  });

  // Fetch event info for email
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, startDate: true, location: true, city: true, online: true, onlineUrl: true },
  });
  if (!event) return;

  const eventDate = event.startDate ? formatDateTime(event.startDate) : undefined;
  const eventLocation = event.online
    ? (event.onlineUrl ?? "Evento online")
    : [event.location, event.city].filter(Boolean).join(", ") || undefined;

  waitlisted.forEach((w) =>
    sendEmail({
      to: w.email,
      ...buildWaitlistPromotionEmail({
        firstName: w.firstName,
        eventTitle: event.title,
        eventDate,
        eventLocation,
        registrationCode: w.registrationCode,
      }),
    }).catch(console.error)
  );
}
