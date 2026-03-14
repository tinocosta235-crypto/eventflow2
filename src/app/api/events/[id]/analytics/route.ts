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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("VIEWER")
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    include: {
      registrations: { select: { status: true, createdAt: true, checkedInAt: true } },
      kpiConfig: true,
      kpiSnapshots: { orderBy: { takenAt: "desc" }, take: 48 },
      emailSendLogs: { select: { openedAt: true, clickedAt: true, sentAt: true } },
      formFields: { select: { id: true } },
    },
  })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const regs = event.registrations
  const total = regs.length
  const confirmed = regs.filter((r) => r.status === "CONFIRMED").length
  const waitlisted = regs.filter((r) => r.status === "WAITLISTED").length
  const checkedIn = regs.filter((r) => r.checkedInAt !== null).length
  const cancelled = regs.filter((r) => r.status === "CANCELLED").length

  // Email stats
  const emailLogs = event.emailSendLogs
  const emailSent = emailLogs.length
  const emailOpened = emailLogs.filter((l) => l.openedAt !== null).length
  const emailClicked = emailLogs.filter((l) => l.clickedAt !== null).length

  // KPI values
  const values: KpiValues = {
    registration_rate: event.capacity && event.capacity > 0 ? total / event.capacity : null,
    confirmed_rate: total > 0 ? confirmed / total : null,
    checkin_rate: confirmed > 0 ? checkedIn / confirmed : null,
    email_open_rate: emailSent > 0 ? emailOpened / emailSent : null,
    email_click_rate: emailSent > 0 ? emailClicked / emailSent : null,
    form_completion_rate: null, // calcolato lato client se dati disponibili
    waitlist_conversion: waitlisted + confirmed > 0 ? confirmed / (waitlisted + confirmed) : null,
  }

  const weights: KpiWeights = event.kpiConfig
    ? JSON.parse(event.kpiConfig.weights)
    : DEFAULT_WEIGHTS
  const enabled: KpiKey[] = event.kpiConfig
    ? JSON.parse(event.kpiConfig.enabled)
    : DEFAULT_ENABLED

  const scoreResult = computeScore(values, weights, enabled)

  // Registrations over time (ultimi 30 giorni, raggruppati per giorno)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const regsOverTime = regs
    .filter((r) => new Date(r.createdAt) >= thirtyDaysAgo)
    .reduce<Record<string, number>>((acc, r) => {
      const day = new Date(r.createdAt).toISOString().slice(0, 10)
      acc[day] = (acc[day] ?? 0) + 1
      return acc
    }, {})

  // Snapshot history per grafico score nel tempo
  const snapshotHistory = event.kpiSnapshots.map((s) => ({
    score: s.score,
    takenAt: s.takenAt,
  }))

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      capacity: event.capacity,
      status: event.status,
    },
    stats: {
      total,
      confirmed,
      waitlisted,
      checkedIn,
      cancelled,
      pending: total - confirmed - waitlisted - cancelled,
      emailSent,
      emailOpened,
      emailClicked,
    },
    kpiValues: values,
    scoreResult,
    weights,
    enabled,
    regsOverTime,
    snapshotHistory,
  })
}
