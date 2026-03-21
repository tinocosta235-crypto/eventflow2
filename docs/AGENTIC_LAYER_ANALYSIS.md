# Phorma — Analisi Codebase + Schema DB + Gap per Layer Agentico
**Deliverable 1 — versione 1.0 — 16 marzo 2026**

---

## 1. Schema Database (da Prisma + Supabase)

### 1.1 Tabelle esistenti e relazioni

```
Organization
  ├── users         → UserOrganization (userId, organizationId, role)
  ├── events        → Event
  ├── invites       → OrgInvite
  └── hotels        → Hotel

User
  ├── accounts      → Account (OAuth)
  ├── sessions      → Session
  └── organizations → UserOrganization

Event
  ├── registrations  → Registration
  ├── formFields     → FormField
  ├── emailTemplates → EmailTemplate
  ├── checkIns       → CheckIn
  ├── kpiConfig      → KpiConfig (1:1)
  ├── kpiSnapshots   → KpiSnapshot[]
  ├── emailSendLogs  → EmailSendLog[]
  ├── groups         → EventGroup[]
  ├── plugins        → EventPlugin[]
  ├── allotments     → HotelAllotment[]
  └── travelEntries  → TravelEntry[]

Registration
  ├── fields         → RegistrationField[]
  ├── checkIn        → CheckIn (1:1)
  ├── roomAssignments→ RoomAssignment[]
  └── travelEntries  → TravelEntry[]

Hotel (org-level)
  ├── roomTypes      → RoomType[]
  └── allotments     → HotelAllotment[]
```

### 1.2 Tipi di EventPlugin presenti nel codebase

| pluginType | Descrizione | Config JSON |
|---|---|---|
| `EVENT_FLOW` | Flow automation engine | `{ nodes, edges, status, runs[] }` |
| `AI_APPROVALS` | Queue approvazioni human-in-the-loop | `{ items: ApprovalItem[] }` |
| `REGISTRATION_PATHS` | Percorsi registrazione per gruppo | `{ paths[], version }` |
| `REGISTRATION` | Modalità iscrizione + whitelist | `{ mode, invitedEmails[] }` |
| `GUEST_LISTS` | Plugin liste ospiti | — |
| `HOSPITALITY` | Abilitazione modulo hospitality | — |
| `TRAVEL` | Abilitazione modulo travel | — |

### 1.3 Email tracking attuale

`EmailSendLog` traccia:
- `sentAt` — sempre
- `openedAt` — **non popolato** (infrastruttura non implementata)
- `clickedAt` — **non popolato** (infrastruttura non implementata)
- `status` — solo SENT/FAILED (nessun bounce, nessun unsubscribe)

**Gap**: il tracking email è strutturato nel DB ma non operativo.

---

## 2. Moduli esistenti rilevanti

### 2.1 AI Layer (M6–M7)

**`src/lib/ai.ts`**
- Client Anthropic singleton, modello `claude-sonnet-4-6`
- Nessuna configurazione multi-modello, nessun retry, nessun rate limiting

**Pattern agentico esistente** (implementato in M7):
```typescript
// Agentic loop canonico del progetto
const response = await anthropic.messages.create({ tools, messages })
while (response.stop_reason === "tool_use") {
  const toolUse = response.content.find(b => b.type === "tool_use")
  const result = handleTool(toolUse)
  messages.push({ role: "user", content: [{ type: "tool_result", ... }] })
  response = await anthropic.messages.create({ tools, messages })
}
```

**Agenti esistenti** (in `/api/events/[id]/ai/agents/`):
- `score-monitor/` — Analizza KPI e genera alert con tool `flag_anomaly`
- `email-draft/` — Genera bozza email con tool `create_email_draft`

**`src/lib/agent-context.ts`**
- `buildEventAgentContext(eventId, orgId)` — aggrega statistiche evento
- Output: registrations stats, email metrics, KPI score con trend
- Già ottimizzato per ridurre token (dati pre-computati)

### 2.2 Email System

**Provider**: Resend (API REST, non SMTP)
**Templates**: `email-builder.ts` — visual builder con blocchi (Text, Image, Button, Divider, Spacer, 2-Column)
**Payload format**: `EmailBuilderPayload` con formato `"eventflow_email_v1"`, versioning, branding, audience

**7 template default** per evento: INVITE, REG_CONFIRMATION, WAITLIST_CONFIRMATION, WAITLIST_PROMOTION, REMINDER, UPDATE, CANCELLATION

**Audience filter**: per `statuses[]` e `groupIds[]`

**Mass send** (`/api/events/[id]/emails/send`):
- Filtri: status, group, date range
- `dryRun` mode per preview destinatari
- Log granulare per ogni invio
- Trigger event flow `email_sent` post-invio

### 2.3 Form Builder

**`FormField`** — 5 tipi:
- text, textarea, select, checkbox, radio

**`RegistrationField`** — valori per ogni partecipante
- Relazione: `Registration` ←→ `FormField` via `RegistrationField`

**`conditions`** — JSON field su `FormField` per logica condizionale (già presente ma non completamente esposta in UI)

**Gap Form Agent**:
- Nessuna analisi automatica della qualità dei form
- Nessun suggerimento su label/ordine campi
- Le actions di follow-up (es. allergie → lista catering) non sono implementate nel flow automatico

### 2.4 Registration Paths (`src/lib/registration-paths.ts`)

**Struttura**: ogni `EventGroup` ha un path di registrazione dedicato
- Path gestisce: form mode, email template mapping, flow mode
- Sincronizzazione automatica group ↔ path
- Supportato nel flow condition evaluation

### 2.5 Event Flow Runtime (`src/lib/event-flow-runtime.ts`)

**Trigger**: `email_sent`, `registration_created`, `checkin_completed`
**Condizioni**: su `registration.status`, `registration.firstName`, `field:{fieldId}`, paths, groups
**Azioni**: `send_email`, `update_guest_status`, `assign_hotel`, `notify_team`, `assign_form`, `activate_checkin`
**Approval flow**: nodi con `approveFirst: true` → enqueue in `AI_APPROVALS` plugin

### 2.6 Approval Queue (`/api/events/[id]/ai/approvals/`)

Sistema human-in-the-loop già funzionante:
- Storage: `EventPlugin.config` JSON (pluginType = `AI_APPROVALS`)
- Max 100 items in queue
- Status: `PENDING | APPROVED | REJECTED`
- `requestedBy`, `decidedAt`, `decisionNote` tracciati

**Questo è il sistema che dobbiamo estendere** per i 4 agenti.

### 2.7 Audit (`src/lib/audit.ts`)

**Attuale**: append-only NDJSON su `docs/audit-log.ndjson`
**Azioni tracciate**: solo operazioni org-level (invite, role, GDPR)
**Gap**: nessun audit trail per azioni agenti AI

### 2.8 RBAC (`src/lib/rbac.ts`)

**6 ruoli** con rank: OWNER(4) > ADMIN(3) > PLANNER(2) > ONSITE(1) / FINANCE(1) > VIEWER(0)
**Gap**: nessuna granularità per approvare/rifiutare proposte agenti

---

## 3. Gap identificati per il Layer Agentico

### 3.1 Gap critici (bloccanti per sprint 1–4)

#### GAP-01: Email tracking non operativo
- `EmailSendLog.openedAt` e `clickedAt` non vengono mai popolati
- Resend non ha webhook configurato
- **Impatto**: Agente Email non può operare su dati reali; Score Monitor KPI `email_open_rate` e `email_click_rate` sono sempre 0
- **Soluzione richiesta**: Implementare Resend webhooks + endpoint `/api/webhooks/resend`

#### GAP-02: Nessun storage persistente per proposte agenti
- Il sistema `AI_APPROVALS` usa `EventPlugin.config` JSON (max 100 items, volatile)
- Non esiste una tabella dedicata `agent_proposals`
- Non c'è modo di fare query cross-evento sulle proposte
- **Impatto**: impossibile costruire dashboard "proposte in sospeso", storico decisioni, analytics sull'efficacia degli agenti
- **Soluzione richiesta**: tabella `AgentProposal` nel DB

#### GAP-03: Nessun log persistente delle azioni agenti eseguite
- `audit.ts` usa file NDJSON, non DB — non queryable
- Le azioni approvate non generano record strutturato
- **Impatto**: impossibile mostrare "storia decisioni" per evento; nessun audit trail per clienti
- **Soluzione richiesta**: tabella `AgentActionLog` nel DB

#### GAP-04: Agente Report non esiste
- Nessun codice per generazione report strutturati
- La masterlist non ha un formato di export programmabile
- **Impatto**: Agente Report (priorità massima nel piano) parte da zero
- **Soluzione richiesta**: endpoint + UI dedicata

### 3.2 Gap moderati (sprint 3–6)

#### GAP-05: Cache contesto agente non persistente
- `buildEventAgentContext()` fa DB query ogni volta
- Con molte chiamate agenti simultanee = overhead DB significativo
- **Soluzione richiesta**: tabella `AgentContextCache` con TTL 5 minuti

#### GAP-06: Email Agent manca di scheduling
- Non c'è sistema per pianificare invii futuri
- Proposte agente "invia reminder domani" non realizzabili
- **Soluzione richiesta**: campo `scheduledAt` su `AgentProposal` + job runner

#### GAP-07: Form Agent non ha analisi quality
- Nessun endpoint che valuti qualità del form (ridondanza, ordine, label)
- Le actions di follow-up da risposte form non sono mappate automaticamente
- **Soluzione richiesta**: endpoint `/api/events/[id]/ai/agents/form-audit`

#### GAP-08: Diff visivo modifiche masterlist non implementato
- Il piano richiede "diff visivo prima/dopo" per proposte che modificano registrations
- Non esiste UI component per questo
- **Soluzione richiesta**: componente `ProposalDiff` con visualizzazione tabellare

### 3.3 Gap minori (sprint 5+)

#### GAP-09: Multi-modello non supportato
- Tutti gli agenti usano `claude-sonnet-4-6` hardcoded in `ai.ts`
- Nessuna possibilità di routing per costo/velocità
- **Soluzione richiesta**: config per modello per tipo di agente

#### GAP-10: Nessun sistema di feedback sugli agenti
- L'utente può approvare/rifiutare ma non spiegare perché
- Il feedback non viene usato per migliorare i prompt
- **Soluzione richiesta**: campo `decisionNote` esteso + prompt adjustment

#### GAP-11: Notifiche in-app per proposte agenti
- Nessun sistema di notifica quando un agente genera una proposta
- L'utente deve controllare manualmente la queue
- **Soluzione richiesta**: badge counter su sidebar + notifica toast

---

## 4. Architettura del layer agentico (proposta)

### 4.1 Struttura delle tabelle da aggiungere

```sql
-- Proposte degli agenti (sostituisce AI_APPROVALS plugin)
AgentProposal
  id, eventId, orgId, agentType (REPORT | EMAIL | FORM | FLOW)
  actionType, title, summary
  payload JSON          -- contenuto proposta (bozza report, email draft, etc.)
  diffPayload JSON?     -- diff strutturato per masterlist changes
  status (PENDING | APPROVED | REJECTED | EXPIRED)
  scheduledAt DateTime? -- per proposte schedulate
  requestedBy (userId)
  decidedBy (userId)?
  decidedAt DateTime?
  decisionNote?
  createdAt, updatedAt

-- Log immutabile delle azioni eseguite
AgentActionLog
  id, eventId, orgId, proposalId?
  agentType, actionType
  executedBy (userId)
  payload JSON          -- snapshot di cosa è stato eseguito
  result JSON?          -- risultato (es. n. email inviate, registrazioni modificate)
  createdAt             -- immutabile, nessun updatedAt

-- Cache contesto evento per agenti
AgentContextCache
  id, eventId
  contextJson JSON      -- AgentContext serializzato
  builtAt DateTime
  expiresAt DateTime    -- TTL 5 minuti

-- Tracking email potenziato (estende EmailSendLog)
EmailTrackingEvent
  id, emailSendLogId, eventId
  eventType (OPEN | CLICK | BOUNCE | SPAM | UNSUBSCRIBE)
  occurredAt DateTime
  metadata JSON?        -- link cliccato, user agent, etc.
```

### 4.2 Routing agenti

```
/api/events/[id]/ai/agents/
  score-monitor/     ← ESISTENTE
  email-draft/       ← ESISTENTE
  report/            ← DA CREARE (sprint 3)
  email-tracker/     ← DA CREARE (sprint 5–6, dipende da GAP-01)
  form-audit/        ← DA CREARE (sprint 7)

/api/events/[id]/ai/proposals/
  GET  ?status=PENDING           ← lista proposte per evento
  GET  [proposalId]              ← dettaglio proposta
  POST [proposalId]/approve      ← approva ed esegui
  POST [proposalId]/reject       ← rifiuta con note
  POST [proposalId]/modify       ← modifica payload prima di eseguire

/api/org/ai/proposals/
  GET  ?status=PENDING           ← proposte cross-evento per org

/api/webhooks/resend/            ← DA CREARE (sprint 1, GAP-01)
```

### 4.3 Scelta del modello per agente

| Agente | Compito principale | Modello raccomandato | Motivazione |
|---|---|---|---|
| Report | Sintesi dati tabellari + testo italiano | `claude-sonnet-4-6` | Qualità testo IT + ragionamento su dati |
| Email Tracker | Categorizzazione + azioni rapide | `claude-haiku-4-5` | Bassa latenza, compiti semplici, costo ridotto |
| Email Draft | Scrittura persuasiva in italiano | `claude-sonnet-4-6` | Qualità testo è critica per open rate |
| Form Audit | Analisi strutturale + suggerimenti | `claude-sonnet-4-6` | Ragionamento su struttura dati |
| Flow Consultant | Architettura + raccomandazioni | `claude-opus-4-6` | Complessità alta, latenza accettabile |

Approccio multi-modello: configurabile per tipo agente in `src/lib/ai.ts` con
map `AGENT_MODELS: Record<AgentType, string>`.

### 4.4 UX del layer agentico nell'UI esistente

**Posizione**: pannello Agenti nella tab Analytics (`/events/[id]?tab=analytics`)
→ già esiste `AgentsPanel.tsx`, da estendere con gli agenti nuovi

**Badge counter**: `ContextualSidebar` sotto ogni evento mostra badge con
n. proposte `PENDING` (da aggiungere a query sidebar)

**Proposta in attesa**: card con:
- Header: `[TIPO AGENTE] — [TITOLO]` + badge urgency
- Body: preview proposta (max 3 righe), con "espandi"
- Se masterlist diff: tabella before/after con righe colorate (verde=aggiunto, giallo=modificato, rosso=rimosso)
- Footer: `[Approva]` `[Modifica]` `[Rifiuta]` + textarea decisionNote opzionale

**Feedback negativo**: al rifiuto l'utente può spiegare il motivo → salvato in `decisionNote` → usato per migliorare il prompt system in versioni future

---

## 5. Roadmap sprint-by-sprint

### Sprint 1–2 (2 sett.) — Infrastruttura email tracking + schema DB agentico
**Obiettivo**: GAP-01 + GAP-02 + GAP-03

Task tecnici:
1. Resend webhooks: endpoint `/api/webhooks/resend/route.ts` che riceve `email.opened`, `email.clicked`, `email.bounced`
2. Popola `EmailSendLog.openedAt` / `clickedAt` / `status=BOUNCED`
3. Aggiunge tabella `AgentProposal` + `AgentActionLog` + `AgentContextCache` + `EmailTrackingEvent`
4. Migra `AI_APPROVALS` plugin → tabella `AgentProposal`
5. Aggiorna `buildEventAgentContext()` con cache
6. Badge counter proposte pending in `ContextualSidebar`

Definition of done:
- Email inviate da Phorma mostrano open/click rate reali in analytics
- Le proposte agenti sopravvivono a restart server
- Query "proposte pending per org" funzionante

Dipendenze: nessuna

---

### Sprint 3–4 (2 sett.) — Agente Report
**Obiettivo**: primo agente da mostrare a clienti beta

Task tecnici:
1. Endpoint `POST /api/events/[id]/ai/agents/report`
2. Tools Claude: `create_report_section`, `propose_masterlist_change`, `set_report_metadata`
3. Componente `ReportAgent.tsx` in `AgentsPanel`
4. Componente `ProposalDiff.tsx` per diff visivo masterlist
5. Logica approvazione → esecuzione reale modifiche su `Registration`
6. Export PDF del report generato (usa `@react-pdf/renderer` o `puppeteer`)

Definition of done:
- L'utente descrive il report che vuole e l'agente lo genera
- Le modifiche proposte alla masterlist mostrano diff visivo
- Il report approvato è scaricabile in PDF

Dipendenze: Sprint 1–2 (tabella `AgentProposal`)

---

### Sprint 5–6 (2 sett.) — Agente Email
**Obiettivo**: tracking reale + proposte contestuali

Task tecnici:
1. Dashboard email con metriche reali (aperte/cliccate/bounce per campagna)
2. Endpoint `POST /api/events/[id]/ai/agents/email-tracker`
3. Logica analisi risposte + categorizzazione (conferma/richiesta info/disdetta)
4. Azione "invia reminder a N che non hanno aperto" con preview destinatari
5. Scheduling proposte (`scheduledAt` su `AgentProposal`)
6. `EmailsClient.tsx` — aggiunge sezione metriche per template

Definition of done:
- Open rate e click rate visibili per ogni campagna inviata
- L'agente propone azioni concrete con lista destinatari
- Le proposte schedulate vengono eseguite all'ora prevista

Dipendenze: Sprint 1–2 (webhook tracking)

---

### Sprint 7–8 (2 sett.) — Agente Form
**Obiettivo**: audit qualità form + follow-up automatici

Task tecnici:
1. Endpoint `POST /api/events/[id]/ai/agents/form-audit`
2. Tools: `flag_field_issue`, `suggest_improvement`, `map_followup_action`
3. `FormAgent.tsx` in `AgentsPanel` con sezione audit
4. Mapping risposte critiche → azioni flow (allergie → tag, preferenze → group)
5. Integrazione con flow builder: generazione automatica nodi da audit suggerimenti

Definition of done:
- L'agente analizza un form e produce audit con score qualità
- I suggerimenti approvati modificano il form
- Le azioni di follow-up approvate creano nodi nel flow builder

Dipendenze: Sprint 3–4 (componente ProposalDiff)

---

### Sprint 9+ — Agente Phorma (Flow Consultant) + UX finale
**Obiettivo**: consulenza sul flow + rifinitura UX complessiva

In scope:
- Agente analizza flow esistente e identifica gap
- Propone template preconfigurati per tipologia evento
- UX globale pannello agenti: notifiche, history, statistiche efficacia
- Dashboard org-level: proposte cross-evento

Dipendenze: Flow builder stabile + tutti gli agenti precedenti in produzione

---

## 6. Note architetturali critiche

### 6.1 Backward compatibility
- Tutte le tabelle nuove sono additive — nessuna modifica a tabelle esistenti
- La migrazione `AI_APPROVALS` plugin → `AgentProposal` deve essere fatta con script di migrazione dati
- `EmailSendLog` rimane invariata; `EmailTrackingEvent` la estende via FK

### 6.2 Sicurezza
- I webhook Resend devono verificare la firma `Svix-Signature` (Resend usa Svix per delivery)
- Le proposte agenti devono essere scoped per `orgId` — mai cross-org
- `AgentActionLog` è append-only — nessun UPDATE o DELETE permesso a livello applicativo

### 6.3 Performance
- `AgentContextCache` con TTL 5 min riduce query DB per agenti frequenti
- Le proposte pending devono essere indicizzate per `(eventId, status)` e `(orgId, status)`
- Il diff masterlist viene computato in memoria (non persistito) — solo `diffPayload` JSON salvato

### 6.4 Prisma + Supabase note
- Schema viene esteso con `npx prisma db push` (sviluppo) o migration file (produzione)
- RLS policy Supabase: le nuove tabelle devono ereditare la policy org-scoped
- Adapter `@prisma/adapter-pg` rimane invariato
