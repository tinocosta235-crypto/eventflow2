// POST /api/events/ai-generate
// Genera i campi di un evento da un prompt testuale tramite tool use
import { NextResponse } from "next/server"
import { requireMember } from "@/lib/auth-helpers"
import { anthropic, AI_MODEL } from "@/lib/ai"

export interface GeneratedEvent {
  title: string
  clientName: string
  organizerName: string
  description: string
  eventType: string
  startDate: string
  endDate: string
  location: string
  city: string
  online: boolean
  capacity: number | null
  plugins: string[]
  groups: { name: string; color: string }[]
  suggestedFields: string[]
}

export async function POST(req: Request) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error

  const { prompt } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt richiesto" }, { status: 400 })

  const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
    {
      name: "create_event",
      description: "Genera i dati strutturati di un evento da una descrizione testuale",
      input_schema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Titolo dell'evento, professionale e descrittivo" },
          clientName: { type: "string", description: "Nome del cliente se menzionato, altrimenti stringa vuota" },
          organizerName: { type: "string", description: "Nome dell'organizzatore se menzionato" },
          description: { type: "string", description: "Descrizione breve dell'evento (2-3 frasi)" },
          eventType: {
            type: "string",
            enum: ["CONFERENCE", "SEMINAR", "WEBINAR", "WORKSHOP", "GALA_DINNER", "TRADE_SHOW", "PRODUCT_LAUNCH", "NETWORKING", "HYBRID"],
            description: "Tipo di evento più appropriato",
          },
          startDate: { type: "string", description: "Data inizio ISO 8601 (YYYY-MM-DDTHH:mm), stima basata sul prompt" },
          endDate: { type: "string", description: "Data fine ISO 8601 (YYYY-MM-DDTHH:mm)" },
          location: { type: "string", description: "Nome venue o luogo" },
          city: { type: "string", description: "Città dell'evento" },
          online: { type: "boolean", description: "true se evento online" },
          capacity: { type: "number", description: "Numero partecipanti stimato, null se non specificato" },
          plugins: {
            type: "array",
            items: { type: "string", enum: ["REGISTRATION", "EMAIL", "HOSPITALITY", "TRAVEL", "GUEST_LISTS"] },
            description: "Plugin consigliati in base al tipo di evento",
          },
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                color: { type: "string", enum: ["blue", "green", "purple", "orange", "red", "indigo"] },
              },
              required: ["name", "color"],
            },
            description: "Gruppi di partecipanti suggeriti (max 3). Default: [{name: 'Tutti', color: 'blue'}]",
          },
          suggestedFields: {
            type: "array",
            items: { type: "string" },
            description: "Campi da raccogliere consigliati: firstName,lastName,email sempre inclusi + company,jobTitle,phone,dietary,tshirtSize,badgeName,arrivalDate,departureDate,roomPreference",
          },
        },
        required: ["title", "eventType", "startDate", "endDate", "online", "plugins", "groups", "suggestedFields"],
      },
    },
  ]

  let generated: GeneratedEvent | null = null

  let response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    tools,
    messages: [{
      role: "user",
      content: `Sei un assistente esperto di event management. L'utente descrive un evento che vuole creare. Chiama create_event con i dati strutturati.

Data di oggi: ${new Date().toISOString().slice(0, 10)}

DESCRIZIONE UTENTE: "${prompt}"

Genera dati realistici e appropriati. Se qualcosa non è specificato, fai una stima ragionevole.`,
    }],
  })

  while (response.stop_reason === "tool_use") {
    const toolResults: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] = []
    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "create_event") {
        generated = block.input as GeneratedEvent
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      }
    }
    response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      tools,
      messages: [
        { role: "user", content: `Genera i dati per: "${prompt}"` },
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    })
  }

  if (!generated) return NextResponse.json({ error: "Generazione fallita" }, { status: 500 })
  return NextResponse.json({ event: generated })
}
