// GET /api/events/[id]/masterlist — tutti i partecipanti con custom fields
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    include: { groups: { orderBy: { order: "asc" } } },
  })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [formFields, registrations] = await Promise.all([
    prisma.formField.findMany({
      where: { eventId: id },
      orderBy: { order: "asc" },
    }),
    prisma.registration.findMany({
      where: { eventId: id },
      include: {
        group: true,
        fields: { include: { field: true } },
        checkIn: true,
        roomAssignments: { include: { roomType: true, allotment: { include: { hotel: true } } } },
        travelEntries: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ])

  return NextResponse.json({ event, formFields, registrations, groups: event.groups })
}
