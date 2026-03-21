// PATCH/DELETE /api/events/[id]/routes/[routeId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, routeId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await prisma.travelRoute.findFirst({ where: { id: routeId, eventId: id } })
  if (!existing) return NextResponse.json({ error: "Percorso non trovato" }, { status: 404 })

  const body = await req.json()
  const {
    name, internalNotes, startingLocation, startingDate,
    maxExtraGuests, hidden, allowChangeRequests, changeRequestMessage,
  } = body

  const updated = await prisma.travelRoute.update({
    where: { id: routeId },
    data: {
      ...(name !== undefined && { name }),
      ...(internalNotes !== undefined && { internalNotes: internalNotes || null }),
      ...(startingLocation !== undefined && { startingLocation: startingLocation || null }),
      ...(startingDate !== undefined && { startingDate: startingDate ? new Date(startingDate) : null }),
      ...(maxExtraGuests !== undefined && { maxExtraGuests: Number(maxExtraGuests) }),
      ...(hidden !== undefined && { hidden }),
      ...(allowChangeRequests !== undefined && { allowChangeRequests }),
      ...(changeRequestMessage !== undefined && { changeRequestMessage: changeRequestMessage || null }),
    },
    include: {
      steps: {
        include: {
          travelResource: true,
          allotment: {
            include: {
              hotel: { select: { name: true } },
              roomType: { select: { name: true } },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      groupAssignments: {
        include: { group: { select: { id: true, name: true, color: true } } },
      },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, routeId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await prisma.travelRoute.findFirst({ where: { id: routeId, eventId: id } })
  if (!existing) return NextResponse.json({ error: "Percorso non trovato" }, { status: 404 })

  await prisma.travelRoute.delete({ where: { id: routeId } })
  return NextResponse.json({ ok: true })
}
