// Costruisce il contesto evento completo per gli AI agent
// Con cache DB — TTL 5 minuti per ridurre query ripetute
import { prisma } from "@/lib/db"
import {
  computeScore, DEFAULT_WEIGHTS, DEFAULT_ENABLED,
  KpiKey, KpiValues, KpiWeights, KPI_META,
} from "@/lib/score-engine"

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minuti

async function buildFreshContext(eventId: string, orgId: string) {
  const [event, emailTemplates, formFields, groups, recentProposals, orgBenchmark] = await Promise.all([
    prisma.event.findFirst({
      where: { id: eventId, organizationId: orgId },
      include: {
        registrations: {
          select: { status: true, checkedInAt: true, createdAt: true, groupId: true },
        },
        kpiConfig: true,
        emailSendLogs: {
          select: { openedAt: true, clickedAt: true, sentAt: true, status: true, bouncedAt: true },
          orderBy: { sentAt: "desc" },
          take: 200,
        },
        kpiSnapshots: { orderBy: { takenAt: "desc" }, take: 10 },
      },
    }),
    // Email templates for this event
    prisma.emailTemplate.findMany({
      where: { eventId },
      select: { id: true, name: true, subject: true, type: true, createdAt: true },
    }).catch(() => [] as Array<{id:string;name:string;subject:string;type:string;createdAt:Date}>),
    // Form fields
    prisma.formField.findMany({
      where: { eventId },
      select: { id: true, label: true, type: true, required: true, order: true },
      orderBy: { order: "asc" },
    }).catch(() => [] as Array<{id:string;label:string;type:string;required:boolean;order:number}>),
    // Groups
    prisma.eventGroup.findMany({
      where: { eventId },
      select: { id: true, name: true, _count: { select: { registrations: true } } },
    }).catch(() => [] as Array<{id:string;name:string;_count:{registrations:number}}>),
    // Recent agent proposals for this event (last 10)
    prisma.agentProposal.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { agentType: true, actionType: true, status: true, createdAt: true, title: true },
    }).catch(() => [] as Array<{agentType:string;actionType:string;status:string;createdAt:Date;title:string}>),
    // Org benchmark — avg score across other events
    prisma.kpiSnapshot.aggregate({
      _avg: { score: true },
      where: { event: { organizationId: orgId } },
    }).catch(() => ({ _avg: { score: null } })),
  ])

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

  const prevScore = event.kpiSnapshots[1]?.score ?? null
  const scoreDelta = prevScore !== null ? scoreResult.totalScore - prevScore : null

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

  const emailBounced = event.emailSendLogs.filter((l) => l.bouncedAt !== null).length
  const bounceRate = emailSent > 0 ? emailBounced / emailSent : null

  const snapshotHistory = event.kpiSnapshots.map((s) => ({
    score: s.score,
    takenAt: s.takenAt.toISOString(),
  }))

  const groupSummary = groups.map((g) => ({
    id: g.id,
    name: g.name,
    count: g._count.registrations,
  }))

  const formSummary = formFields.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
  }))

  const templateSummary = emailTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    type: t.type,
  }))

  const recentProposalsSummary = recentProposals.map((p) => ({
    agentType: p.agentType,
    actionType: p.actionType,
    status: p.status,
    title: p.title,
    daysAgo: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000),
  }))

  return {
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      capacity: event.capacity,
      startDate: event.startDate,
    },
    stats: { total, confirmed, waitlisted, pending, cancelled, checkedIn, emailSent, emailOpened, emailClicked, emailBounced },
    score: {
      current: scoreResult.totalScore,
      grade: scoreResult.grade,
      delta: scoreDelta,
      orgAvg: orgBenchmark._avg.score ? Math.round(orgBenchmark._avg.score) : null,
      history: snapshotHistory,
    },
    kpi: kpiSummary,
    trend: { last7days: last7, prev7days: prev7 },
    email: {
      templates: templateSummary,
      openRate: emailSent > 0 ? Math.round((emailOpened / emailSent) * 100) : null,
      clickRate: emailSent > 0 ? Math.round((emailClicked / emailSent) * 100) : null,
      bounceRate: bounceRate !== null ? Math.round(bounceRate * 100) : null,
    },
    form: { fields: formSummary, totalFields: formSummary.length },
    groups: groupSummary,
    recentProposals: recentProposalsSummary,
    values,
    weights,
    enabled,
    scoreResult,
  }
}

export async function buildEventAgentContext(eventId: string, orgId: string) {
  // Check cache first
  const cached = await prisma.agentContextCache.findUnique({ where: { eventId } })
  if (cached && new Date(cached.expiresAt) > new Date()) {
    try {
      return JSON.parse(cached.contextJson) as Awaited<ReturnType<typeof buildFreshContext>>
    } catch {
      // corrupted cache — fall through to rebuild
    }
  }

  const context = await buildFreshContext(eventId, orgId)
  if (!context) return null

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS)

  await prisma.agentContextCache.upsert({
    where: { eventId },
    update: { contextJson: JSON.stringify(context), builtAt: new Date(), expiresAt },
    create: { eventId, contextJson: JSON.stringify(context), expiresAt },
  })

  return context
}

export async function invalidateAgentContextCache(eventId: string) {
  await prisma.agentContextCache.deleteMany({ where: { eventId } }).catch(() => {})
}

export type AgentContext = NonNullable<Awaited<ReturnType<typeof buildFreshContext>>>
