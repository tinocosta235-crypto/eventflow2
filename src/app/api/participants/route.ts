import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;

  const regs = await prisma.registration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { event: { select: { id: true, title: true } } },
  });
  return NextResponse.json(regs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, firstName, lastName, email, phone, company, jobTitle, notes, status, paymentStatus, ticketPrice } = body;

    if (!eventId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    const reg = await prisma.registration.create({
      data: {
        eventId,
        registrationCode: generateCode("REG"),
        firstName, lastName, email,
        phone: phone || null, company: company || null,
        jobTitle: jobTitle || null, notes: notes || null,
        status: status || "CONFIRMED",
        paymentStatus: paymentStatus || "FREE",
        ticketPrice: ticketPrice ? parseFloat(ticketPrice) : null,
      },
    });

    await prisma.event.update({
      where: { id: eventId },
      data: { currentCount: { increment: 1 } },
    });

    return NextResponse.json(reg, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email già registrata per questo evento" }, { status: 409 });
    }
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
