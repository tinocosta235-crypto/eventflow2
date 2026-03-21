import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth-helpers"
import { DEFAULT_WEIGHTS, DEFAULT_ENABLED } from "@/lib/score-engine"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("VIEWER")
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
  })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await prisma.kpiConfig.findUnique({ where: { eventId: id } })

  return NextResponse.json({
    weights: config ? JSON.parse(config.weights) : DEFAULT_WEIGHTS,
    enabled: config ? JSON.parse(config.enabled) : DEFAULT_ENABLED,
  })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("PLANNER")
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
  })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { weights, enabled } = body

  const config = await prisma.kpiConfig.upsert({
    where: { eventId: id },
    create: {
      eventId: id,
      weights: JSON.stringify(weights),
      enabled: JSON.stringify(enabled),
    },
    update: {
      weights: JSON.stringify(weights),
      enabled: JSON.stringify(enabled),
    },
  })

  return NextResponse.json({
    weights: JSON.parse(config.weights),
    enabled: JSON.parse(config.enabled),
  })
}
