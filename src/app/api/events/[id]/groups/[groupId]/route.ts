// PATCH/DELETE /api/events/[id]/groups/[groupId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, groupId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { name, description, color, order } = body

  const updated = await prisma.eventGroup.update({
    where: { id: groupId },
    data: { name, description, color, order: order !== undefined ? Number(order) : undefined },
    include: { _count: { select: { registrations: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, groupId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Unassign all registrations from this group
  await prisma.registration.updateMany({ where: { groupId }, data: { groupId: null } })
  await prisma.eventGroup.delete({ where: { id: groupId } })
  return NextResponse.json({ ok: true })
}
