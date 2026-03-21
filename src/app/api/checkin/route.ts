import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";
import { runEventFlowTrigger } from "@/lib/event-flow-runtime";

export async function POST(req: NextRequest) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const { registrationId, registrationCode, eventId, method = "manual" } = await req.json();

  const reg = await prisma.registration.findFirst({
    where: {
      event: { organizationId: orgId, id: eventId },
      ...(registrationId ? { id: registrationId } : {}),
      ...(registrationCode ? { registrationCode } : {}),
    },
    include: { checkIn: true },
  });

  if (!reg) return NextResponse.json({ error: "Partecipante non trovato" }, { status: 404 });
  if (reg.checkIn) return NextResponse.json({ error: "Già registrato al check-in", alreadyCheckedIn: true, reg }, { status: 409 });
  if (reg.status === "CANCELLED") return NextResponse.json({ error: "Iscrizione annullata" }, { status: 400 });

  const now = new Date();
  const [checkIn] = await Promise.all([
    prisma.checkIn.create({
      data: { eventId: reg.eventId, registrationId: reg.id, checkedInAt: now, method },
    }),
    prisma.registration.update({ where: { id: reg.id }, data: { checkedInAt: now, status: "CONFIRMED" } }),
  ]);

  runEventFlowTrigger({
    eventId: reg.eventId,
    trigger: "checkin_completed",
    registrationId: reg.id,
    payload: { method },
  }).catch(console.error);

  runEventFlowTrigger({
    eventId: reg.eventId,
    trigger: "guest_status_updated",
    registrationId: reg.id,
    payload: { to: "CONFIRMED", source: "checkin" },
  }).catch(console.error);

  return NextResponse.json({ success: true, checkIn, reg: { ...reg, checkedInAt: now } });
}

export async function DELETE(req: NextRequest) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const { registrationId } = await req.json();

  const reg = await prisma.registration.findFirst({
    where: { id: registrationId, event: { organizationId: orgId } },
  });
  if (!reg) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  await Promise.all([
    prisma.checkIn.deleteMany({ where: { registrationId } }),
    prisma.registration.update({ where: { id: registrationId }, data: { checkedInAt: null } }),
  ]);

  return NextResponse.json({ success: true });
}
