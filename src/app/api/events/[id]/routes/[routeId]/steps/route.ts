// POST /api/events/[id]/routes/[routeId]/steps — add a RouteStep
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

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

  const body = await req.json()
  const { stepType, travelResourceId, hotelAllotmentId, order, checkIn, checkOut, notes } = body

  if (!stepType) return NextResponse.json({ error: "stepType è obbligatorio" }, { status: 400 })

  // Determine order if not provided: append at end
  let stepOrder = order
  if (stepOrder == null) {
    const lastStep = await prisma.routeStep.findFirst({
      where: { routeId },
      orderBy: { order: "desc" },
    })
    stepOrder = lastStep ? lastStep.order + 1 : 0
  }

  const step = await prisma.routeStep.create({
    data: {
      routeId,
      order: Number(stepOrder),
      stepType,
      travelResourceId: travelResourceId || null,
      hotelAllotmentId: hotelAllotmentId || null,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      notes: notes || null,
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

  return NextResponse.json(step, { status: 201 })
}
