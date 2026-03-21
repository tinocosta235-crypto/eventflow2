// PATCH/DELETE /api/events/[id]/travel-resources/[resourceId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, resourceId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await prisma.travelResource.findFirst({ where: { id: resourceId, eventId: id } })
  if (!existing) return NextResponse.json({ error: "Risorsa non trovata" }, { status: 404 })

  const body = await req.json()
  const {
    name, travelType, departureLocation, arrivalLocation,
    departureDate, arrivalDate, departureTime, arrivalTime,
    operator, serviceNumber, description, internalNotes,
    units, internalCost, sellingPrice,
  } = body

  const updated = await prisma.travelResource.update({
    where: { id: resourceId },
    data: {
      ...(name !== undefined && { name }),
      ...(travelType !== undefined && { travelType }),
      ...(departureLocation !== undefined && { departureLocation }),
      ...(arrivalLocation !== undefined && { arrivalLocation }),
      ...(departureDate !== undefined && { departureDate: departureDate ? new Date(departureDate) : null }),
      ...(arrivalDate !== undefined && { arrivalDate: arrivalDate ? new Date(arrivalDate) : null }),
      ...(departureTime !== undefined && { departureTime: departureTime || null }),
      ...(arrivalTime !== undefined && { arrivalTime: arrivalTime || null }),
      ...(operator !== undefined && { operator: operator || null }),
      ...(serviceNumber !== undefined && { serviceNumber: serviceNumber || null }),
      ...(description !== undefined && { description: description || null }),
      ...(internalNotes !== undefined && { internalNotes: internalNotes || null }),
      ...(units !== undefined && { units: units != null ? Number(units) : null }),
      ...(internalCost !== undefined && { internalCost: internalCost != null ? Number(internalCost) : null }),
      ...(sellingPrice !== undefined && { sellingPrice: sellingPrice != null ? Number(sellingPrice) : null }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, resourceId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await prisma.travelResource.findFirst({ where: { id: resourceId, eventId: id } })
  if (!existing) return NextResponse.json({ error: "Risorsa non trovata" }, { status: 404 })

  await prisma.travelResource.delete({ where: { id: resourceId } })
  return NextResponse.json({ ok: true })
}
