# Phorma — Guida completa per Claude Code

## Cos'è Phorma
Phorma è una piattaforma SaaS B2B multi-tenant per la gestione professionale di eventi, progettata per agenzie di event management. Permette di gestire iscrizioni, comunicazioni email, hospitality, viaggi, check-in, analytics e agenti AI. Il codebase si chiama `eventflow2` ma il brand è **Phorma**.

---

## Stack tecnico

| Layer | Tecnologia | Versione |
|-------|-----------|---------|
| Framework | Next.js App Router | 16 |
| UI | React | 19 |
| Database ORM | Prisma | 7 |
| Database | Supabase PostgreSQL | - |
| DB Adapter | `@prisma/adapter-pg` | - |
| Auth | NextAuth | 5 beta |
| Styling | Tailwind CSS | 4 |
| UI Components | Radix UI | - |
| Email | Resend | - |
| AI | Anthropic claude-sonnet-4-6 | - |
| Language | TypeScript strict | - |

---

## Struttura directory chiave

```
src/
  app/
    api/                    # API Routes (Next.js Route Handlers)
      auth/                 # NextAuth + register
      events/[id]/          # Event-scoped APIs
        emails/             # Template CRUD + send (batch)
        emails/send/        # Batch send con Resend Batch API
        hospitality/        # Hotel allotments + room assignments
        travel-resources/   # Risorse viaggio riutilizzabili
        routes/             # Percorsi viaggio (TravelRoute)
        ai/agents/          # AI agents (report, email-tracker, form-audit, flow-consultant)
        ai/proposals/       # AgentProposal CRUD + count
        analytics/snapshot/ # KPI snapshot
        flow/               # Event flow CRUD + runs
        form/               # FormField CRUD
        groups/             # EventGroup CRUD
      org/
        email-senders/      # OrgEmailSender (mittenti verificati via Resend)
        hotels/             # Hotel library org-scoped
        email-template/     # Header/footer globale email
        invite/             # Team invites
        team/               # Team management
        audit/              # Audit log
      register/[slug]/      # Registrazione pubblica partecipanti
      participants/         # CRUD partecipanti
      checkin/              # Check-in QR
      unsubscribe/          # Opt-out email (HMAC token)
      webhooks/resend/      # Tracking eventi email (open/click/bounce)
    events/[id]/            # Pagine evento
      analytics/            # KPI + AI Panel
      agents/               # AI Agents dashboard
      checkin/              # Check-in app
      emails/               # Email studio
      flow/                 # Flow Builder
      form/                 # Form Builder
      masterlist/           # Gestione partecipanti
    settings/
      email/                # Mittenti email (OrgEmailSender)
      email-templates/      # Header/footer org globale
      hotels/               # Strutture ricettive
      org/                  # Impostazioni org + GDPR
      team/                 # Team + inviti
    register/[slug]/        # Form registrazione pubblica (no auth)
    auth/login/             # Login
    auth/register/          # Signup nuova org
    invite/[token]/         # Accettazione invito team
    privacy/                # Privacy Policy (statica)
    terms/                  # Termini di Servizio (statici)
    unsubscribe/            # Pagina disiscrizione (pubblica)
  components/
    layout/
      top-nav.tsx           # Barra orizzontale fissa h-14
      contextual-sidebar.tsx # Sidebar sinistra w-56 contestuale
      dashboard-layout.tsx  # Layout principale (TopNav + Sidebar + main)
      header.tsx            # Header pagina con title/subtitle/actions
    ui/                     # Radix UI components wrappati
    flow-builder/           # Canvas flow builder + pannelli nodi
    email-builder/          # Canvas email builder drag&drop
    participants/           # ImportPreviewModal ecc.
  lib/
    db.ts                   # Prisma singleton (PrismaPg adapter)
    auth.ts                 # NextAuth config
    auth-helpers.ts         # requireMember, requireOwner
    email.ts                # Resend: sendEmail, sendEmailBatch, buildXxxEmail
    email-sender.ts         # resolveOrgFromAddress(orgId)
    email-builder.ts        # Builder email canvas
    ai.ts                   # Anthropic client, AI_MODEL, AGENT_MODELS
    agent-context.ts        # buildEventAgentContext, cache 5min
    audit.ts                # logAudit()
    rbac.ts                 # hasMinRole()
    utils.ts                # formatDate, formatDateTime, formatCurrency, cn
    event-flow-runtime.ts   # runEventFlowTrigger
    paperclip-client.ts     # Orchestratore agenti (opzionale)
    rbac.ts                 # hasMinRole(role, minRole)
prisma/
  schema.prisma             # Schema completo
  migrations/               # Migration SQL (init: 20260318000000_init)
  seed.ts                   # Demo data (org Phorma Demo, 3 eventi, 11 registrazioni)
docs/
  DEPLOY.md                 # Guida deploy step-by-step
  INFRASTRUCTURE.md         # Piano scalabilità 3 tier
.claude/
  commands/                 # Slash commands per sviluppo (skill Phorma)
```

---

## Database — Modelli chiave

### Multi-tenancy
Ogni dato è scoped su `organizationId`. MAI esporre dati cross-tenant. Auth enforce a livello applicativo via `requireOrg()`.

### Modelli principali

```
Organization (1)
  ├── UserOrganization[] (ruoli: VIEWER/MEMBER/ADMIN/OWNER)
  ├── Event[]
  ├── Hotel[]               (libreria strutture org)
  ├── OrgEmailSender[]      (mittenti email verificati)
  └── OrgEmailTemplate[]    (header/footer globale email)

Event (1)
  ├── Registration[]
  │     ├── RegistrationField[]
  │     ├── RoomAssignment[]
  │     ├── TravelEntry[]       (legacy, per-partecipante)
  │     └── unsubscribedAt?     (opt-out email)
  ├── FormField[]
  ├── EmailTemplate[]
  │     └── includeUnsubscribe  (toggle per B2C)
  ├── EmailSendLog[]
  │     └── EmailTrackingEvent[] (open/click/bounce via webhook)
  ├── EventGroup[]
  │     └── RouteGroupAssignment[] (percorsi viaggio assegnati)
  ├── HotelAllotment[]
  │     ├── RoomAssignment[]
  │     └── RouteStep[]         (accommodation step nei percorsi)
  ├── TravelResource[]          (risorse viaggio riutilizzabili)
  ├── TravelRoute[]             (percorsi compositi)
  │     ├── RouteStep[]
  │     └── RouteGroupAssignment[]
  ├── AgentProposal[]
  ├── AgentActionLog[]
  ├── AgentContextCache?        (TTL 5 min)
  ├── KpiConfig?
  ├── KpiSnapshot[]
  ├── FlowNodeInstance[]
  └── EventPlugin[]
```

### TravelRoute / RouteStep
- `TravelRoute`: percorso composito (nome, startingLocation, startingDate, maxExtraGuests, hidden, allowChangeRequests)
- `RouteStep`: tappa ordinata (stepType: TRAVEL|ACCOMMODATION, order, travelResourceId?, hotelAllotmentId?)
- `RouteGroupAssignment`: M:N tra TravelRoute e EventGroup

### OrgEmailSender
- Mittente email verificato via Resend Domains API
- `status`: PENDING | VERIFIED | FAILED
- `dnsRecords`: JSON array record DNS da aggiungere
- `isDefault`: true = usato come FROM per tutti gli invii org
- Un solo mittente default per org alla volta

---

## Auth System

### Session type
```typescript
session.user.id           // userId
session.user.organizationId  // orgId
session.user.orgName      // nome org
session.user.role         // "VIEWER"|"MEMBER"|"ADMIN"|"OWNER"
```

### Helper functions (`src/lib/auth-helpers.ts`)
```typescript
const auth = await requireMember()   // MEMBER+ (alias requirePlanner)
const auth = await requireOwner()    // OWNER only
// Returns: { orgId, userId, role } | { error: NextResponse }
if ("error" in auth) return auth.error

// Pattern standard in ogni API route:
const auth = await requireMember()
if ("error" in auth) return auth.error
const { orgId } = auth
const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } })
if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
```

### RBAC (`src/lib/rbac.ts`)
```typescript
hasMinRole(session?.user?.role, "ADMIN") // true se role >= ADMIN
// Gerarchia: VIEWER < MEMBER < ADMIN < OWNER
```

---

## Email System

### Invio email (`src/lib/email.ts`)
```typescript
// Singola email
sendEmail({ to, subject, html, from?, replyTo? })

// Batch (fino a 100 per chiamata, usa Resend Batch API)
sendEmailBatch([{ to, subject, html, from? }, ...])

// Unsubscribe
buildUnsubscribeUrl(registrationId, baseUrl?)  // HMAC-signed token
buildUnsubscribeToken(registrationId)

// Template builders (accettano unsubscribeUrl? opzionale)
buildRegistrationConfirmationEmail(data)
buildWaitlistConfirmationEmail(data)
buildWaitlistPromotionEmail(data)
buildEventReminderEmail(data)
buildCustomEmail(data)  // supporta builder JSON o plain text
```

### FROM address dinamico (`src/lib/email-sender.ts`)
```typescript
resolveOrgFromAddress(orgId)
// → cerca OrgEmailSender { isDefault: true, status: "VERIFIED" }
// → fallback a EMAIL_FROM env
// → fallback a "Phorma <noreply@phorma.it>"
```

### Invio massivo (send route)
- Usa `sendEmailBatch()` in batch sequenziali da 100
- Filtra `unsubscribedAt != null` prima dell'invio
- Log bulk con `prisma.emailSendLog.createMany()`
- `shouldIncludeUnsub = body.includeUnsubscribe || template.includeUnsubscribe`

### Webhook tracking
- `POST /api/webhooks/resend` — HMAC validation con `RESEND_WEBHOOK_SECRET`
- Scrive in `EmailTrackingEvent` (OPEN/CLICK/BOUNCE/SPAM/DELIVERED)
- Aggiorna `EmailSendLog.openedAt`, `clickedAt`, `bouncedAt`

---

## AI System

### Modelli (`src/lib/ai.ts`)
```typescript
AI_MODEL = "claude-sonnet-4-6"          // agente principale
AGENT_MODELS = {
  score_monitor: "claude-haiku-4-5-20251001",
  email_draft:   "claude-sonnet-4-6",
  report:        "claude-sonnet-4-6",
  email_tracker: "claude-haiku-4-5-20251001",
  form_audit:    "claude-haiku-4-5-20251001",
  flow_consultant: "claude-sonnet-4-6",
}
```

### Context RAG (`src/lib/agent-context.ts`)
```typescript
buildEventAgentContext(eventId, orgId)
// Cache DB 5 min (AgentContextCache)
// Include: event, registrations, formFields, emailTemplates, groups,
//          kpiConfig, kpiSnapshots, emailSendLogs, recentProposals,
//          orgBenchmark, hotelAllotments, travelResources
invalidateAgentContextCache(eventId)
```

### Pattern agentic loop (tool use)
```typescript
const response = await anthropic.messages.create({ tools, messages })
while (response.stop_reason === "tool_use") {
  const toolResults = await executeTools(response.content)
  messages.push({ role: "assistant", content: response.content })
  messages.push({ role: "user", content: toolResults })
  response = await anthropic.messages.create({ tools, messages })
}
```

### AgentProposal workflow
- Agenti propongono azioni → salvate come `AgentProposal { status: PENDING }`
- UI in `/events/[id]/agents` → ProposalsQueue → Approve/Reject/Modify
- Approve → esegue azione → salva `AgentActionLog`
- API count: `GET /api/events/[id]/ai/proposals/count` → badge sidebar

---

## Design System

### CSS Variables
```css
--genesis: #7060CC          /* Phorma brand purple */
--accent: #7060CC
--nav-height: 56px          /* TopNav h-14 */
--sidebar-width: 224px      /* w-56 */
--text-primary: ...
--text-secondary: ...
--text-tertiary: ...
--border: ...
--depth-1: ...              /* sfondo card */
--depth-3: ...              /* sfondo input */
```

### Componenti UI (src/components/ui/)
Tutti wrappati da Radix UI. Import sempre da `@/components/ui/xxx`.
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"        // variant: default|outline|ghost|destructive
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toaster"        // ATTENZIONE: firma specifica
```

### Toast — firma obbligatoria
```typescript
// ✅ CORRETTO
toast("Titolo", { description: "Dettaglio", variant: "destructive" })
toast("Salvato con successo")

// ❌ SBAGLIATO — non usare
toast({ title: "..." })
```

### Layout pagine autenticate
```typescript
<DashboardLayout>
  <Header title="..." subtitle="..." actions={<Button>...</Button>} />
  <div className="p-6 space-y-6">
    {/* contenuto */}
  </div>
</DashboardLayout>
```

### Convenzioni UI
- Testo UI sempre in **italiano**
- Card: sfondo bianco, border `rgba(109,98,243,0.14)`, shadow leggera
- Bottone primario: `#7060CC` (default variant)
- Badge stati: green=confirmed, yellow=pending, red=cancelled/error, purple=waitlist
- Loading: `<Loader2 className="animate-spin" />`
- Icone: sempre da `lucide-react`

---

## Convenzioni codice

### API Route standard
```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id } = await params
  // ...
  return NextResponse.json(data)
}
```

### Pagine client
```typescript
"use client"
import { useState, useEffect, useCallback } from "react"
// fetch data on mount con useEffect
// mutations con handler async + toast
// loading state con useState<boolean>
```

### Prisma patterns
```typescript
// Lookup con org-scope (SEMPRE)
const record = await prisma.model.findFirst({ where: { id, organizationId: auth.orgId } })

// Bulk insert
await prisma.model.createMany({ data: [...], skipDuplicates: true })

// Upsert su unique constraint
await prisma.model.upsert({ where: { unique_field: val }, create: {...}, update: {...} })
```

---

## Errori TS noti (ignorare)
- `src/lib/db.ts`: conflitto `@types/pg` vs `@prisma/adapter-pg` — non bloccante, build funziona
- `prisma/seed.ts`: stesso conflitto — non bloccante

---

## Workflow sviluppo

### Aggiungere una feature
1. Schema → `prisma/schema.prisma` → `npx prisma db push` → `npx prisma generate`
2. API routes → `src/app/api/...`
3. UI client component → `src/app/.../page.tsx` o componente
4. Navigation → aggiornare `contextual-sidebar.tsx` e/o `settings/layout.tsx`
5. TypeScript check → `npx tsc --noEmit`

### Variabili d'ambiente richieste
```
DATABASE_URL          Supabase pooler (porta 6543 in prod, 5432 locale)
NEXTAUTH_URL          URL app (http://localhost:3000 in dev)
NEXTAUTH_SECRET       Secret JWT (random 32+ chars in prod)
RESEND_API_KEY        Chiave Resend
RESEND_WEBHOOK_SECRET Secret webhook Resend
EMAIL_FROM            "Phorma <noreply@phorma.it>"
ANTHROPIC_API_KEY     Chiave Anthropic
```

### Credenziali demo
- Email: `demo@phorma.it` / Password: `demo1234`
- Org: `Phorma Demo`
