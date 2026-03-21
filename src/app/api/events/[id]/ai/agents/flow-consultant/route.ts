// Flow Consultant Agent — Agente Phorma (CEO)
// Analizza il flow di registrazione e propone ottimizzazioni strutturali
// Identifica gap logici, nodi mancanti, pattern di eventi simili
// Salva il risultato come AgentProposal (FLOW_ACTION)
import { NextRequest, NextResponse } from "next/server"
import { requirePlanner } from "@/lib/auth-helpers"
import { anthropic, AGENT_MODELS } from "@/lib/ai"
import { prisma } from "@/lib/db"

// ── Tipi pubblici ─────────────────────────────────────────────────────────────

export interface FlowGap {
  nodeId?: string
  position: string            // "dopo nodo X" | "all'inizio" | "alla fine"
  description: string
  severity: "high" | "medium" | "low"
  impact: string              // effetto pratico del gap
}

export interface FlowSuggestion {
  type: "add_node" | "reorder" | "add_condition" | "add_action" | "split_path" | "add_wait"
  targetPosition: string      // dove inserire/modificare
  nodeType: string            // tipo nodo da aggiungere (trigger/condition/action/etc)
  label: string               // label suggerita per il nodo
  description: string
  rationale: string
  automatable: boolean        // può essere attivato automaticamente nel flow
}

export interface FlowAuditResult {
  flowScore: number           // 0-100 qualità flow
  scoreLabel: "ottimo" | "buono" | "migliorabile" | "critico"
  summary: string
  topPriority: string
  gaps: FlowGap[]
  suggestions: FlowSuggestion[]
  proposalId: string | null
}

// ── Tools Claude ──────────────────────────────────────────────────────────────

const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
  {
    name: "flag_flow_gap",
    description: "Segnala un gap logico o un punto critico nel flow di registrazione",
    input_schema: {
      type: "object" as const,
      properties: {
        node_id: { type: "string", description: "ID del nodo di riferimento (opzionale)" },
        position: {
          type: "string",
          description: "Dove si trova il gap (es. 'dopo il trigger iscrizione', 'prima del check-in')",
        },
        description: {
          type: "string",
          description: "Descrizione del gap logico (max 20 parole)",
        },
        severity: { type: "string", enum: ["high", "medium", "low"] },
        impact: {
          type: "string",
          description: "Impatto pratico di questo gap sui partecipanti o sulla segreteria (max 15 parole)",
        },
      },
      required: ["position", "description", "severity", "impact"],
    },
  },
  {
    name: "suggest_node",
    description: "Propone l'aggiunta o modifica di un nodo nel flow",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["add_node", "reorder", "add_condition", "add_action", "split_path", "add_wait"],
          description: "Tipo di modifica",
        },
        target_position: {
          type: "string",
          description: "Dove inserire il nodo (es. 'dopo conferma iscrizione', 'prima del check-in')",
        },
        node_type: {
          type: "string",
          description: "Tipo del nodo da aggiungere (trigger/condition/action/ai_action/wait/manual_action/update_masterlist)",
        },
        label: { type: "string", description: "Label del nodo (max 5 parole)" },
        description: { type: "string", description: "Cosa fa questo nodo (max 20 parole)" },
        rationale: {
          type: "string",
          description: "Perché è necessario questo nodo per l'evento (max 15 parole)",
        },
        automatable: {
          type: "boolean",
          description: "true = il nodo può essere eseguito automaticamente; false = richiede azione manuale",
        },
      },
      required: [
        "type",
        "target_position",
        "node_type",
        "label",
        "description",
        "rationale",
        "automatable",
      ],
    },
  },
  {
    name: "set_flow_summary",
    description: "Imposta il punteggio e il riepilogo dell'analisi flow. Chiamare UNA SOLA VOLTA alla fine.",
    input_schema: {
      type: "object" as const,
      properties: {
        flow_score: {
          type: "number",
          description: "Punteggio qualità flow 0-100 (100 = perfetto, 0 = non strutturato)",
        },
        summary: {
          type: "string",
          description: "Valutazione complessiva del flow in 2-3 frasi in italiano",
        },
        top_priority: {
          type: "string",
          description: "La singola cosa più urgente da aggiungere/modificare nel flow",
        },
      },
      required: ["flow_score", "summary", "top_priority"],
    },
  },
]

// ── Nodo flow come testo leggibile ────────────────────────────────────────────

type FlowNode = {
  id: string
  type: string
  label: string
  active?: boolean
  config?: Record<string, unknown>
}

type FlowEdge = {
  id: string
  source: string
  target: string
  label?: string
}

function nodeToText(node: FlowNode, idx: number): string {
  const cfg = node.config ? ` | config: ${JSON.stringify(node.config).slice(0, 80)}` : ""
  return `${idx + 1}. [${node.type}] "${node.label}" (ID:${node.id}) ${node.active ? "✓" : "○"}${cfg}`
}

// ── Route handler ──────────────────────────────────────────────────────────────

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

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: orgId },
    select: { id: true, title: true, eventType: true, capacity: true, status: true, startDate: true },
  })
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 })

  // Legge la config del flow (EventPlugin pluginType=EVENT_FLOW)
  const flowPlugin = await prisma.eventPlugin.findFirst({
    where: { eventId, pluginType: "EVENT_FLOW" },
    select: { config: true },
  })

  let nodes: FlowNode[] = []
  let edges: FlowEdge[] = []
  let flowStatus = "DRAFT"

  if (flowPlugin) {
    try {
      const config = JSON.parse(flowPlugin.config)
      nodes = config.nodes ?? []
      edges = config.edges ?? []
      flowStatus = config.status ?? "DRAFT"
    } catch {
      // config malformata — flow vuoto
    }
  }

  // Statistiche evento
  const stats = await prisma.registration.groupBy({
    by: ["status"],
    where: { eventId },
    _count: { id: true },
  })
  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count.id]))
  const total = Object.values(statMap).reduce((a, b) => a + b, 0)

  // ── Prompt ──────────────────────────────────────────────────────────────────

  const nodesText =
    nodes.length > 0
      ? nodes.map(nodeToText).join("\n")
      : "Nessun nodo configurato — flow vuoto"

  const edgesText =
    edges.length > 0
      ? edges
          .map((e) => `${e.source} → ${e.target}${e.label ? ` (${e.label})` : ""}`)
          .join("\n")
      : "Nessuna connessione definita"

  const eventDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString("it-IT")
    : "da definire"

  const prompt = `Sei l'Agente Phorma — Flow Strategist. Analizza il flow di registrazione di questo evento e proponi ottimizzazioni strutturali.

EVENTO: "${event.title}" (${event.eventType})
Data: ${eventDate} | Capacità: ${event.capacity ?? "illimitata"} | Status evento: ${event.status}
Iscritti totali: ${total} | Confermati: ${statMap["CONFIRMED"] ?? 0} | Pending: ${statMap["PENDING"] ?? 0}

FLOW STATUS: ${flowStatus}

NODI DEL FLOW (${nodes.length} totali):
${nodesText}

CONNESSIONI (EDGES):
${edgesText}

TIPI DI NODO DISPONIBILI IN PHORMA:
• trigger — punto di ingresso (iscrizione, check-in, scadenza)
• condition — biforcazione logica (if/else su campo form, gruppo, status)
• action — azione automatica (invia email, aggiorna campo, assegna gruppo)
• ai_action — azione AI (analisi, raccomandazione, personalizzazione)
• wait — attesa temporizzata (dopo X giorni/ore)
• manual_action — task umano (approvazione, chiamata, verifica)
• update_masterlist — modifica diretta partecipante

ISTRUZIONI:
1. Analizza la struttura del flow cercando: gap logici, percorsi incompleti, azioni mancanti
2. Chiama flag_flow_gap per ogni punto critico (max 4 gap)
3. Chiama suggest_node per ogni miglioramento concreto (max 5 suggerimenti):
   - Prioritizza nodi ad alto impatto operativo
   - Per eventi con molti iscritti: punta su automazioni (condition + action)
   - Per eventi con hospitality: aggiungi nodi per hotel/travel
4. Chiama set_flow_summary UNA SOLA VOLTA alla fine con score e riepilogo
5. Tieni conto del tipo di evento (${event.eventType}) e della fase (${event.status})
6. Linguaggio italiano professionale e pratico`

  // ── Agentic loop ────────────────────────────────────────────────────────────

  const gaps: FlowGap[] = []
  const suggestions: FlowSuggestion[] = []
  let flowScore = 50
  let summary = ""
  let topPriority = ""

  let response = await anthropic.messages.create({
    model: AGENT_MODELS.form_audit, // Sonnet — stessa fascia del Form Audit
    max_tokens: 3000,
    tools,
    messages: [{ role: "user", content: prompt }],
  })

  const history: Parameters<typeof anthropic.messages.create>[0]["messages"] = [
    { role: "user", content: prompt },
  ]

  while (response.stop_reason === "tool_use") {
    const toolResults: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] =
      []

    for (const block of response.content) {
      if (block.type !== "tool_use") continue

      if (block.name === "flag_flow_gap") {
        const inp = block.input as {
          node_id?: string
          position: string
          description: string
          severity: string
          impact: string
        }
        gaps.push({
          nodeId: inp.node_id,
          position: inp.position,
          description: inp.description,
          severity: inp.severity as FlowGap["severity"],
          impact: inp.impact,
        })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      } else if (block.name === "suggest_node") {
        const inp = block.input as {
          type: string
          target_position: string
          node_type: string
          label: string
          description: string
          rationale: string
          automatable: boolean
        }
        suggestions.push({
          type: inp.type as FlowSuggestion["type"],
          targetPosition: inp.target_position,
          nodeType: inp.node_type,
          label: inp.label,
          description: inp.description,
          rationale: inp.rationale,
          automatable: inp.automatable,
        })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      } else if (block.name === "set_flow_summary") {
        const inp = block.input as {
          flow_score: number
          summary: string
          top_priority: string
        }
        flowScore = Math.max(0, Math.min(100, inp.flow_score))
        summary = inp.summary
        topPriority = inp.top_priority
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      }
    }

    history.push({ role: "assistant", content: response.content })
    history.push({ role: "user", content: toolResults })
    response = await anthropic.messages.create({
      model: AGENT_MODELS.form_audit,
      max_tokens: 3000,
      tools,
      messages: history,
    })
  }

  const scoreLabel: FlowAuditResult["scoreLabel"] =
    flowScore >= 85 ? "ottimo" : flowScore >= 65 ? "buono" : flowScore >= 40 ? "migliorabile" : "critico"

  const proposalPayload = {
    flowScore,
    scoreLabel,
    summary,
    topPriority,
    gaps,
    suggestions,
    currentNodeCount: nodes.length,
    flowStatus,
  }

  const proposal = await prisma.agentProposal.create({
    data: {
      eventId,
      orgId,
      agentType: "FLOW_CONSULTANT",
      actionType: "FLOW_ACTION",
      title: `Analisi Flow — ${event.title} (score: ${flowScore}/100)`,
      summary: summary.slice(0, 160),
      payload: JSON.stringify(proposalPayload),
      diffPayload: null,
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
          comment: `Analisi flow completata. Score: **${flowScore}/100** (${scoreLabel})\n- ${gaps.length} gap rilevati\n- ${suggestions.length} nodi suggeriti\n\n**Priorità:** ${topPriority}`,
        })
      } catch {
        // non bloccante
      }
    }
  }

  const result: FlowAuditResult = {
    flowScore,
    scoreLabel,
    summary,
    topPriority,
    gaps,
    suggestions,
    proposalId: proposal.id,
  }

  return NextResponse.json(result)
}
