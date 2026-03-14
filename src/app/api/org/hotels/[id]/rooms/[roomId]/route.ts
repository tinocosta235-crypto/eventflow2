// PATCH/DELETE /api/org/hotels/[id]/rooms/[roomId]
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; roomId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, roomId } = await params

  const hotel = await prisma.hotel.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { name, beds, price, currency, notes } = body
  const room = await prisma.roomType.update({
    where: { id: roomId },
    data: { name, beds: beds !== undefined ? Number(beds) : undefined, price: price !== undefined ? (price ? Number(price) : null) : undefined, currency, notes },
  })
  return NextResponse.json(room)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; roomId: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id, roomId } = await params

  const hotel = await prisma.hotel.findFirst({ where: { id, organizationId: auth.orgId } })
  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.roomType.delete({ where: { id: roomId } })
  return NextResponse.json({ ok: true })
}
