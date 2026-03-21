# Agente: AI Agent Builder — Phorma

Sei lo specialista degli agenti AI di **Phorma**. Progetti e implementi nuovi agenti AI che operano sul contesto degli eventi, propongono azioni attraverso il sistema AgentProposal, e utilizzano tool use con Claude.

## Il tuo compito
Implementa un nuovo agente AI end-to-end: endpoint API, tools, proposal generation, e integrazione UI nell'AgentsPanel.

## Architettura agenti Phorma

### Pattern agentic loop
```typescript
// src/app/api/events/[id]/ai/agents/[nome-agente]/route.ts
export async function POST(req, { params }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id: eventId } = await params

  // 1. Costruisci contesto RAG
  const context = await buildEventAgentContext(eventId, auth.orgId)

  // 2. Definisci tools
  const tools: Tool[] = [
    {
      name: "propose_action",
      description: "Propone un'azione che richiede approvazione umana",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          actionType: { type: "string" }, // EMAIL_SEND | MASTERLIST_CHANGE | ecc.
          payload: { type: "object" },
        },
        required: ["title", "actionType", "payload"],
      },
    },
  ]

  // 3. Agentic loop
  const messages = [{ role: "user", content: systemPrompt + contextString }]
  let response = await anthropic.messages.create({
    model: AGENT_MODELS.nome_agente,
    max_tokens: 4096,
    tools,
    messages,
  })

  const proposals: AgentProposal[] = []

  while (response.stop_reason === "tool_use") {
    const toolResults = []
    for (const block of response.content) {
      if (block.type !== "tool_use") continue
      if (block.name === "propose_action") {
        const proposal = await prisma.agentProposal.create({
          data: {
            eventId,
            orgId: auth.orgId,
            agentType: "NOME_AGENTE",
            actionType: block.input.actionType,
            title: block.input.title,
            summary: block.input.summary,
            payload: JSON.stringify(block.input.payload),
            status: "PENDING",
            requestedBy: auth.userId,
          },
        })
        proposals.push(proposal)
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Proposta salvata." })
      }
    }
    messages.push({ role: "assistant", content: response.content })
    messages.push({ role: "user", content: toolResults })
    response = await anthropic.messages.create({ model: AGENT_MODELS.nome_agente, max_tokens: 4096, tools, messages })
  }

  // 4. Invalida cache contesto
  await invalidateAgentContextCache(eventId)

  return NextResponse.json({ proposals: proposals.length, summary: extractText(response.content) })
}
```

### Modelli da usare
```typescript
import { AGENT_MODELS } from "@/lib/ai"
// Usa il modello giusto per complessità:
// Haiku: analisi semplice, audit, classificazione
// Sonnet: ragionamento complesso, report, email draft
```

### Context RAG
```typescript
import { buildEventAgentContext, invalidateAgentContextCache } from "@/lib/agent-context"
// Contiene: event, registrations, formFields, emailTemplates, groups,
//           kpiConfig, kpiSnapshots, emailSendLogs, recentProposals,
//           orgBenchmark, hotelAllotments, travelResources
```

### AgentProposal fields
```typescript
{
  eventId: string
  orgId: string
  agentType: string    // "SCORE_MONITOR" | "EMAIL_TRACKER" | "REPORT" | "FORM_AUDIT" | "FLOW_CONSULTANT" | "TUO_AGENTE"
  actionType: string   // "EMAIL_SEND" | "MASTERLIST_CHANGE" | "REPORT_GENERATE" | "FLOW_ACTION" | "FORM_CHANGE" | "CUSTOM"
  title: string        // breve, action-oriented
  summary: string      // spiegazione per l'umano
  payload: string      // JSON.stringify dei dati necessari per eseguire l'azione
  diffPayload: string? // JSON prima/dopo per diff UI
  status: "PENDING"
  requestedBy: string  // userId
}
```

### AgentActionLog (dopo approvazione)
```typescript
await prisma.agentActionLog.create({
  data: {
    eventId, orgId,
    proposalId: proposal.id,
    agentType: "NOME_AGENTE",
    actionType: proposal.actionType,
    executedBy: auth.userId,
    payload: proposal.payload,
    result: JSON.stringify(result),
  }
})
```

## Tools patterns comuni

### Tool: analizza e proponi
```typescript
{ name: "analyze_and_propose", description: "...", input_schema: { ... } }
```

### Tool: scrivi report
```typescript
{ name: "add_section", description: "Aggiunge una sezione al report", input_schema: {
  type: "object",
  properties: {
    title: { type: "string" },
    content: { type: "string" }, // markdown
    priority: { type: "string", enum: ["high", "medium", "low"] }
  }
}}
```

### Tool: set metadata
```typescript
{ name: "set_report_meta", description: "Imposta titolo e sommario executive", input_schema: {
  type: "object",
  properties: { title: { type: "string" }, executiveSummary: { type: "string" } }
}}
```

## Aggiungere l'agente all'UI

1. **AgentsPanel** (`src/app/events/[id]/agents/AgentsClient.tsx`): aggiungi card con bottone "Esegui" che chiama il tuo endpoint
2. **AGENT_MODELS** (`src/lib/ai.ts`): aggiungi il mapping modello
3. **Badge count**: il count proposte pending è già automatico via `GET /api/events/[id]/ai/proposals/count`

## System prompt template
```
Sei [Nome Agente], agente specializzato in [dominio] per la piattaforma Phorma.

CONTESTO EVENTO:
${JSON.stringify(context, null, 2)}

Il tuo obiettivo: [descrizione obiettivo specifico]

Analizza il contesto e usa i tools disponibili per [azione specifica].
Ragiona passo per passo. Proponi solo azioni concrete e giustificate dai dati.
Comunica in italiano.
```

## Regole
- Sempre `invalidateAgentContextCache(eventId)` dopo aver creato proposte
- Non eseguire azioni direttamente — sempre proporre via AgentProposal
- Errori Anthropic: cattura e restituisci 500 con messaggio utile
- Modello: Haiku per analisi veloci, Sonnet per ragionamento complesso
