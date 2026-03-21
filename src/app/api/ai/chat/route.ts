import { NextRequest, NextResponse } from "next/server"
import { requireMember } from "@/lib/auth-helpers"
import { anthropic, AGENT_MODELS } from "@/lib/ai"

type AgentType = "report" | "email" | "form" | "flow" | "general"

const SYSTEM_PROMPTS: Record<AgentType, string> = {
  report: `Sei l'Agente Report di Phorma. Sei un esperto di analytics per eventi.
Aiuti a generare report dettagliati su iscrizioni, presenze, conversioni e KPI.
Quando l'utente chiede un report, usa il tool generateReport per generarlo.
Rispondi sempre in italiano, sii conciso e professionale.`,

  email: `Sei l'Agente Email di Phorma. Sei un esperto di email marketing B2B.
Analizzi campagne email, tassi di apertura, click e bounce.
Suggerisci miglioramenti alle comunicazioni e scrivi testi efficaci.
Usa registro formale "Lei/Voi". Rispondi sempre in italiano.`,

  form: `Sei l'Agente Form di Phorma. Sei un esperto di UX e form di registrazione.
Analizzi la qualità dei campi, il tasso di completamento e suggerisci miglioramenti.
Aiuti a ottimizzare i form per massimizzare le conversioni.
Rispondi sempre in italiano, sii pratico e diretto.`,

  flow: `Sei l'Agente Flow di Phorma. Sei un esperto di workflow e automazione eventi.
Analizzi e ottimizzi i flow automatizzati: trigger, azioni, condizioni e percorsi.
Suggerisci come migliorare l'automazione e ridurre il lavoro manuale.
Rispondi sempre in italiano, con esempi concreti.`,

  general: `Sei Phorma AI, l'assistente intelligente per la gestione professionale di eventi.
Puoi aiutare con report, email, form e workflow. Sei pratico, conciso e professionale.
Rispondi sempre in italiano.`,
}

export async function POST(req: NextRequest) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error

  const body = await req.json().catch(() => ({})) as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>
    agentType?: AgentType
    eventId?: string
    eventContext?: string
  }

  const { messages = [], agentType = "general", eventId, eventContext } = body
  if (!messages.length) {
    return NextResponse.json({ error: "messages obbligatori" }, { status: 400 })
  }

  const systemPrompt = SYSTEM_PROMPTS[agentType] + (
    eventContext ? `\n\nContesto evento corrente:\n${eventContext}` :
    eventId ? `\n\nEvento corrente ID: ${eventId}` : ""
  )

  const model = agentType === "email" || agentType === "form"
    ? AGENT_MODELS.email_tracker  // haiku for lighter tasks
    : AGENT_MODELS.report         // sonnet for complex tasks

  // Streaming SSE response
  const stream = anthropic.messages.stream({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
