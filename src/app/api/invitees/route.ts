import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ];
  }

  const invitees = await prisma.invitee.findMany({
    where,
    include: {
      travelPlan: true,
      customFields: true,
      inviteLogs: { orderBy: { sentAt: "desc" } },
      event: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitees);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    eventId,
    firstName,
    lastName,
    email,
    phone,
    company,
    jobTitle,
    dietary,
    accessibility,
    companions,
    source,
  } = body;

  if (!eventId || !firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "Campi obbligatori mancanti: eventId, firstName, lastName, email" },
      { status: 400 }
    );
  }

  const invitee = await prisma.invitee.create({
    data: {
      eventId,
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      dietary,
      accessibility,
      companions: companions ?? 0,
      source: source ?? "MANUAL",
    },
    include: {
      travelPlan: true,
      customFields: true,
      inviteLogs: true,
      event: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(invitee, { status: 201 });
}
