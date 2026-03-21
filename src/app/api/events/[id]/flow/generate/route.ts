import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"
import { anthropic } from "@/lib/ai"

const SYSTEM_PROMPT = `Sei un generatore di workflow per Phorma, piattaforma di event management.
Genera un workflow come oggetto JSON con array "nodes" e "edges".

TIPI DI NODO:
- "trigger": Punto di partenza. data.nodeKey: "invite_sent"|"guest_imported"|"guest_group_assigned"|"registration_submitted"|"checkin_completed"|"date_reached"|"scheduled_daily"
- "email": Invia email. data.config: {subject?: string, body?: string, mode: "custom"}
- "form": Assegna percorso. data.config: {thankYou?: string}
- "condition": Ramificazione. data.config: {condType: "email_behavior"|"field"|"group"}. Gli edge usano sourceHandle: "yes"|"no"|"else" oppure "completed"|"clicked"|"opened"|"no_action"
- "wait": Attesa. data.config: {waitType: "duration", amount: N, unit: "hours"|"days"|"minutes"}
- "manual": Task manuale. data.config: {task: string, assignee: "Segreteria"|"Admin", priority: "alta"|"media"|"bassa"}
- "masterlist": Aggiorna partecipante. data.config: {action: "confirm_registration"|"update_field"|"mark_no_show"|"add_note"}
- "agent": Agente AI. data.agentType: "report"|"email_tracker"|"form_audit"|"flow_consultant". data.config: {mode: "hitl"|"auto"|"suggest"}
- "end": Fine flow.

REGOLE:
1. Inizia SEMPRE con almeno un nodo trigger
2. Termina ogni ramo con un nodo "end"
3. Posiziona i nodi verticalmente: x=400 per il percorso principale, ±350 per i rami, y incrementa di 160px a partire da y=60
4. Usa etichette italiane brevi e descrittive
5. ID nodi: "trigger-1", "email-1", "cond-1", "wait-1" ecc.
6. ID edge: "e1", "e2" ecc. (progressivi)
7. Per condition con email_behavior: crea sempre 4 edge con sourceHandle "completed", "clicked", "opened", "no_action"
8. Per condition con field/group: crea edge con sourceHandle "yes", "no", "else"

Rispondi SOLO con JSON valido, senza markdown né spiegazioni:
{"nodes":[...],"edges":[...]}`

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error

  const { id } = await params
  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true, title: true },
  })
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 })

  const body = await req.json() as { prompt?: string }
  const prompt = body.prompt?.trim()
  if (!prompt || prompt.length < 10) {
    return NextResponse.json({ error: "Prompt troppo corto" }, { status: 400 })
  }
  if (prompt.length > 2000) {
    return NextResponse.json({ error: "Prompt troppo lungo (max 2000 caratteri)" }, { status: 400 })
  }

  const userMessage = `Evento: "${event.title}"
Descrizione workflow richiesta: ${prompt}`

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  })

  const rawText = message.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("")
    .trim()

  // Extract JSON from response (in case Claude wraps it)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: "Risposta AI non valida" }, { status: 500 })
  }

  let parsed: { nodes: unknown[]; edges: unknown[] }
  try {
    parsed = JSON.parse(jsonMatch[0]) as { nodes: unknown[]; edges: unknown[] }
  } catch {
    return NextResponse.json({ error: "JSON non valido nella risposta AI" }, { status: 500 })
  }

  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    return NextResponse.json({ error: "Struttura flow non valida" }, { status: 500 })
  }

  return NextResponse.json({
    nodes: parsed.nodes,
    edges: parsed.edges,
    nodeCount: parsed.nodes.length,
    edgeCount: parsed.edges.length,
  })
}
