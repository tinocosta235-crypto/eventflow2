// POST /api/events/[id]/ai/analyze
// Analizza i KPI dell'evento e restituisce suggerimenti pratici in streaming
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth-helpers"
import { anthropic, AI_MODEL } from "@/lib/ai"
import { KPI_META, KpiKey, ScoreResult, computeScore, DEFAULT_WEIGHTS, DEFAULT_ENABLED, KpiValues, KpiWeights } from "@/lib/score-engine"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("VIEWER")
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

  const weights: KpiWeights = event.kpiConfig ? JSON.parse(event.kpiConfig.weights) : DEFAULT_WEIGHTS
  const enabled: KpiKey[] = event.kpiConfig ? JSON.parse(event.kpiConfig.enabled) : DEFAULT_ENABLED
  const scoreResult: ScoreResult = computeScore(values, weights, enabled)

  // Costruisci il contesto per il prompt
  const kpiContext = enabled.map((key) => {
    const meta = KPI_META[key]
    const val = values[key]
    const br = scoreResult.breakdown[key]
    const pct = val !== null ? `${Math.round(val * 100)}%` : "N/D"
    return `- ${meta.label}: ${pct} (rating: ${br?.rating ?? "na"}, peso: ${weights[key]}%)`
  }).join("\n")

  const prompt = `Sei un esperto di event management che analizza i dati di performance di un evento usando il modello d*motion (scoring KPI pesato).

EVENTO: "${event.title}"
SCORE TOTALE: ${scoreResult.totalScore}/100 (Grade: ${scoreResult.grade})
CAPACITÀ: ${event.capacity ?? "non impostata"}
TOTALE ISCRITTI: ${total}
CONFERMATI: ${confirmed}
IN WAITLIST: ${waitlisted}
CHECK-IN: ${checkedIn}

KPI DETTAGLIO:
${kpiContext}

Analizza questi dati e fornisci:
1. Una valutazione sintetica dell'evento (2-3 frasi)
2. I 3 problemi principali che richiedono attenzione immediata (con spiegazione e azione concreta)
3. I 2 punti di forza da mantenere
4. Una raccomandazione prioritaria per migliorare lo score nei prossimi giorni

Rispondi in italiano, in modo diretto e pratico. Usa un tono da consulente esperto, non generico. Formato: usa intestazioni markdown (##) per le sezioni.`

  const stream = await anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
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
