import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOrg } from "@/lib/auth-helpers";
import { generateCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const status = searchParams.get("status");
  const payment = searchParams.get("payment");
  const checkedIn = searchParams.get("checkedIn");

  const where: Record<string, unknown> = { event: { organizationId: orgId } };
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;
  if (payment) where.paymentStatus = payment;
  if (checkedIn === "true") where.checkedInAt = { not: null };
  if (checkedIn === "false") where.checkedInAt = null;

  const regs = await prisma.registration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      event: { select: { id: true, title: true } },
      checkIn: { select: { checkedInAt: true, method: true } },
    },
  });
  return NextResponse.json(regs);
}

export async function POST(req: NextRequest) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;

  try {
    const body = await req.json();
    const { eventId, firstName, lastName, email, phone, company, jobTitle, notes, status, paymentStatus, ticketPrice } = body;

    if (!eventId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: orgId },
      select: { id: true, capacity: true, currentCount: true },
    });
    if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

    let resolvedStatus = status || "CONFIRMED";
    if (event.capacity && event.currentCount >= event.capacity && resolvedStatus === "CONFIRMED") {
      resolvedStatus = "WAITLIST";
    }

    const reg = await prisma.registration.create({
      data: {
        eventId,
        registrationCode: generateCode("REG"),
        firstName, lastName,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        company: company || null,
        jobTitle: jobTitle || null,
        notes: notes || null,
        source: "manual",
        status: resolvedStatus,
        paymentStatus: paymentStatus || "FREE",
        ticketPrice: ticketPrice ? parseFloat(ticketPrice) : null,
      },
    });

    if (resolvedStatus !== "WAITLIST") {
      await prisma.event.update({ where: { id: eventId }, data: { currentCount: { increment: 1 } } });
    }

    return NextResponse.json({ ...reg, autoWaitlist: resolvedStatus === "WAITLIST" }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email già registrata per questo evento" }, { status: 409 });
    }
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
