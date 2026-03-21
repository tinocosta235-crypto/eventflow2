// Email Draft Agent — usa tool use Anthropic
// Genera bozze email pronte all'invio basate sulla situazione evento
// body: { situation?: string } — situazione opzionale, altrimenti l'agent decide da solo
import { NextResponse } from "next/server"
import { requireOrg } from "@/lib/auth-helpers"
import { anthropic, AI_MODEL } from "@/lib/ai"
import { buildEventAgentContext } from "@/lib/agent-context"

export interface EmailDraft {
  subject: string
  body: string
  targetAudience: string
  rationale: string
  urgency: "high" | "medium" | "low"
}

const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
  {
    name: "create_email_draft",
    description: "Crea una bozza email pronta per l'invio ai partecipanti",
    input_schema: {
      type: "object" as const,
      properties: {
        subject: { type: "string", description: "Oggetto email ottimizzato per open rate" },
        body: {
          type: "string",
          description: "Corpo email HTML-free, tono professionale ma caldo. Usa {{firstName}} per personalizzazione. Max 200 parole.",
        },
        targetAudience: {
          type: "string",
          enum: ["CONFIRMED", "PENDING", "WAITLIST", "ALL"],
          description: "A chi inviare l'email",
        },
        rationale: { type: "string", description: "Perché questa email è prioritaria ora (1 frase)" },
        urgency: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Urgenza dell'invio",
        },
      },
      required: ["subject", "body", "targetAudience", "rationale", "urgency"],
    },
  },
]

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("PLANNER")
  if ("error" in auth) return auth.error
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const { situation } = body as { situation?: string }

  const ctx = await buildEventAgentContext(id, auth.orgId)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const kpiProblems = ctx.kpi
    .filter((k) => k.rating === "poor")
    .map((k) => `- ${k.label}: ${k.value !== null ? k.value + "%" : "N/D"} (${k.rating})`)
    .join("\n")

  const situationText = situation
    ? `SITUAZIONE SPECIFICA RICHIESTA: ${situation}`
    : `Identifica tu la situazione più critica e genera l'email più utile in questo momento.`

  const prompt = `Sei l'Email Draft Agent della piattaforma Phorma. Genera una bozza email per la segreteria dell'evento.

EVENTO: "${ctx.event.title}"
SCORE: ${ctx.score.current}/100 (Grade ${ctx.score.grade})
ISCRITTI: ${ctx.stats.total} | Confermati: ${ctx.stats.confirmed} | Pending: ${ctx.stats.pending} | Waitlist: ${ctx.stats.waitlisted}
EMAIL INVIATE: ${ctx.stats.emailSent} | Open rate: ${ctx.stats.emailSent > 0 ? Math.round((ctx.stats.emailOpened / ctx.stats.emailSent) * 100) : 0}%

KPI PROBLEMATICHE:
${kpiProblems || "Nessuna KPI critica"}

${situationText}

Chiama create_email_draft con la bozza ottimale. L'email deve:
- Avere un oggetto che invoglia ad aprire (usa numeri, urgenza reale, personalizzazione)
- Iniziare con {{firstName}} per personalizzare
- Essere concisa (max 150 parole nel corpo)
- Avere una call-to-action chiara
- Essere in italiano, tono professionale ma diretto`

  let draft: EmailDraft | null = null

  let response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    tools,
    messages: [{ role: "user", content: prompt }],
  })

  while (response.stop_reason === "tool_use") {
    const toolResults: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] = []

    for (const block of response.content) {
      if (block.type !== "tool_use") continue
      if (block.name === "create_email_draft") {
        draft = block.input as EmailDraft
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Draft creato con successo" })
      }
    }

    response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      tools,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    })
  }

  if (!draft) return NextResponse.json({ error: "Agent non ha generato bozza" }, { status: 500 })

  return NextResponse.json({ draft })
}
