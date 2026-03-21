// PATCH/DELETE /api/events/[id]/routes/[routeId]/steps/[stepId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; routeId: string; stepId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, routeId, stepId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const step = await prisma.routeStep.findFirst({ where: { id: stepId, routeId } })
  if (!step) return NextResponse.json({ error: "Tappa non trovata" }, { status: 404 })

  const body = await req.json()
  const { order, notes, checkIn, checkOut } = body

  const updated = await prisma.routeStep.update({
    where: { id: stepId },
    data: {
      ...(order !== undefined && { order: Number(order) }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
      ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
    },
    include: {
      travelResource: true,
      allotment: {
        include: {
          hotel: { select: { name: true } },
          roomType: { select: { name: true } },
        },
      },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; routeId: string; stepId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, routeId, stepId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const step = await prisma.routeStep.findFirst({ where: { id: stepId, routeId } })
  if (!step) return NextResponse.json({ error: "Tappa non trovata" }, { status: 404 })

  await prisma.routeStep.delete({ where: { id: stepId } })
  return NextResponse.json({ ok: true })
}
