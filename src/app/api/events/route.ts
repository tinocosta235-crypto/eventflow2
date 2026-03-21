import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOrg } from "@/lib/auth-helpers";
import { slugify } from "@/lib/utils";
import { initEventCompany, isPaperclipAvailable } from "@/lib/paperclip-client";

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
        clientName: body.clientName || null,
        wizardCompleted: true,
      },
    });

    // Crea gruppi se forniti
    const groups: { name: string; description?: string; color?: string }[] = body.groups ?? []
    const defaultGroups = groups.length > 0 ? groups : [{ name: "Tutti", color: "blue" }]
    await prisma.eventGroup.createMany({
      data: defaultGroups.map((g, i) => ({
        eventId: event.id,
        name: g.name,
        description: g.description ?? null,
        color: g.color ?? "blue",
        order: i,
      })),
    })

    // Crea plugin se forniti
    const plugins: string[] = body.plugins ?? []
    if (plugins.length > 0) {
      await prisma.eventPlugin.createMany({
        data: plugins.map((p) => ({ eventId: event.id, pluginType: p, enabled: true })),
      })
    }

    // Init company Paperclip (asincrono, non bloccante)
    const phormaBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    isPaperclipAvailable().then(async (available) => {
      if (!available) return
      try {
        const setup = await initEventCompany({
          eventId: event.id,
          orgId,
          eventTitle: event.title,
          clientName: event.clientName,
          phormaBaseUrl,
        })
        await prisma.event.update({
          where: { id: event.id },
          data: {
            paperclipCompanyId: setup.companyId,
            paperclipAgentIds: JSON.stringify(setup.agentIds),
          },
        })
      } catch (err) {
        console.error("[Paperclip] Errore init company:", err)
      }
    })

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Errore creazione evento" }, { status: 500 });
  }
}
