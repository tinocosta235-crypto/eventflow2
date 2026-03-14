// Score Monitor Agent — usa tool use Anthropic
// Analizza i KPI con funzioni strutturate e restituisce alert azionabili
import { NextResponse } from "next/server"
import { requireOrg } from "@/lib/auth-helpers"
import { anthropic, AI_MODEL } from "@/lib/ai"
import { buildEventAgentContext } from "@/lib/agent-context"

export interface ScoreAlert {
  severity: "critical" | "warning" | "info"
  kpi: string
  issue: string
  action: string
  impact: string
}

export interface ScoreMonitorResult {
  alerts: ScoreAlert[]
  summary: string
  priorityAction: string
  score: number
  grade: string
  scoreDelta: number | null
}

const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
  {
    name: "flag_anomaly",
    description: "Segnala un'anomalia o problema in una KPI specifica",
    input_schema: {
      type: "object" as const,
      properties: {
        severity: {
          type: "string",
          enum: ["critical", "warning", "info"],
          description: "critical = richiede azione immediata, warning = da monitorare, info = nota positiva o neutra",
        },
        kpi: { type: "string", description: "Nome della KPI analizzata" },
        issue: { type: "string", description: "Descrizione concisa del problema (max 15 parole)" },
        action: { type: "string", description: "Azione concreta da intraprendere subito (max 20 parole)" },
        impact: { type: "string", description: "Impatto atteso se si agisce (max 10 parole)" },
      },
      required: ["severity", "kpi", "issue", "action", "impact"],
    },
  },
  {
    name: "set_summary",
    description: "Imposta il riepilogo finale e l'azione prioritaria dell'evento",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Valutazione sintetica dell'evento in 2 frasi" },
        priorityAction: { type: "string", description: "L'unica azione più importante da fare oggi" },
      },
      required: ["summary", "priorityAction"],
    },
  },
]

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("VIEWER")
  if ("error" in auth) return auth.error
  const { id } = await params

  const ctx = await buildEventAgentContext(id, auth.orgId)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const kpiText = ctx.kpi.map((k) =>
    `- ${k.label}: ${k.value !== null ? k.value + "%" : "N/D"} (${k.rating}, peso ${k.weight}%)`
  ).join("\n")

  const prompt = `Sei il Score Monitor Agent della piattaforma Phorma. Analizza questi dati e chiama le funzioni appropriate.

EVENTO: "${ctx.event.title}" | Status: ${ctx.event.status}
SCORE: ${ctx.score.current}/100 (Grade ${ctx.score.grade})${ctx.score.delta !== null ? ` | Delta: ${ctx.score.delta > 0 ? "+" : ""}${ctx.score.delta} rispetto allo snapshot precedente` : ""}
CAPACITÀ: ${ctx.event.capacity ?? "non impostata"}

ISCRITTI: ${ctx.stats.total} | Confermati: ${ctx.stats.confirmed} | Pending: ${ctx.stats.pending} | Waitlist: ${ctx.stats.waitlisted} | Cancellati: ${ctx.stats.cancelled}
CHECK-IN: ${ctx.stats.checkedIn}
EMAIL: ${ctx.stats.emailSent} inviate | ${ctx.stats.emailOpened} aperte | ${ctx.stats.emailClicked} click
TREND: Ultimi 7gg: ${ctx.trend.last7days} iscrizioni | 7gg precedenti: ${ctx.trend.prev7days} iscrizioni

KPI DETTAGLIO:
${kpiText}

Istruzioni:
1. Chiama flag_anomaly per ogni KPI che merita attenzione (max 4 chiamate)
2. Chiama set_summary con la valutazione finale e l'azione prioritaria
Sii diretto, pratico, orientato all'azione.`

  const alerts: ScoreAlert[] = []
  let summary = ""
  let priorityAction = ""

  let response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    tools,
    messages: [{ role: "user", content: prompt }],
  })

  // Agentic loop — processa le chiamate ai tool
  while (response.stop_reason === "tool_use") {
    const toolResults: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] = []

    for (const block of response.content) {
      if (block.type !== "tool_use") continue

      if (block.name === "flag_anomaly") {
        const input = block.input as ScoreAlert
        alerts.push(input)
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      } else if (block.name === "set_summary") {
        const input = block.input as { summary: string; priorityAction: string }
        summary = input.summary
        priorityAction = input.priorityAction
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      }
    }

    response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      tools,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    })
  }

  const result: ScoreMonitorResult = {
    alerts,
    summary,
    priorityAction,
    score: ctx.score.current,
    grade: ctx.score.grade,
    scoreDelta: ctx.score.delta,
  }

  return NextResponse.json(result)
}
