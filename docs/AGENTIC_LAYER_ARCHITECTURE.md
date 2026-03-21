# Phorma — Architettura Layer Agentico
**Deliverable 2 — versione 1.0 — 16 marzo 2026**

---

## 1. Principi architetturali

- **Human-in-the-loop prima**: ogni azione agente genera una _proposta_ salvata in DB → l'utente approva/rifiuta/modifica → poi viene eseguita
- **Additivo e backward-compatible**: nessuna tabella esistente viene modificata, solo aggiunte
- **Audit immutabile**: `AgentActionLog` è append-only — nessun UPDATE/DELETE a livello applicativo
- **Contesto parametrico**: ogni agente riceve un `AgentContext` strutturato costruito dal DB, mai dal prompt dell'utente
- **Multi-modello**: ogni tipo di agente usa il modello più appropriato per costo/qualità/latenza

---

## 2. Schema SQL additivo

### 2.1 AgentProposal
Sostituisce il sistema `AI_APPROVALS` EventPlugin. Tabella Prisma reale, queryable, non limitata a 100 items.

```prisma
model AgentProposal {
  id           String    @id @default(cuid())
  eventId      String
  orgId        String
  agentType    String    // SCORE_MONITOR | EMAIL_DRAFT | REPORT | EMAIL_TRACKER | FORM_AUDIT
  actionType   String    // EMAIL_SEND | MASTERLIST_CHANGE | REPORT_GENERATE | FLOW_ACTION | FORM_CHANGE
  title        String
  summary      String?
  payload      String    @default("{}")  // JSON — contenuto bozza
  diffPayload  String?                   // JSON — diff before/after per masterlist
  status       String    @default("PENDING")  // PENDING | APPROVED | REJECTED | EXPIRED
  scheduledAt  DateTime?
  requestedBy  String    // userId
  decidedBy    String?
  decidedAt    DateTime?
  decisionNote String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  event        Event     @relation(...)
  actionLogs   AgentActionLog[]
}
```

**Indici necessari**: `(eventId, status)`, `(orgId, status)`, `(eventId, createdAt DESC)`

### 2.2 AgentActionLog
Log immutabile. Ogni azione approvata ed eseguita genera un record qui.

```prisma
model AgentActionLog {
  id          String         @id @default(cuid())
  eventId     String
  orgId       String
  proposalId  String?
  agentType   String
  actionType  String
  executedBy  String         // userId
  payload     String         @default("{}") // snapshot payload eseguito
  result      String?                       // JSON risultato (n. email, n. record modificati)
  createdAt   DateTime       @default(now())
  event       Event          @relation(...)
  proposal    AgentProposal? @relation(...)
}
```

### 2.3 AgentContextCache
Cache per `buildEventAgentContext()` — TTL 5 minuti per ridurre query DB ripetute.

```prisma
model AgentContextCache {
  id          String   @id @default(cuid())
  eventId     String   @unique
  contextJson String   // JSON serializzato AgentContext
  builtAt     DateTime @default(now())
  expiresAt   DateTime
  event       Event    @relation(...)
}
```

### 2.4 EmailTrackingEvent
Estende `EmailSendLog` con eventi granulari da Resend webhook.

```prisma
model EmailTrackingEvent {
  id             String       @id @default(cuid())
  emailSendLogId String
  eventId        String
  eventType      String       // OPEN | CLICK | BOUNCE | SPAM | UNSUBSCRIBE | DELIVERED
  occurredAt     DateTime     @default(now())
  metadata       String?      // JSON — link cliccato, user agent, bounce reason
  emailSendLog   EmailSendLog @relation(...)
  event          Event        @relation(...)
}
```

---

## 3. API routing del layer agentico

```
# Proposte (DB-based, sostituisce AI_APPROVALS plugin)
GET  /api/events/[id]/ai/proposals                 Lista proposte evento (filtro ?status=)
POST /api/events/[id]/ai/proposals                 Crea proposta (chiamato da agenti)
GET  /api/events/[id]/ai/proposals/[pid]           Dettaglio proposta
POST /api/events/[id]/ai/proposals/[pid]/approve   Approva + esegui azione
POST /api/events/[id]/ai/proposals/[pid]/reject    Rifiuta con note
PATCH /api/events/[id]/ai/proposals/[pid]          Modifica payload prima di approvare

# Org-level (cross-evento)
GET  /api/org/ai/proposals                         Proposte pending per tutta l'org

# Agenti (esistenti + nuovi)
POST /api/events/[id]/ai/agents/score-monitor      ESISTENTE
POST /api/events/[id]/ai/agents/email-draft        ESISTENTE — aggiornato per usare AgentProposal
POST /api/events/[id]/ai/agents/report             DA CREARE (Sprint 3–4)
POST /api/events/[id]/ai/agents/form-audit         DA CREARE (Sprint 7–8)

# Webhook
POST /api/webhooks/resend                          Riceve eventi tracking da Resend
```

---

## 4. Scelta modelli AI per agente

| Agente | Task | Modello | Motivazione |
|---|---|---|---|
| Score Monitor | Analisi KPI + alert strutturati | `claude-sonnet-4-6` | Ragionamento su dati numerici, risposta strutturata in IT |
| Email Draft | Scrittura email persuasiva IT | `claude-sonnet-4-6` | Qualità testo critica per open rate; sonnet >> haiku su copywriting |
| Report | Sintesi dati + narrative IT | `claude-sonnet-4-6` | Dati tabulari + scrittura lunga = sonnet |
| Email Tracker | Categorizza risposte + azioni rapide | `claude-haiku-4-5` | Classificazione semplice, bassa latenza, costo ridotto |
| Form Audit | Analisi struttura + suggerimenti | `claude-sonnet-4-6` | Ragionamento su struttura UX |

Config in `src/lib/ai.ts`:
```typescript
export const AGENT_MODELS: Record<string, string> = {
  score_monitor:  "claude-sonnet-4-6",
  email_draft:    "claude-sonnet-4-6",
  report:         "claude-sonnet-4-6",
  email_tracker:  "claude-haiku-4-5-20251001",
  form_audit:     "claude-sonnet-4-6",
}
```

---

## 5. Flusso human-in-the-loop

```
[Utente clicca "Esegui agente"]
       ↓
[POST /api/events/[id]/ai/agents/X]
       ↓
[buildEventAgentContext() — con cache 5min]
       ↓
[Claude tool use agentic loop]
       ↓
[Agente crea AgentProposal con status=PENDING]
       ↓
[UI mostra proposta — badge counter sidebar aggiornato]
       ↓
[Utente: Approva / Modifica / Rifiuta]
       ↓
   APPROVA → [POST .../approve]
                ↓
             [Esegue azione reale]
             [Scrive AgentActionLog]
             [Aggiorna EmailSendLog / Registration / etc.]
             [Status → APPROVED]

   RIFIUTA → [POST .../reject]
                ↓
             [Status → REJECTED]
             [decisionNote salvato]
```

---

## 6. UX del layer agentico

### Dove vivono nell'UI
- **Tab Analytics** (`/events/[id]?tab=analytics`) — pannello `AgentsPanel` già esistente, da estendere
- **Sidebar** — badge counter proposte PENDING accanto al link "Analytics"
- **Futuro (Sprint 9+)**: pagina `/ai-integrations` con vista cross-evento

### Proposta in attesa (card UI)
```
┌─────────────────────────────────────────────────┐
│ [REPORT] Resoconto partecipanti per cliente     │
│ Urgency: HIGH  ·  14 mar 2026 15:32            │
├─────────────────────────────────────────────────┤
│ Preview (3 righe)...                           │
│ [Espandi]                                       │
├─────────────────────────────────────────────────┤
│ [Approva e esegui]  [Modifica]  [Rifiuta]      │
│ Nota (opzionale): ______________________        │
└─────────────────────────────────────────────────┘
```

### Diff visivo masterlist
Per proposte `actionType=MASTERLIST_CHANGE`:
```
Nome        | Prima      | Dopo
────────────────────────────────
Mario Rossi | PENDING    | CONFIRMED  ← giallo
Luigi Verdi | CONFIRMED  | —          ← verde (aggiunto)
Anna Bianchi| CONFIRMED  | CANCELLED  ← rosso
```

### Feedback negativo
Campo `decisionNote` obbligatorio (min 10 char) su REJECT → salvato in DB → usato per analisi qualità agente.

---

## 7. Integrazione email tracking (Resend webhook)

### Setup Resend
1. Dashboard Resend → Webhooks → Add endpoint: `https://app.phorma.io/api/webhooks/resend`
2. Selezionare eventi: `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.delivered`
3. Copiare `Signing Secret` → `RESEND_WEBHOOK_SECRET` in env

### Verifica firma
Resend usa Svix per delivery. Alternativa senza package: verificare header `resend-webhook-id` + `resend-signature` con HMAC-SHA256.

Per v1 useremo la verifica tramite header `X-Resend-Signature` con RESEND_WEBHOOK_SECRET. Aggiornare a Svix in Sprint 5–6.

### Matching EmailSendLog
Il webhook Resend include `data.email_id` — corrisponde all'ID Resend ritornato al momento dell'invio.
Necessario salvare questo ID in `EmailSendLog`. Campo da aggiungere: `resendId String?`.

---

## 8. Dipendenze tra sprint

```
Sprint 1–2 (infrastruttura)
  ├── Schema DB (AgentProposal, AgentActionLog, AgentContextCache, EmailTrackingEvent)
  ├── Resend webhook + matching resendId
  ├── API proposte (DB-based)
  └── Cache context + badge sidebar
         ↓
Sprint 3–4 (Agente Report)
  ├── Dipende da: AgentProposal + AgentActionLog (Sprint 1–2)
  └── Introduce: ProposalDiff component + PDF export
         ↓
Sprint 5–6 (Agente Email)
  ├── Dipende da: EmailTrackingEvent + resendId (Sprint 1–2)
  └── Introduce: Dashboard metriche per campagna + scheduling
         ↓
Sprint 7–8 (Agente Form)
  ├── Dipende da: AgentProposal + ProposalDiff (Sprint 3–4)
  └── Introduce: Form quality audit + follow-up mapping
         ↓
Sprint 9+ (Agente Phorma + UX finale)
  └── Dipende da: tutti i precedenti stabili
```
