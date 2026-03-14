// Costruisce il contesto evento completo per gli AI agent
import { prisma } from "@/lib/db"
import {
  computeScore, DEFAULT_WEIGHTS, DEFAULT_ENABLED,
  KpiKey, KpiValues, KpiWeights, KPI_META,
} from "@/lib/score-engine"

export async function buildEventAgentContext(eventId: string, orgId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: orgId },
    include: {
      registrations: {
        select: { status: true, checkedInAt: true, createdAt: true, email: true, firstName: true, lastName: true },
      },
      kpiConfig: true,
      emailSendLogs: { select: { openedAt: true, clickedAt: true, sentAt: true, status: true } },
      kpiSnapshots: { orderBy: { takenAt: "desc" }, take: 5 },
    },
  })
  if (!event) return null

  const regs = event.registrations
  const total = regs.length
  const confirmed = regs.filter((r) => r.status === "CONFIRMED").length
  const waitlisted = regs.filter((r) => r.status === "WAITLISTED").length
  const pending = regs.filter((r) => r.status === "PENDING").length
  const cancelled = regs.filter((r) => r.status === "CANCELLED").length
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

  const weights: KpiWeights = event.kpiConfig ? JSON.parse(event.kpiConfig.weights) : DEFAULT_WEIGHTS
  const enabled: KpiKey[] = event.kpiConfig ? JSON.parse(event.kpiConfig.enabled) : DEFAULT_ENABLED
  const scoreResult = computeScore(values, weights, enabled)

  // Score trend (confronto con snapshot precedente)
  const prevScore = event.kpiSnapshots[1]?.score ?? null
  const scoreDelta = prevScore !== null ? scoreResult.totalScore - prevScore : null

  // Registrazioni ultimi 7 giorni vs 7 giorni prima
  const now = Date.now()
  const last7 = regs.filter((r) => now - new Date(r.createdAt).getTime() < 7 * 86400000).length
  const prev7 = regs.filter((r) => {
    const age = now - new Date(r.createdAt).getTime()
    return age >= 7 * 86400000 && age < 14 * 86400000
  }).length

  const kpiSummary = enabled.map((key) => {
    const val = values[key]
    const br = scoreResult.breakdown[key]
    return {
      key,
      label: KPI_META[key].label,
      value: val !== null ? Math.round(val * 100) : null,
      rating: br?.rating ?? "na",
      weight: weights[key],
      benchmarks: KPI_META[key].benchmarks,
    }
  })

  return {
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      capacity: event.capacity,
      startDate: event.startDate,
    },
    stats: { total, confirmed, waitlisted, pending, cancelled, checkedIn, emailSent, emailOpened, emailClicked },
    score: { current: scoreResult.totalScore, grade: scoreResult.grade, delta: scoreDelta },
    kpi: kpiSummary,
    trend: { last7days: last7, prev7days: prev7 },
    values,
    weights,
    enabled,
    scoreResult,
  }
}

export type AgentContext = Awaited<ReturnType<typeof buildEventAgentContext>>
