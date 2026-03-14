// POST /api/events/[id]/hospitality/assign — assign participant to room
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { allotmentId, registrationId, checkIn, checkOut, notes } = body

  if (!allotmentId || !registrationId) return NextResponse.json({ error: "allotmentId e registrationId richiesti" }, { status: 400 })

  const allotment = await prisma.hotelAllotment.findUnique({ where: { id: allotmentId }, include: { roomType: true } })
  if (!allotment) return NextResponse.json({ error: "Allotment non trovato" }, { status: 404 })

  // Check capacity
  const assignedCount = await prisma.roomAssignment.count({ where: { allotmentId } })
  if (assignedCount >= allotment.totalRooms) {
    return NextResponse.json({ error: "Allotment esaurito" }, { status: 409 })
  }

  const assignment = await prisma.roomAssignment.upsert({
    where: { allotmentId_registrationId: { allotmentId, registrationId } },
    create: {
      allotmentId, registrationId,
      roomTypeId: allotment.roomTypeId,
      checkIn: checkIn ? new Date(checkIn) : allotment.checkIn,
      checkOut: checkOut ? new Date(checkOut) : allotment.checkOut,
      notes,
    },
    update: {
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      notes,
    },
    include: {
      registration: { select: { id: true, firstName: true, lastName: true, email: true } },
      roomType: true,
    },
  })
  return NextResponse.json(assignment, { status: 201 })
}
