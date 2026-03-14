// PATCH/DELETE /api/events/[id]/hospitality/allotments/[allotmentId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; allotmentId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, allotmentId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { totalRooms, checkIn, checkOut, deadline, notes } = body

  const updated = await prisma.hotelAllotment.update({
    where: { id: allotmentId },
    data: {
      totalRooms: totalRooms !== undefined ? Number(totalRooms) : undefined,
      checkIn: checkIn !== undefined ? (checkIn ? new Date(checkIn) : null) : undefined,
      checkOut: checkOut !== undefined ? (checkOut ? new Date(checkOut) : null) : undefined,
      deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
      notes,
    },
    include: { hotel: true, roomType: true, assignments: { include: { registration: { select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true } } } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; allotmentId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, allotmentId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.hotelAllotment.delete({ where: { id: allotmentId } })
  return NextResponse.json({ ok: true })
}
