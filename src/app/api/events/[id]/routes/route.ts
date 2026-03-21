// GET/POST /api/events/[id]/routes
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const routes = await prisma.travelRoute.findMany({
    where: { eventId: id },
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
        include: {
          group: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(routes)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const {
    name, internalNotes, startingLocation, startingDate,
    maxExtraGuests, hidden, allowChangeRequests, changeRequestMessage,
  } = body

  if (!name) return NextResponse.json({ error: "Il nome è obbligatorio" }, { status: 400 })

  const route = await prisma.travelRoute.create({
    data: {
      eventId: id,
      name,
      internalNotes: internalNotes || null,
      startingLocation: startingLocation || null,
      startingDate: startingDate ? new Date(startingDate) : null,
      maxExtraGuests: maxExtraGuests != null ? Number(maxExtraGuests) : 0,
      hidden: hidden ?? false,
      allowChangeRequests: allowChangeRequests ?? false,
      changeRequestMessage: changeRequestMessage || null,
    },
    include: {
      steps: true,
      groupAssignments: {
        include: { group: { select: { id: true, name: true, color: true } } },
      },
    },
  })

  return NextResponse.json(route, { status: 201 })
}
