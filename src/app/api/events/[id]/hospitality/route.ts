// GET /api/events/[id]/hospitality — allotments + assignments + org hotels
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [allotments, hotels] = await Promise.all([
    prisma.hotelAllotment.findMany({
      where: { eventId: id },
      include: {
        hotel: true,
        roomType: true,
        assignments: {
          include: {
            registration: { select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.hotel.findMany({
      where: { organizationId: auth.orgId },
      include: { roomTypes: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ])

  const registrations = await prisma.registration.findMany({
    where: { eventId: id, status: { in: ["CONFIRMED", "PENDING"] } },
    select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  return NextResponse.json({ allotments, hotels, registrations })
}
