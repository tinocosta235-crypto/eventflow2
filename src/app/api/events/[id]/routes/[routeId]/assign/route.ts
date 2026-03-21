// GET/POST/DELETE /api/events/[id]/routes/[routeId]/assign
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, routeId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const assignments = await prisma.routeGroupAssignment.findMany({
    where: { routeId },
    include: { group: { select: { id: true, name: true, color: true } } },
  })

  return NextResponse.json(assignments)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, routeId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const route = await prisma.travelRoute.findFirst({ where: { id: routeId, eventId: id } })
  if (!route) return NextResponse.json({ error: "Percorso non trovato" }, { status: 404 })

  const { groupId } = await req.json()
  if (!groupId) return NextResponse.json({ error: "groupId è obbligatorio" }, { status: 400 })

  // Verify group belongs to the event
  const group = await prisma.eventGroup.findFirst({ where: { id: groupId, eventId: id } })
  if (!group) return NextResponse.json({ error: "Gruppo non trovato" }, { status: 404 })

  const assignment = await prisma.routeGroupAssignment.upsert({
    where: { routeId_groupId: { routeId, groupId } },
    update: {},
    create: { routeId, groupId },
    include: { group: { select: { id: true, name: true, color: true } } },
  })

  return NextResponse.json(assignment, { status: 201 })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, routeId } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { groupId } = await req.json()
  if (!groupId) return NextResponse.json({ error: "groupId è obbligatorio" }, { status: 400 })

  await prisma.routeGroupAssignment.deleteMany({ where: { routeId, groupId } })
  return NextResponse.json({ ok: true })
}
