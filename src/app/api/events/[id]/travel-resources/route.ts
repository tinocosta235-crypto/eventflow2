// GET/POST /api/events/[id]/travel-resources
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const resources = await prisma.travelResource.findMany({
    where: { eventId: id },
    orderBy: [{ travelType: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(resources)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const {
    name, travelType, departureLocation, arrivalLocation,
    departureDate, arrivalDate, departureTime, arrivalTime,
    operator, serviceNumber, description, internalNotes,
    units, internalCost, sellingPrice,
  } = body

  if (!name || !departureLocation || !arrivalLocation) {
    return NextResponse.json({ error: "name, departureLocation e arrivalLocation sono obbligatori" }, { status: 400 })
  }

  const resource = await prisma.travelResource.create({
    data: {
      eventId: id,
      name,
      travelType: travelType ?? "FLIGHT",
      departureLocation,
      arrivalLocation,
      departureDate: departureDate ? new Date(departureDate) : null,
      arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
      departureTime: departureTime || null,
      arrivalTime: arrivalTime || null,
      operator: operator || null,
      serviceNumber: serviceNumber || null,
      description: description || null,
      internalNotes: internalNotes || null,
      units: units != null ? Number(units) : null,
      internalCost: internalCost != null ? Number(internalCost) : null,
      sellingPrice: sellingPrice != null ? Number(sellingPrice) : null,
    },
  })

  return NextResponse.json(resource, { status: 201 })
}
