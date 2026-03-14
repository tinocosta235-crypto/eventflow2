// POST /api/events/[id]/ai/chat
// Chat contestuale sull'evento con streaming
// body: { messages: { role: "user"|"assistant", content: string }[], eventContext: object }
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth-helpers"
import { anthropic, AI_MODEL } from "@/lib/ai"
import { KPI_META, KpiKey, computeScore, DEFAULT_WEIGHTS, DEFAULT_ENABLED, KpiValues, KpiWeights } from "@/lib/score-engine"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("VIEWER")
  if ("error" in auth) return auth.error
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    include: {
      registrations: { select: { status: true, checkedInAt: true, createdAt: true } },
      kpiConfig: true,
      emailSendLogs: { select: { openedAt: true, clickedAt: true } },
    },
  })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { messages } = body

  if (!messages?.length) {
    return NextResponse.json({ error: "Messages richiesti" }, { status: 400 })
  }

  // Build event context
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

  const weights: KpiWeights = event.kpiConfig ? JSON.parse(event.kpiConfig.weights) : DEFAULT_WEIGHTS
  const enabled: KpiKey[] = event.kpiConfig ? JSON.parse(event.kpiConfig.enabled) : DEFAULT_ENABLED
  const scoreResult = computeScore(values, weights, enabled)

  const kpiLines = enabled.map((key) => {
    const val = values[key]
    const pct = val !== null ? `${Math.round(val * 100)}%` : "N/D"
    return `  - ${KPI_META[key].label}: ${pct} (${scoreResult.breakdown[key]?.rating ?? "na"})`
  }).join("\n")

  const systemPrompt = `Sei l'assistente AI della piattaforma Phorma per event management. Stai analizzando l'evento "${event.title}".

Dati attuali dell'evento:
- Score d*motion: ${scoreResult.totalScore}/100 (Grade ${scoreResult.grade})
- Capacità: ${event.capacity ?? "non impostata"}
- Iscritti: ${total} | Confermati: ${confirmed} | Waitlist: ${waitlisted} | Check-in: ${checkedIn}
- Email inviate: ${emailSent} | Aperte: ${emailOpened} | Click: ${emailClicked}
KPI:
${kpiLines}

Rispondi in italiano, in modo conciso e pratico. Sei un esperto di segreteria eventi e marketing. Puoi rispondere a domande sui dati, suggerire azioni, aiutare a migliorare le KPI e analizzare trend.`

  const stream = await anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
