import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOrg, requireOwner } from "@/lib/auth-helpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    include: { _count: { select: { registrations: true, checkIns: true } } },
  });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const existing = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const body = await req.json();
  const event = await prisma.event.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      eventType: body.eventType ?? existing.eventType,
      status: body.status ?? existing.status,
      startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
      endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
      timezone: body.timezone ?? existing.timezone,
      location: body.location ?? existing.location,
      city: body.city ?? existing.city,
      country: body.country ?? existing.country,
      online: body.online ?? existing.online,
      onlineUrl: body.onlineUrl ?? existing.onlineUrl,
      capacity: body.capacity !== undefined ? (body.capacity ? parseInt(body.capacity) : null) : existing.capacity,
      tags: body.tags ?? existing.tags,
      visibility: body.visibility ?? existing.visibility,
      website: body.website ?? existing.website,
      venueSetup: body.venueSetup ?? existing.venueSetup,
      venueNotes: body.venueNotes ?? existing.venueNotes,
      accommodationNeeded: body.accommodationNeeded ?? existing.accommodationNeeded,
      hotelName: body.hotelName ?? existing.hotelName,
      hotelAddress: body.hotelAddress ?? existing.hotelAddress,
      hotelCheckIn: body.hotelCheckIn ? new Date(body.hotelCheckIn) : existing.hotelCheckIn,
      hotelCheckOut: body.hotelCheckOut ? new Date(body.hotelCheckOut) : existing.hotelCheckOut,
      roomBlockSize: body.roomBlockSize !== undefined ? (body.roomBlockSize ? parseInt(body.roomBlockSize) : null) : existing.roomBlockSize,
      roomBlockDeadline: body.roomBlockDeadline ? new Date(body.roomBlockDeadline) : existing.roomBlockDeadline,
      accommodationNotes: body.accommodationNotes ?? existing.accommodationNotes,
      travelNeeded: body.travelNeeded ?? existing.travelNeeded,
      airportTransfer: body.airportTransfer ?? existing.airportTransfer,
      shuttleService: body.shuttleService ?? existing.shuttleService,
      parkingAvailable: body.parkingAvailable ?? existing.parkingAvailable,
      travelNotes: body.travelNotes ?? existing.travelNotes,
      organizerName: body.organizerName ?? existing.organizerName,
      organizerEmail: body.organizerEmail ?? existing.organizerEmail,
      organizerPhone: body.organizerPhone ?? existing.organizerPhone,
      secretariatNotes: body.secretariatNotes ?? existing.secretariatNotes,
      budgetEstimated: body.budgetEstimated !== undefined ? (body.budgetEstimated ? parseFloat(body.budgetEstimated) : null) : existing.budgetEstimated,
      budgetActual: body.budgetActual !== undefined ? (body.budgetActual ? parseFloat(body.budgetActual) : null) : existing.budgetActual,
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const existing = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
