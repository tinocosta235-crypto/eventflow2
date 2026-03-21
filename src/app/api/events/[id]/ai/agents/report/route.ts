// Report Agent — genera report di segreteria con tool use
// Produce sezioni strutturate + proposte di modifica masterlist
// Salva il risultato come AgentProposal (REPORT_GENERATE)
import { NextRequest, NextResponse } from "next/server"
import { requirePlanner } from "@/lib/auth-helpers"
import { anthropic, AGENT_MODELS } from "@/lib/ai"
import { buildEventAgentContext } from "@/lib/agent-context"
import { prisma } from "@/lib/db"

// ── Tipi pubblici ─────────────────────────────────────────────────────────────

export interface ReportSection {
  id: string
  title: string
  content: string
  dataTable?: {
    headers: string[]
    rows: string[][]
  }
}

export interface MasterlistChange {
  registrationId: string
  firstName: string
  lastName: string
  email: string
  field: string
  before: string
  after: string
  reason: string
}

export interface ReportMeta {
  title: string
  recipientType: "cliente" | "team" | "fornitore" | "interno"
  language: "it"
  tone: "formale" | "informale"
  generatedAt: string
}

export interface ReportPayload {
  meta: ReportMeta
  sections: ReportSection[]
  masterlistChanges: MasterlistChange[]
  eventSnapshot: {
    title: string
    status: string
    capacity: number | null
    startDate: string | null
    total: number
    confirmed: number
    pending: number
    waitlisted: number
    checkedIn: number
    score: number
    grade: string
  }
}

// ── Context builder esteso per report ────────────────────────────────────────

async function buildReportContext(eventId: string, orgId: string) {
  const base = await buildEventAgentContext(eventId, orgId)
  if (!base) return null

  // Recupera gruppi con conteggi
  const groups = await prisma.eventGroup.findMany({
    where: { eventId },
    include: {
      _count: { select: { registrations: true } },
    },
    orderBy: { order: "asc" },
  })

  // Recupera allotment hotel
  const allotments = await prisma.hotelAllotment.findMany({
    where: { eventId },
    include: {
      hotel: { select: { name: true } },
      roomType: { select: { name: true, beds: true } },
      assignments: { select: { id: true, confirmed: true } },
    },
  })

  // Conteggi viaggio
  const travelCount = await prisma.travelEntry.count({ where: { eventId } })
  const travelConfirmed = await prisma.travelEntry.count({ where: { eventId, confirmed: true } })

  // Top form responses (campi critici: allergie, t-shirt, ecc.)
  const formFields = await prisma.formField.findMany({
    where: { eventId },
    include: {
      registrationFields: { select: { value: true } },
    },
    orderBy: { order: "asc" },
    take: 10,
  })

  // Email campagne — raggruppa per subject
  const emailLogs = await prisma.emailSendLog.groupBy({
    by: ["subject"],
    where: { eventId },
    _count: { id: true },
  })
  const emailCampaigns = await Promise.all(
    emailLogs.slice(0, 5).map(async (g) => {
      const opened = await prisma.emailSendLog.count({
        where: { eventId, subject: g.subject, openedAt: { not: null } },
      })
      const total = g._count.id
      return { subject: g.subject, sent: total, opened, openRate: total > 0 ? Math.round(opened / total * 100) : 0 }
    })
  )

  return {
    ...base,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      count: g._count.registrations,
    })),
    allotments: allotments.map((a) => ({
      hotel: a.hotel.name,
      roomType: a.roomType.name,
      beds: a.roomType.beds,
      total: a.totalRooms,
      assigned: a.assignments.length,
      confirmed: a.assignments.filter((x) => x.confirmed).length,
      checkIn: a.checkIn?.toLocaleDateString("it-IT") ?? null,
      checkOut: a.checkOut?.toLocaleDateString("it-IT") ?? null,
    })),
    travel: { total: travelCount, confirmed: travelConfirmed },
    formFields: formFields.map((f) => ({
      label: f.label,
      type: f.type,
      responses: f.registrationFields.filter((r) => r.value).length,
    })),
    emailCampaigns,
  }
}

// ── Tools Claude ──────────────────────────────────────────────────────────────

const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
  {
    name: "add_section",
    description: "Aggiunge una sezione al report. Chiamare più volte per sezioni diverse.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Identificatore univoco sezione (es. 'summary', 'registrations', 'email', 'logistics', 'action_items')" },
        title: { type: "string", description: "Titolo della sezione (es. 'Riepilogo Esecutivo')" },
        content: { type: "string", description: "Testo della sezione (2-8 frasi, in italiano, tono appropriato al destinatario)" },
        data_table: {
          type: "object",
          description: "Tabella dati opzionale per sezioni quantitative",
          properties: {
            headers: { type: "array", items: { type: "string" }, description: "Intestazioni colonne" },
            rows: { type: "array", items: { type: "array", items: { type: "string" } }, description: "Righe di dati" },
          },
          required: ["headers", "rows"],
        },
      },
      required: ["id", "title", "content"],
    },
  },
  {
    name: "propose_masterlist_change",
    description: "Propone una modifica a un partecipante nella masterlist. Usare solo se ci sono azioni concrete da raccomandare.",
    input_schema: {
      type: "object" as const,
      properties: {
        registration_id: { type: "string", description: "ID della registrazione da modificare" },
        field: { type: "string", description: "Campo da modificare (status, notes, groupId)" },
        new_value: { type: "string", description: "Nuovo valore" },
        reason: { type: "string", description: "Motivazione della modifica (max 15 parole)" },
      },
      required: ["registration_id", "field", "new_value", "reason"],
    },
  },
  {
    name: "set_report_meta",
    description: "Imposta i metadati del report. Chiamare una sola volta.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Titolo del report (es. 'Report Settimanale — Forum HR 2026')" },
        recipient_type: { type: "string", enum: ["cliente", "team", "fornitore", "interno"], description: "A chi è destinato il report" },
        tone: { type: "string", enum: ["formale", "informale"], description: "Tono del testo" },
      },
      required: ["title", "recipient_type", "tone"],
    },
  },
]

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Supporto chiamata interna da Paperclip http adapter
  const body = await req.json().catch(() => ({}))
  const internalKey = req.headers.get("x-paperclip-internal-key")
  const isInternal = !!internalKey && internalKey === process.env.PAPERCLIP_INTERNAL_KEY

  let orgId: string, userId: string
  if (isInternal) {
    if (!body.orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 })
    orgId = body.orgId as string
    userId = "paperclip-agent"
  } else {
    const auth = await requirePlanner()
    if ("error" in auth) return auth.error
    orgId = auth.orgId
    userId = auth.userId
  }

  const { id: eventId } = await params
  const brief = String(body.brief ?? "")
  const recipientType = (body.recipientType as string) ?? "cliente"

  const ctx = await buildReportContext(eventId, orgId)
  if (!ctx) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 })

  // Recupera campione di partecipanti pending per possibili modifiche masterlist
  const pendingRegs = await prisma.registration.findMany({
    where: { eventId, status: "PENDING" },
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  })

  // ── Prompt sistema ────────────────────────────────────────────────────────

  const kpiText = ctx.kpi.map((k) =>
    `  • ${k.label}: ${k.value !== null ? k.value + "%" : "N/D"} (${k.rating})`
  ).join("\n")

  const groupsText = ctx.groups.length > 0
    ? ctx.groups.map((g) => `  • ${g.name}: ${g.count} partecipanti`).join("\n")
    : "  Nessun gruppo configurato"

  const allotmentText = ctx.allotments.length > 0
    ? ctx.allotments.map((a) => `  • ${a.hotel} — ${a.roomType}: ${a.assigned}/${a.total} camere assegnate (${a.confirmed} confermate)`).join("\n")
    : "  Nessun allotment configurato"

  const emailText = ctx.emailCampaigns.length > 0
    ? ctx.emailCampaigns.map((c) => `  • "${c.subject}": ${c.sent} inviate, ${c.opened} aperte (${c.openRate}%)`).join("\n")
    : "  Nessuna campagna email registrata"

  const pendingText = pendingRegs.length > 0
    ? pendingRegs.map((r) => `  ID:${r.id} — ${r.firstName} ${r.lastName} <${r.email}> (iscritto il ${new Date(r.createdAt).toLocaleDateString("it-IT")})`).join("\n")
    : "  Nessun partecipante in pending"

  const prompt = `Sei l'Agente Report di Phorma. Genera un report professionale in italiano per questo evento.

EVENTO: "${ctx.event.title}"
Status: ${ctx.event.status} | Data: ${ctx.event.startDate ? new Date(ctx.event.startDate as unknown as string).toLocaleDateString("it-IT") : "da definire"}
Capacità: ${ctx.event.capacity ?? "illimitata"}

STATISTICHE:
  Totale iscritti: ${ctx.stats.total} | Confermati: ${ctx.stats.confirmed} | Pending: ${ctx.stats.pending} | Waitlist: ${ctx.stats.waitlisted} | Cancellati: ${ctx.stats.cancelled}
  Check-in effettuati: ${ctx.stats.checkedIn}
  Score evento: ${ctx.score.current}/100 (Grade ${ctx.score.grade})

KPI:
${kpiText}

GRUPPI:
${groupsText}

HOSPITALITY:
${allotmentText}
  Viaggi: ${ctx.travel.total} totali, ${ctx.travel.confirmed} confermati

EMAIL CAMPAGNE:
${emailText}

PARTECIPANTI IN PENDING (per possibili proposte masterlist):
${pendingText}

${brief ? `BRIEF OPERATORE: ${brief}` : ""}
DESTINATARIO: ${recipientType}

ISTRUZIONI:
1. Chiama set_report_meta PRIMA di tutto (titolo + destinatario + tono)
2. Chiama add_section per ogni sezione (minimo 3, massimo 6):
   - Riepilogo esecutivo (sempre)
   - Stato iscrizioni (sempre, includi data table con stats)
   - Email & comunicazioni (se ci sono dati)
   - Logistica & hospitality (se ci sono dati)
   - Azioni consigliate (sempre)
3. Chiama propose_masterlist_change SOLO se ci sono pending da più di 7 giorni o azioni specifiche chiare
4. Adatta tono e contenuto al destinatario (cliente = risultati, team = dettagli operativi, fornitore = logistica)
5. Scrivi in italiano formale professionale
6. Usa dati numerici precisi, non frasi generiche`

  // ── Agentic loop ──────────────────────────────────────────────────────────

  const sections: ReportSection[] = []
  const masterlistProposals: Array<{ id: string; field: string; newValue: string; reason: string }> = []
  let meta: ReportMeta | null = null

  let response = await anthropic.messages.create({
    model: AGENT_MODELS.report,
    max_tokens: 4096,
    tools,
    messages: [{ role: "user", content: prompt }],
  })

  const messageHistory: Parameters<typeof anthropic.messages.create>[0]["messages"] = [
    { role: "user", content: prompt },
  ]

  while (response.stop_reason === "tool_use") {
    const toolResults: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] = []

    for (const block of response.content) {
      if (block.type !== "tool_use") continue

      if (block.name === "add_section") {
        const input = block.input as {
          id: string; title: string; content: string
          data_table?: { headers: string[]; rows: string[][] }
        }
        sections.push({
          id: input.id,
          title: input.title,
          content: input.content,
          dataTable: input.data_table,
        })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Sezione aggiunta." })
      } else if (block.name === "propose_masterlist_change") {
        const input = block.input as { registration_id: string; field: string; new_value: string; reason: string }
        masterlistProposals.push({ id: input.registration_id, field: input.field, newValue: input.new_value, reason: input.reason })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Proposta registrata." })
      } else if (block.name === "set_report_meta") {
        const input = block.input as { title: string; recipient_type: string; tone: string }
        meta = {
          title: input.title,
          recipientType: input.recipient_type as ReportMeta["recipientType"],
          language: "it",
          tone: input.tone as ReportMeta["tone"],
          generatedAt: new Date().toISOString(),
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Metadati impostati." })
      }
    }

    messageHistory.push({ role: "assistant", content: response.content })
    messageHistory.push({ role: "user", content: toolResults })

    response = await anthropic.messages.create({
      model: AGENT_MODELS.report,
      max_tokens: 4096,
      tools,
      messages: messageHistory,
    })
  }

  // ── Risolvi i partecipanti per le proposte masterlist ─────────────────────

  const masterlistChanges: MasterlistChange[] = []
  if (masterlistProposals.length > 0) {
    const regIds = masterlistProposals.map((p) => p.id)
    const regs = await prisma.registration.findMany({
      where: { id: { in: regIds }, eventId },
      select: { id: true, firstName: true, lastName: true, email: true, status: true, notes: true },
    })
    const regMap = new Map(regs.map((r) => [r.id, r]))

    for (const proposal of masterlistProposals) {
      const reg = regMap.get(proposal.id)
      if (!reg) continue
      const beforeValue = String(reg[proposal.field as keyof typeof reg] ?? "")
      masterlistChanges.push({
        registrationId: proposal.id,
        firstName: reg.firstName,
        lastName: reg.lastName,
        email: reg.email,
        field: proposal.field,
        before: beforeValue,
        after: proposal.newValue,
        reason: proposal.reason,
      })
    }
  }

  // ── Payload finale ────────────────────────────────────────────────────────

  const reportPayload: ReportPayload = {
    meta: meta ?? {
      title: `Report — ${ctx.event.title}`,
      recipientType: "cliente",
      language: "it",
      tone: "formale",
      generatedAt: new Date().toISOString(),
    },
    sections,
    masterlistChanges,
    eventSnapshot: {
      title: ctx.event.title,
      status: ctx.event.status,
      capacity: ctx.event.capacity,
      startDate: ctx.event.startDate ? new Date(ctx.event.startDate as unknown as string).toISOString() : null,
      total: ctx.stats.total,
      confirmed: ctx.stats.confirmed,
      pending: ctx.stats.pending,
      waitlisted: ctx.stats.waitlisted,
      checkedIn: ctx.stats.checkedIn,
      score: ctx.score.current,
      grade: ctx.score.grade,
    },
  }

  const diffPayload = masterlistChanges.length > 0 ? { changes: masterlistChanges } : null

  // Salva come AgentProposal
  const proposal = await prisma.agentProposal.create({
    data: {
      eventId,
      orgId,
      agentType: "REPORT",
      actionType: "REPORT_GENERATE",
      title: reportPayload.meta.title,
      summary: sections[0]?.content?.slice(0, 160) ?? null,
      payload: JSON.stringify(reportPayload),
      diffPayload: diffPayload ? JSON.stringify(diffPayload) : null,
      status: "PENDING",
      requestedBy: userId,
    },
  })

  // Notifica Paperclip task completato (se chiamata interna)
  if (isInternal) {
    const issueId = (body.context as Record<string, unknown>)?.issueId as string | undefined
    if (issueId) {
      try {
        const { updateIssue } = await import("@/lib/paperclip-client")
        await updateIssue(issueId, {
          status: "done",
          comment: `Report generato: **${reportPayload.meta.title}**\n- ${sections.length} sezioni\n- ${masterlistChanges.length} proposte masterlist\n- Proposta Phorma: \`${proposal.id}\``,
        })
      } catch {
        // non bloccante
      }
    }
  }

  return NextResponse.json({
    proposalId: proposal.id,
    report: reportPayload,
    masterlistChanges,
  })
}
