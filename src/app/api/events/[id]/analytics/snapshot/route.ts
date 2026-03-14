// Salva uno snapshot KPI manuale o automatico
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth-helpers"
import {
  computeScore,
  DEFAULT_WEIGHTS,
  DEFAULT_ENABLED,
  KpiKey,
  KpiValues,
  KpiWeights,
} from "@/lib/score-engine"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("MEMBER")
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    include: {
      registrations: { select: { status: true, checkedInAt: true } },
      kpiConfig: true,
      emailSendLogs: { select: { openedAt: true, clickedAt: true } },
    },
  })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const regs = event.registrations
  const total = regs.length
  const confirmed = regs.filter((r) => r.status === "CONFIRMED").length
  const waitlisted = regs.filter((r) => r.status === "WAITLISTED").length
  const checkedIn = regs.filter((r) => r.checkedInAt !== null).length
  const emailSent = event.emailSendLogs.length
  const emailOpened = event.emailSendLogs.filter((l) => l.openedAt !== null).length
  const emailClicked = event.emailSendLogs.filter((l) => l.clickedAt !== null).length

  const values: KpiValues = {
    registration_rate: event.capacity && event.capacity > 0 ? total / event.capacity : null,
    confirmed_rate: total > 0 ? confirmed / total : null,
    checkin_rate: confirmed > 0 ? checkedIn / confirmed : null,
    email_open_rate: emailSent > 0 ? emailOpened / emailSent : null,
    email_click_rate: emailSent > 0 ? emailClicked / emailSent : null,
    form_completion_rate: null,
    waitlist_conversion: waitlisted + confirmed > 0 ? confirmed / (waitlisted + confirmed) : null,
  }

  const weights: KpiWeights = event.kpiConfig
    ? JSON.parse(event.kpiConfig.weights)
    : DEFAULT_WEIGHTS
  const enabled: KpiKey[] = event.kpiConfig
    ? JSON.parse(event.kpiConfig.enabled)
    : DEFAULT_ENABLED

  const { totalScore } = computeScore(values, weights, enabled)

  const snapshot = await prisma.kpiSnapshot.create({
    data: {
      eventId: id,
      values: JSON.stringify(values),
      score: totalScore,
    },
  })

  return NextResponse.json({ snapshot })
}
