// PATCH/DELETE /api/events/[id]/travel/[entryId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, entryId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { direction, type, carrier, flightNo, departure, arrival, departureTime, arrivalTime, confirmed, notes } = body

  const updated = await prisma.travelEntry.update({
    where: { id: entryId },
    data: {
      direction, type, carrier, flightNo, departure, arrival,
      departureTime: departureTime !== undefined ? (departureTime ? new Date(departureTime) : null) : undefined,
      arrivalTime: arrivalTime !== undefined ? (arrivalTime ? new Date(arrivalTime) : null) : undefined,
      confirmed: confirmed !== undefined ? Boolean(confirmed) : undefined,
      notes,
    },
    include: { registration: { select: { id: true, firstName: true, lastName: true, email: true, company: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, entryId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.travelEntry.delete({ where: { id: entryId } })
  return NextResponse.json({ ok: true })
}
