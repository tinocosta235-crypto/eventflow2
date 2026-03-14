// GET/PATCH/DELETE /api/org/hotels/[id]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember, requireOwner } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const hotel = await prisma.hotel.findFirst({
    where: { id, organizationId: auth.orgId },
    include: { roomTypes: { orderBy: { name: "asc" } } },
  })
  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(hotel)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const exists = await prisma.hotel.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { name, address, city, stars, phone, email, website, notes } = body

  const hotel = await prisma.hotel.update({
    where: { id },
    data: { name, address, city, stars: stars !== undefined ? (stars ? Number(stars) : null) : undefined, phone, email, website, notes },
    include: { roomTypes: true },
  })
  return NextResponse.json(hotel)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner()
  if ("error" in auth) return auth.error
  const { id } = await params

  const exists = await prisma.hotel.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.hotel.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
