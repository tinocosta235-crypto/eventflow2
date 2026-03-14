// GET/POST /api/org/hotels/[id]/rooms — room types
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const hotel = await prisma.hotel.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rooms = await prisma.roomType.findMany({ where: { hotelId: id }, orderBy: { name: "asc" } })
  return NextResponse.json(rooms)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params

  const hotel = await prisma.hotel.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { name, beds, price, currency, notes } = body
  if (!name?.trim()) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 })

  const room = await prisma.roomType.create({
    data: { hotelId: id, name, beds: beds ? Number(beds) : 1, price: price ? Number(price) : null, currency: currency ?? "EUR", notes },
  })
  return NextResponse.json(room, { status: 201 })
}
