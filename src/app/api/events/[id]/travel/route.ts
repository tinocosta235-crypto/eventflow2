// GET/POST /api/events/[id]/travel
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const entries = await prisma.travelEntry.findMany({
    where: { eventId: id },
    include: {
      registration: { select: { id: true, firstName: true, lastName: true, email: true, company: true } },
    },
    orderBy: [{ direction: "asc" }, { departureTime: "asc" }],
  })
  return NextResponse.json(entries)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { registrationId, direction, type, carrier, flightNo, departure, arrival, departureTime, arrivalTime, notes } = body

  if (!registrationId) return NextResponse.json({ error: "registrationId richiesto" }, { status: 400 })

  const entry = await prisma.travelEntry.create({
    data: {
      eventId: id, registrationId,
      direction: direction ?? "INBOUND",
      type: type ?? "FLIGHT",
      carrier, flightNo, departure, arrival,
      departureTime: departureTime ? new Date(departureTime) : null,
      arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
      notes,
    },
    include: {
      registration: { select: { id: true, firstName: true, lastName: true, email: true, company: true } },
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
