// POST /api/events/[id]/ai/email-score
// Analizza la qualità di un testo email e restituisce score + suggerimenti in streaming
// body: { subject: string, body: string, eventTitle: string }
import { NextResponse } from "next/server"
import { requireOrg } from "@/lib/auth-helpers"
import { anthropic, AI_MODEL } from "@/lib/ai"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrg("VIEWER")
  if ("error" in auth) return auth.error
  await params // validate route param exists

  const body = await req.json()
  const { subject, body: emailBody, eventTitle } = body

  if (!subject || !emailBody) {
    return NextResponse.json({ error: "Oggetto e corpo richiesti" }, { status: 400 })
  }

  const prompt = `Sei un esperto di email marketing per eventi. Analizza questa email e fornisci un'analisi professionale.

EVENTO: "${eventTitle ?? "Evento"}"

---
OGGETTO: ${subject}

CORPO EMAIL:
${emailBody}
---

Fornisci:
1. **Score qualità** (0-100) con motivazione in 1 riga
2. **Punti di forza** (max 3 bullet)
3. **Problemi rilevati** (max 3 bullet) — sii specifico su cosa non funziona e perché
4. **Oggetto migliorato** — riscrivi l'oggetto per aumentare l'open rate
5. **Corpo riscritto** — riscrivi l'inizio dell'email (prime 3-4 righe) in modo più efficace

Criteri di valutazione: chiarezza, urgenza, personalizzazione, call-to-action, lunghezza, tono.
Rispondi in italiano con formato markdown.`

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
