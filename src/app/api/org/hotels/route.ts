// GET/POST /api/org/hotels — hotel library
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireMember()
  if ("error" in auth) return auth.error

  const hotels = await prisma.hotel.findMany({
    where: { organizationId: auth.orgId },
    include: { roomTypes: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(hotels)
}

export async function POST(req: Request) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error

  const body = await req.json()
  const { name, address, city, stars, phone, email, website, notes } = body
  if (!name?.trim()) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 })

  const hotel = await prisma.hotel.create({
    data: { organizationId: auth.orgId, name, address, city, stars: stars ? Number(stars) : null, phone, email, website, notes },
    include: { roomTypes: true },
  })
  return NextResponse.json(hotel, { status: 201 })
}
