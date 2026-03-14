// PATCH/DELETE /api/events/[id]/hospitality/assign/[assignId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; assignId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, assignId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { checkIn, checkOut, confirmed, notes } = body

  const updated = await prisma.roomAssignment.update({
    where: { id: assignId },
    data: {
      checkIn: checkIn !== undefined ? (checkIn ? new Date(checkIn) : null) : undefined,
      checkOut: checkOut !== undefined ? (checkOut ? new Date(checkOut) : null) : undefined,
      confirmed: confirmed !== undefined ? Boolean(confirmed) : undefined,
      notes,
    },
    include: { registration: { select: { id: true, firstName: true, lastName: true, email: true } }, roomType: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; assignId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, assignId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.roomAssignment.delete({ where: { id: assignId } })
  return NextResponse.json({ ok: true })
}
