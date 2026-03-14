// POST /api/events/[id]/hospitality/allotments — create allotment
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
  const { hotelId, roomTypeId, totalRooms, checkIn, checkOut, deadline, notes } = body

  if (!hotelId || !roomTypeId) return NextResponse.json({ error: "Hotel e tipo camera richiesti" }, { status: 400 })

  // Verify hotel belongs to org
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, organizationId: auth.orgId } })
  if (!hotel) return NextResponse.json({ error: "Hotel non trovato" }, { status: 404 })

  const allotment = await prisma.hotelAllotment.upsert({
    where: { eventId_roomTypeId: { eventId: id, roomTypeId } },
    create: {
      eventId: id, hotelId, roomTypeId,
      totalRooms: totalRooms ? Number(totalRooms) : 0,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      deadline: deadline ? new Date(deadline) : null,
      notes,
    },
    update: {
      totalRooms: totalRooms ? Number(totalRooms) : 0,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      deadline: deadline ? new Date(deadline) : null,
      notes,
    },
    include: { hotel: true, roomType: true, assignments: { include: { registration: { select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true } } } } },
  })
  return NextResponse.json(allotment, { status: 201 })
}
