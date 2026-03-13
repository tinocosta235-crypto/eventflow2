import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOrg } from "@/lib/auth-helpers";
import { slugify } from "@/lib/utils";

export async function GET() {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;

  const events = await prisma.event.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { registrations: true, checkIns: true } } },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;

  try {
    const body = await req.json();
    const { title } = body;
    if (!title) return NextResponse.json({ error: "Titolo richiesto" }, { status: 400 });

    let slug = slugify(title);
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const event = await prisma.event.create({
      data: {
        organizationId: orgId,
        slug,
        title: body.title,
        description: body.description || null,
        eventType: body.eventType || "CONFERENCE",
        status: body.status || "DRAFT",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        timezone: body.timezone || "Europe/Rome",
        location: body.location || null,
        city: body.city || null,
        country: body.country || "IT",
        online: body.online || false,
        onlineUrl: body.onlineUrl || null,
        capacity: body.capacity ? parseInt(body.capacity) : null,
        tags: body.tags || null,
        visibility: body.visibility || "PUBLIC",
        website: body.website || null,
        venueSetup: body.venueSetup || null,
        venueNotes: body.venueNotes || null,
        accommodationNeeded: body.accommodationNeeded || false,
        hotelName: body.hotelName || null,
        hotelAddress: body.hotelAddress || null,
        hotelCheckIn: body.hotelCheckIn ? new Date(body.hotelCheckIn) : null,
        hotelCheckOut: body.hotelCheckOut ? new Date(body.hotelCheckOut) : null,
        roomBlockSize: body.roomBlockSize ? parseInt(body.roomBlockSize) : null,
        roomBlockDeadline: body.roomBlockDeadline ? new Date(body.roomBlockDeadline) : null,
        accommodationNotes: body.accommodationNotes || null,
        travelNeeded: body.travelNeeded || false,
        airportTransfer: body.airportTransfer || false,
        shuttleService: body.shuttleService || false,
        parkingAvailable: body.parkingAvailable || false,
        travelNotes: body.travelNotes || null,
        organizerName: body.organizerName || null,
        organizerEmail: body.organizerEmail || null,
        organizerPhone: body.organizerPhone || null,
        secretariatNotes: body.secretariatNotes || null,
        budgetEstimated: body.budgetEstimated ? parseFloat(body.budgetEstimated) : null,
        budgetActual: body.budgetActual ? parseFloat(body.budgetActual) : null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Errore creazione evento" }, { status: 500 });
  }
}
