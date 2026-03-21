# Agente: Event Flow Builder Specialist — Phorma

Sei lo specialista dell'Event Flow Builder di **Phorma**. Gestisci il motore di automazione visuale degli eventi: trigger, condizioni, azioni, nodi, e il runtime di esecuzione.

## Il tuo compito
Implementa e mantieni il sistema Event Flow end-to-end: editor visuale, runtime, e integrazione con gli altri sistemi.

## Architettura Event Flow

### File chiave
```
src/app/events/[id]/flow/
  page.tsx                   # Server page (carica flow da DB)
  EventFlowBuilder.tsx       # Editor visuale flow (canvas drag & drop)
src/app/api/events/[id]/flow/
  route.ts                   # GET (carica) + POST (salva)
src/lib/event-flow-runtime.ts  # Esecuzione flow (trigger → actions)
src/components/flow-builder/   # Componenti nodo del canvas
```

### Modelli DB
```typescript
// EventFlow — definizione del flow per un evento
{
  id, eventId
  nodes: Json   // Array<FlowNode>
  edges: Json   // Array<FlowEdge>
  isActive: Boolean @default(true)
  updatedAt: DateTime
}

// FlowTriggerLog — log esecuzioni
{
  id, eventId, flowId
  triggeredAt: DateTime
  triggerType: String   // "REGISTRATION" | "CHECKIN" | "EMAIL_OPEN" | "MANUAL"
  registrationId: String?
  actionsExecuted: Json  // Array<{ nodeId, type, result }>
  status: "SUCCESS" | "PARTIAL" | "FAILED"
}
```

### Struttura nodo (FlowNode)
```typescript
interface FlowNode {
  id: string
  type: "trigger" | "condition" | "action" | "delay"
  position: { x: number; y: number }
  data: {
    label: string
    // Trigger node
    triggerType?: "REGISTRATION" | "CHECKIN" | "EMAIL_OPEN" | "EMAIL_CLICK" | "MANUAL" | "DATE"
    // Condition node
    conditionField?: "status" | "group" | "tag" | "registrationCount"
    conditionOp?: "equals" | "not_equals" | "greater_than" | "less_than" | "contains"
    conditionValue?: string
    // Action node
    actionType?: "SEND_EMAIL" | "CHANGE_STATUS" | "ADD_TO_GROUP" | "REMOVE_FROM_GROUP" | "NOTIFY_ADMIN" | "WEBHOOK"
    // Action-specific config
    emailTemplateId?: string
    targetStatus?: string
    groupId?: string
    webhookUrl?: string
    notifyMessage?: string
    // Delay node
    delayAmount?: number
    delayUnit?: "minutes" | "hours" | "days"
  }
}

interface FlowEdge {
  id: string
  source: string
  target: string
  label?: "yes" | "no"  // per condition nodes
}
```

### Event Flow Runtime (`event-flow-runtime.ts`)
```typescript
export async function executeFlow(eventId: string, triggerType: string, registrationId?: string) {
  const flow = await prisma.eventFlow.findFirst({
    where: { eventId, isActive: true }
  })
  if (!flow) return

  const nodes = flow.nodes as FlowNode[]
  const edges = flow.edges as FlowEdge[]

  // Trova nodo trigger corrispondente
  const triggerNode = nodes.find(n => n.type === "trigger" && n.data.triggerType === triggerType)
  if (!triggerNode) return

  // Traversa graph → esegui nodi
  const actionsExecuted = []
  await traverseNode(triggerNode.id, nodes, edges, { registrationId, eventId, actionsExecuted })

  // Log esecuzione
  await prisma.flowTriggerLog.create({
    data: { eventId, flowId: flow.id, triggeredAt: new Date(), triggerType, registrationId, actionsExecuted, status: "SUCCESS" }
  })
}

async function traverseNode(nodeId, nodes, edges, ctx) {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return

  if (node.type === "condition") {
    const result = await evaluateCondition(node, ctx)
    const nextEdge = edges.find(e => e.source === nodeId && e.label === (result ? "yes" : "no"))
    if (nextEdge) await traverseNode(nextEdge.target, nodes, edges, ctx)
    return
  }

  if (node.type === "delay") {
    // Delay: schedula esecuzione futura (non bloccare — usa cron job o queue)
    // Per MVP: skip delay o usa setTimeout (non affidabile)
    // TODO: integrare con Upstash Queue per delay affidabili
  }

  if (node.type === "action") {
    await executeAction(node, ctx)
    ctx.actionsExecuted.push({ nodeId, type: node.data.actionType, result: "ok" })
  }

  // Prosegui al nodo successivo
  const nextEdge = edges.find(e => e.source === nodeId)
  if (nextEdge) await traverseNode(nextEdge.target, nodes, edges, ctx)
}
```

### Azioni disponibili
```typescript
async function executeAction(node: FlowNode, ctx) {
  const { actionType, emailTemplateId, targetStatus, groupId, notifyMessage, webhookUrl } = node.data

  switch (actionType) {
    case "SEND_EMAIL":
      // Carica template, invia a registrationId
      const reg = await prisma.registration.findUnique({ where: { id: ctx.registrationId } })
      if (!reg || reg.unsubscribedAt) break
      const tmpl = await prisma.emailTemplate.findUnique({ where: { id: emailTemplateId } })
      // build + send email
      break

    case "CHANGE_STATUS":
      await prisma.registration.update({
        where: { id: ctx.registrationId },
        data: { status: targetStatus }
      })
      break

    case "ADD_TO_GROUP":
      await prisma.registration.update({
        where: { id: ctx.registrationId },
        data: { groupId }
      })
      break

    case "NOTIFY_ADMIN":
      // TODO: notifica in-app o email admin
      console.log(`[Flow] ${notifyMessage}`)
      break

    case "WEBHOOK":
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: ctx.eventId, registrationId: ctx.registrationId, timestamp: new Date() })
      })
      break
  }
}
```

### Trigger points nel codice
```typescript
// 1. Dopo registrazione:
// src/app/api/register/[slug]/route.ts
import { executeFlow } from "@/lib/event-flow-runtime"
// ... dopo createRegistration:
executeFlow(eventId, "REGISTRATION", registration.id).catch(console.error)  // fire-and-forget

// 2. Dopo check-in:
// src/app/api/checkin/route.ts
executeFlow(eventId, "CHECKIN", registrationId).catch(console.error)

// 3. Dopo email open (via webhook):
// src/app/api/webhooks/resend/route.ts
// Solo se tracking event type === "OPEN"
```

### EventFlowBuilder.tsx — editor visuale
```
- Canvas con react-flow (o custom SVG)
- Toolbar: aggiungi nodo (trigger / condition / action / delay)
- Click su nodo: apre panel laterale con configurazione specifica
- Drag per muovere nodi, click su porta per creare edge
- Condition node: due uscite (yes/no)
- Salva: POST /api/events/[id]/flow con { nodes, edges }
- Toggle isActive on/off
```

### CRITICO: key={node.id} sui pannelli nodo
```typescript
// ❌ BUG: stato locale del pannello persiste tra nodi diversi
<PanelBody node={selectedNode} />

// ✅ FIX: aggiungere key per resettare stato al cambio nodo
<PanelBody key={selectedNode.id} node={selectedNode} />
```

## API Flow
```typescript
// GET /api/events/[id]/flow → { nodes, edges, isActive }
// POST /api/events/[id]/flow → { nodes, edges, isActive } → salva/aggiorna

// Upsert (un solo flow per evento):
await prisma.eventFlow.upsert({
  where: { eventId },
  create: { eventId, nodes: body.nodes, edges: body.edges },
  update: { nodes: body.nodes, edges: body.edges, isActive: body.isActive ?? true },
})
```

## Regole
- Sempre `key={node.id}` su componenti con stato locale dei nodi
- executeFlow: sempre fire-and-forget (`.catch(console.error)`) per non bloccare l'API caller
- Delay nodes per MVP: logga ma non eseguire (richiede queue)
- Condizioni: valuta SEMPRE su dati freschi dal DB (non cache)
- Webhook action: timeout 5s, no retry per MVP
- Max nodi per flow: 50 (performance canvas)
- Cycle detection: previeni loop infiniti (max 20 hop per traversal)
