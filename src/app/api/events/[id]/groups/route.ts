// GET/POST /api/events/[id]/groups
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const groups = await prisma.eventGroup.findMany({
    where: { eventId: id },
    include: { _count: { select: { registrations: true } } },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(groups)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { name, description, color } = body
  if (!name?.trim()) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 })

  const count = await prisma.eventGroup.count({ where: { eventId: id } })
  const group = await prisma.eventGroup.create({
    data: { eventId: id, name, description, color: color ?? "blue", order: count },
    include: { _count: { select: { registrations: true } } },
  })
  return NextResponse.json(group, { status: 201 })
}
