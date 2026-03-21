# Phorma — Infrastructure & Scalability Plan

> Documento tecnico per architettura, scaling, sicurezza, monitoring e CI/CD.
> Aggiornato: marzo 2026

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────────┐
                        │              Browser / Client                │
                        └────────────────────┬────────────────────────┘
                                             │ HTTPS
                        ┌────────────────────▼────────────────────────┐
                        │         Vercel Edge CDN (Global)            │
                        │   Static assets · ISR pages · Edge cache    │
                        └────────────────────┬────────────────────────┘
                                             │
                        ┌────────────────────▼────────────────────────┐
                        │     Next.js Serverless Functions            │
                        │  App Router · API Routes · Server Actions   │
                        │         (Node.js 20 runtime)                │
                        └──────┬──────────────┬───────────────┬───────┘
                               │              │               │
               ┌───────────────▼──┐  ┌────────▼──────┐  ┌───▼────────────────┐
               │  Supabase PG     │  │  Resend API   │  │  Anthropic API     │
               │  PostgreSQL 15   │  │  Email send   │  │  Claude Sonnet/    │
               │  PgBouncer pool  │  │  + Webhooks   │  │  Haiku (Agents)    │
               │  (eu-west-2)     │  │  (tracking)   │  │                    │
               └──────────────────┘  └───────────────┘  └────────────────────┘
                                             │
                                    ┌────────▼──────────┐
                                    │  Phorma App       │
                                    │  (webhook recv.)  │
                                    │  /api/webhooks/   │
                                    │  resend           │
                                    └───────────────────┘

  Opzionale (Paperclip):
  ┌─────────────────────────────────────────────────────────────────┐
  │  Paperclip Microservice (porta 3100 — Docker)                   │
  │  Agent orchestrator · 4 agents per event · HTTP adapter         │
  │  → chiama /api/events/[id]/ai/agents/* via PAPERCLIP_INTERNAL_KEY│
  └─────────────────────────────────────────────────────────────────┘
```

### Flusso di una richiesta tipica

1. Browser invia richiesta HTTPS a Vercel CDN
2. Asset statici (JS/CSS/immagini) serviti direttamente dall'Edge — latenza < 20ms
3. Pagine dinamiche e API route eseguite come Serverless Function in Node.js 20
4. La funzione apre connessione dal pool PgBouncer di Supabase (max 100ms cold start)
5. Query Prisma eseguita, risultato serializzato e restituito al browser

---

## Tenancy Model

### Multi-tenancy a livello applicativo

Phorma implementa un modello **single-database multi-tenant**: tutti i dati di tutte le organizzazioni risiedono nello stesso schema PostgreSQL, isolati tramite `organizationId`.

```
Organization (tenant)
  └── Event (organizationId)
        ├── Registration (eventId)
        ├── EmailTemplate (eventId)
        ├── FormField (eventId)
        ├── KpiSnapshot (eventId)
        ├── AgentProposal (orgId + eventId)
        └── ...

Hotel (organizationId)
OrgEmailTemplate (organizationId)
UserOrganization (userId + organizationId)
```

### Applicazione del boundary tenant

Ogni API route che accede a dati mutabili chiama `requireOrg()` da `src/lib/auth-helpers.ts`:

```typescript
// Esempio pattern in ogni route handler
const auth = await requireOrg("MEMBER")
if ("error" in auth) return auth.error

// Tutte le query includono orgId come filtro
const events = await prisma.event.findMany({
  where: { organizationId: auth.orgId }
})
```

Ruoli disponibili: `VIEWER` · `MEMBER` · `OWNER`

### Path verso Row Level Security (futuro)

Quando si vorrà migrare a RLS PostgreSQL nativo:

1. Abilitare RLS su ogni tabella in Supabase
2. Creare policy `USING (organization_id = current_setting('app.org_id')::text)`
3. Wrappare ogni transazione Prisma con `SET LOCAL app.org_id = '${orgId}'`
4. Rimuovere i filtri `organizationId` ridondanti dalle query

Questo approccio aumenta la sicurezza ma aggiunge latenza per ogni query (~1ms per `SET LOCAL`).

---

## Database Scaling Plan

### Tier 1 — MVP (0–50 org, ~10k registrazioni)

**Piano**: Supabase Free

| Risorsa | Limite Free |
|---|---|
| Storage | 500 MB |
| CPU | Condivisa (2 vCPU burst) |
| RAM | 512 MB |
| Connessioni pooler | 60 |
| Backup | 1 backup manuale |

**Configurazione consigliata**:
- Usa `DATABASE_URL` con PgBouncer (porta 6543) per l'app
- Usa `DIRECT_URL` (porta 5432) solo per `prisma migrate deploy`
- Nessun Redis/cache aggiuntiva necessaria — la cache agent context è già in DB (`AgentContextCache`)

**Indici già presenti nello schema**:
```sql
-- AgentProposal
CREATE INDEX ON "AgentProposal"("eventId", "status");
CREATE INDEX ON "AgentProposal"("orgId", "status");
CREATE INDEX ON "AgentProposal"("eventId", "createdAt" DESC);

-- AgentActionLog
CREATE INDEX ON "AgentActionLog"("eventId", "createdAt" DESC);

-- EmailTrackingEvent
CREATE INDEX ON "EmailTrackingEvent"("emailSendLogId");
CREATE INDEX ON "EmailTrackingEvent"("eventId", "eventType");

-- FlowNodeInstance
CREATE INDEX ON "FlowNodeInstance"("eventId", "nodeId");
CREATE INDEX ON "FlowNodeInstance"("registrationId");

-- ManualActionTask
CREATE INDEX ON "ManualActionTask"("eventId", "status");
CREATE INDEX ON "ManualActionTask"("registrationId");
```

---

### Tier 2 — Growth (50–500 org, ~100k registrazioni)

**Piano**: Supabase Pro ($25/mese)

| Risorsa | Limite Pro |
|---|---|
| Storage | 8 GB |
| CPU | 4 vCPU dedicati |
| RAM | 2 GB |
| Connessioni pooler | 200 |
| Backup | Point-in-time recovery 7 giorni |

**Aggiunte consigliate**:

**1. Upstash Redis** (free tier disponibile) per:
- Sostituire `AgentContextCache` da DB a Redis (TTL 5 min, ~95% hit rate atteso)
- Rate limiting su endpoint AI e auth
- Session store opzionale (riduce query DB auth)

```bash
npm install @upstash/redis @upstash/ratelimit
```

```typescript
// Esempio: cache context agente in Redis invece di DB
import { Redis } from "@upstash/redis"
const redis = Redis.fromEnv()
const cached = await redis.get(`agent-ctx:${eventId}`)
```

**2. Indici aggiuntivi da aggiungere** con la crescita dei dati:

```sql
-- Query frequenti per analytics (KpiSnapshot con range temporali)
CREATE INDEX ON "KpiSnapshot"("eventId", "takenAt" DESC);

-- Masterlist: filtro per status e data iscrizione
CREATE INDEX ON "Registration"("eventId", "status");
CREATE INDEX ON "Registration"("eventId", "createdAt" DESC);

-- Email send log per statistiche aggregate
CREATE INDEX ON "EmailSendLog"("eventId", "sentAt" DESC);
CREATE INDEX ON "EmailSendLog"("resendId");  -- webhook matching

-- Ricerca iscritti per email (già unique constraint, ma utile esplicitarlo)
CREATE INDEX ON "Registration"("email");
```

**3. Read Replicas** (disponibili su Supabase Pro):
- Abilita almeno 1 read replica nella stessa regione
- Usa la replica per le query di analytics (`KpiSnapshot`, `EmailSendLog`, aggregati)
- Usa il primary per tutte le scritture

---

### Tier 3 — Scale (500+ org, 1M+ registrazioni)

**Piano**: Supabase Business ($599/mese) o self-hosted con Neon

**Strategie di scaling**:

**Table partitioning** per le tabelle che crescono illimitatamente:

```sql
-- Partiziona KpiSnapshot per mese (takenAt)
ALTER TABLE "KpiSnapshot" PARTITION BY RANGE ("takenAt");
CREATE TABLE "KpiSnapshot_2026_q1" PARTITION OF "KpiSnapshot"
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

-- Partiziona EmailSendLog per eventId (hash)
ALTER TABLE "EmailSendLog" PARTITION BY HASH ("eventId");
```

**Background job queue** per campagne email massive:

```
POST /api/events/[id]/emails/campaigns/send
  → Crea job in coda (Upstash QStash o Trigger.dev)
     → Worker: batch 50 email/volta con retry
        → Resend API (rate limit: 10 req/s sul piano Pro)
           → Webhook: tracking eventi
```

```
Flusso asincrono:
API → QStash Queue → /api/worker/email-batch → Resend (×N batches)
```

**CDN per asset email**:
- Upload immagini email su Supabase Storage o Cloudflare R2
- URL pubblici nel builder email invece di data URIs inline

---

## Vercel Scaling Plan

### Tier 1 — MVP

**Piano**: Vercel Hobby (free) per testing · Vercel Pro ($20/mese) per produzione con dominio custom

Limiti Hobby da conoscere:
- Nessun custom domain su piano Hobby (solo `*.vercel.app`)
- Serverless Function timeout: 10 secondi (insufficiente per agenti AI)
- Bandwidth: 100 GB/mese

**Vercel Pro** è necessario per:
- Custom domain (`app.tuodominio.it`)
- Function timeout fino a 300 secondi (necessario per AI agents con tool use loop)
- Team collaboration

### Tier 2 — Growth

**Vercel Pro** con aggiunte:
- **Vercel Analytics** (incluso nel Pro): Web Vitals, performance real-user
- **Edge Config**: feature flags per A/B testing o rollout graduale
- **Function timeout configurato per AI routes**: aggiungere in `next.config.js`:

```javascript
// next.config.js
module.exports = {
  // Massimo timeout per route AI (solo Vercel Pro/Enterprise)
  serverExternalPackages: ['@anthropic-ai/sdk'],
}
```

Aggiungere a ogni route AI-intensive:
```typescript
// In ogni file route.ts degli agent
export const maxDuration = 120 // secondi (Vercel Pro: max 300s)
```

### Tier 3 — Scale / Alternativa Self-hosted

Se i costi Vercel diventano proibitivi (tipicamente > $500/mese), migrazione su:

**Opzione A — Fly.io** (containerizzato):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npx prisma generate && npm run build
CMD ["npm", "start"]
```

**Opzione B — Hetzner VPS** (bare metal):
- CX21 (2 vCPU, 4 GB RAM, €5.77/mese) — sufficiente fino a 10k req/giorno
- PM2 per process management, Nginx come reverse proxy
- GitHub Actions per deploy automatico via SSH

---

## Email Scaling Plan (Resend)

### Tier 1 — MVP
- **Resend Free**: 3.000 email/mese, 100 email/giorno
- Sufficiente per testing e primi clienti (<10 org, eventi piccoli)
- Invio sincrono con `Promise.all()` — funziona per < 100 destinatari

### Tier 2 — Growth
- **Resend Pro**: $20/mese — 50.000 email/mese, rate limit 10 req/s
- Invio ancora sincrono per campagne < 200 destinatari
- Per campagne più grandi: implementare batch con delay

```typescript
// Invio batch sincrono (attuale) — ok fino a ~100 destinatari
const results = await Promise.all(
  recipients.map(r => resend.emails.send({ ... }))
)

// Invio batch asincrono (da implementare per >200 destinatari)
for (const chunk of chunks(recipients, 50)) {
  await Promise.all(chunk.map(r => resend.emails.send({ ... })))
  await delay(1000) // rispetta rate limit 10 req/s
}
```

### Tier 3 — Scale
- **Resend Custom** o migrazione a **AWS SES** ($0.10 per 1000 email)
- Implementare queue architecture completa:

```
POST /api/events/[id]/emails/campaigns/send
         │
         ▼
  Upstash QStash
  (job persistente)
         │
         ▼
  /api/worker/email-batch
  (eseguito ogni N sec)
         │
   batch da 50 email
         │
         ▼
    Resend API
         │
         ▼
  /api/webhooks/resend
  (tracking aperto/click)
```

**Deliverability best practice**:
- Warm-up IP graduale: inizia con 100 email/giorno, raddoppia ogni settimana
- Monitora bounce rate: se > 5% → pausa e pulisci lista
- Imposta `List-Unsubscribe` header (già gestito da `includeUnsubscribe` nel template)

---

## AI Costs Plan (Anthropic)

### Modelli in uso

| Modello | Uso | Input cost | Output cost |
|---|---|---|---|
| `claude-sonnet-4-6` | Agenti principali, chat | $3 / 1M token | $15 / 1M token |
| `claude-haiku-4-5-20251001` | Agenti fast (form audit, quick analysis) | $0.25 / 1M token | $1.25 / 1M token |

### Stime costo per chiamata agente

```
Agente Report (Sonnet):
  Prompt system + context: ~3.000 token input
  Tool use loop (2-3 cicli): ~2.000 token output
  ≈ $0.009 + $0.030 = ~$0.039 per chiamata

Agente Form Audit (Haiku):
  Prompt + contesto: ~2.000 token input
  Output: ~1.500 token
  ≈ $0.0005 + $0.0019 = ~$0.0024 per chiamata

Agente Email Draft (Sonnet):
  Prompt + thread: ~2.500 token input
  Bozza email: ~800 token output
  ≈ $0.0075 + $0.012 = ~$0.020 per chiamata
```

### Proiezioni di costo

| Utilizzo | Chiamate/giorno | Costo/giorno | Costo/mese |
|---|---|---|---|
| MVP (< 10 org attive) | 20 | ~$0.40 | ~$12 |
| Growth (50 org) | 100 | ~$2.00 | ~$60 |
| Scale (500 org) | 1.000 | ~$20.00 | ~$600 |

### Cost control a scala

1. **Cache agent context**: già implementata con TTL 5 minuti in `AgentContextCache` — riduce token per richiesta
2. **Limite per org/mese**: aggiungere contatore in `AgentActionLog` e bloccare se > soglia configurabile
3. **Haiku per task semplici**: usare Haiku invece di Sonnet per analisi rapide (risparmio 90%)
4. **Prompt compressione**: trimmare il context a 2.000 token per org poco attive (ridurre `buildFreshContext()`)
5. **Caching output**: per report settimanali, cachare il risultato e non rieseguire se i dati non cambiano

---

## Security Considerations

### 1. Autenticazione

- NextAuth 5 con **JWT strategy** — nessun DB session store (stateless, scalabile)
- Secret: `NEXTAUTH_SECRET` deve essere randomico 32+ char (`openssl rand -base64 32`)
- Token scadono dopo 30 giorni (configurabile in `src/lib/auth.ts`)
- Password hashate con **bcryptjs** a 10 salt rounds

### 2. Isolamento tenant

- Ogni query DB include `organizationId` come filtro esplicito
- `requireOrg()` verifica che l'utente appartenga all'organizzazione prima di ogni operazione
- Non esiste nessun endpoint che restituisce dati cross-tenant (eccetto `/api/org/ai/proposals` che è org-scoped)

### 3. Autorizzazione API

Pattern standard applicato su tutte le route mutabili:

```typescript
// VIEWER: solo lettura
const auth = await requireOrg("VIEWER")

// MEMBER: lettura + scrittura dati evento
const auth = await requireOrg("MEMBER")  // alias: requireMember()

// OWNER: configurazione org, inviti, billing
const auth = await requireOrg("OWNER")  // alias: requireOwner()
```

### 4. Webhook security (Resend)

Il webhook `/api/webhooks/resend` verifica la firma HMAC:

```typescript
// HMAC-SHA256 verification con RESEND_WEBHOOK_SECRET
const signature = req.headers.get("svix-signature")
// Verifica che il payload non sia stato manomesso in transit
```

Non impostare `RESEND_WEBHOOK_SECRET` rende il webhook aperto a chiunque.

### 5. Token unsubscribe

I link di unsubscribe nelle email usano token HMAC-signed basati sull'`email` del destinatario — non richiedono storage DB aggiuntivo.

### 6. Secrets management

- Non committare mai `.env` nel repo (già in `.gitignore`)
- Usare Vercel Environment Variables per la produzione
- Ruotare `NEXTAUTH_SECRET` invalida tutte le sessioni attive — pianificare manutenzione

### 7. Rate limiting (da implementare)

Endpoint da proteggere prioritariamente:

```typescript
// Installare: npm install @upstash/ratelimit @upstash/redis

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 req/min per IP
})

// Applicare su: /auth/login, /auth/register
// Applicare su: /api/events/[id]/ai/agents/* (limite per org)
```

### 8. Security headers

Aggiungere in `next.config.js`:

```javascript
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
]
```

### 9. CORS

Le API route di Next.js sono disponibili solo dallo stesso dominio per default. Il webhook Resend usa HMAC per l'autenticazione invece di CORS.

---

## Monitoring & Observability

### Tier 1 — MVP (zero cost)

**Vercel Logs** (built-in):
- Dashboard → Project → Functions → Logs
- Filtra per: errori 500, latenza > 3s, route AI

**Supabase Dashboard**:
- Reports → API Requests: query lente, errori DB
- Database → Query Performance: indici mancanti

**Resend Dashboard**:
- Email analytics: open rate, click rate, bounce rate
- Webhook Logs: verifica ricezione eventi tracking

### Tier 2 — Growth

**Sentry** per error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.server.config.ts (auto-generato dal wizard)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% delle richieste per performance tracking
  environment: process.env.NODE_ENV,
})
```

Costo: Sentry Free (5k errori/mese) · Sentry Team ($26/mese, 50k errori)

**Health endpoint** — creare `/app/api/health/route.ts`:

```typescript
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      db: "connected",
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 })
  }
}
```

**Uptime monitoring** gratuito: [uptimerobot.com](https://uptimerobot.com) (monitora `/api/health` ogni 5 min, notifica via email/Slack se down)

### Tier 3 — Scale

- **Datadog** APM: distributed tracing, dashboards custom, alerting
- **Grafana + Prometheus** (self-hosted): metriche custom, alert rule:
  - DB latency p99 > 500ms → alert
  - Email bounce rate > 5% → alert
  - Error rate > 1% nelle ultime 5 min → alert
  - Agent API timeout > 10% → alert

---

## Backup Strategy

### Supabase Free
- Backup manuale via Dashboard → Database → Backups
- Retention: non garantita (piano Free)
- **Raccomandazione**: eseguire export manuale prima di ogni migrazione schema

### Supabase Pro
- Point-in-time recovery fino a **7 giorni**
- Backup automatici giornalieri
- Restore in ~10 minuti

### Supabase Business
- PITR fino a **30 giorni**
- Backup cross-region opzionale

### Export critico via cron (consigliato per tutti i tier)

Esporta giornalmente le tabelle critiche su Supabase Storage:

```typescript
// Cron job giornaliero (Vercel Cron o GitHub Actions)
// Esporta: organizations, events, registrations

const critical = await prisma.registration.findMany({
  where: { createdAt: { gte: yesterday } },
  include: { event: true, fields: true }
})

// Upload su Supabase Storage
await supabase.storage
  .from("backups")
  .upload(`registrations-${date}.json`, JSON.stringify(critical))
```

Configura in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## CI/CD Pipeline

### Attuale (automatico con Vercel)

- Push su `main` → Vercel build e deploy automatico in produzione
- Push su branch → Vercel crea Preview deployment su URL univoco
- Nessuna configurazione aggiuntiva richiesta

### GitHub Actions consigliato

Crea il file `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ──────────────────────────────────────────────
  # Job 1: Lint + TypeCheck
  # ──────────────────────────────────────────────
  lint-typecheck:
    name: Lint & TypeCheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npm run lint

  # ──────────────────────────────────────────────
  # Job 2: Database migration (solo su main)
  # ──────────────────────────────────────────────
  migrate:
    name: Run DB migrations
    runs-on: ubuntu-latest
    needs: lint-typecheck
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DIRECT_URL }}

  # ──────────────────────────────────────────────
  # Job 3: Vercel deploy (gestito automaticamente)
  # Vercel si aggancia a GitHub — nessun job esplicito necessario
  # Lasciare questo commento per documentazione
  # ──────────────────────────────────────────────
```

**GitHub Secrets da configurare** (Settings → Secrets → Actions):
- `DIRECT_URL` — connessione diretta Supabase per migrate

> Le variabili di produzione rimangono su Vercel, non in GitHub Secrets — eccetto `DIRECT_URL` necessaria per le migration.

### Branching strategy consigliata

```
main          → produzione (deploy automatico Vercel)
develop       → staging (deploy su URL preview Vercel)
feature/*     → sviluppo feature (PR verso develop)
hotfix/*      → fix urgenti (PR direttamente verso main)
```

---

## Domain Configuration Guide

### Record DNS completo per produzione

Sostituisci `tuodominio.it` e `app` con i tuoi valori reali.

```
# ──────────────────────────────────────────────
# App (Vercel)
# ──────────────────────────────────────────────
Tipo:  CNAME
Nome:  app
Valore: cname.vercel-dns.com
TTL:   300

# Oppure per root domain (apex):
Tipo:  A
Nome:  @
Valore: 76.76.21.21
TTL:   300

# ──────────────────────────────────────────────
# Email — SPF (autorizza Resend/Amazon SES)
# ──────────────────────────────────────────────
Tipo:  TXT
Nome:  @
Valore: "v=spf1 include:amazonses.com ~all"
TTL:   3600

# ──────────────────────────────────────────────
# Email — DKIM (firma crittografica Resend)
# Il valore p=... è fornito da Resend Dashboard → Domains
# ──────────────────────────────────────────────
Tipo:  TXT
Nome:  resend._domainkey
Valore: "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN..."
TTL:   3600

# ──────────────────────────────────────────────
# Email — DMARC (policy per email non autenticate)
# p=none = solo monitoraggio; dopo 30 gg passare a p=quarantine
# ──────────────────────────────────────────────
Tipo:  TXT
Nome:  _dmarc
Valore: "v=DMARC1; p=none; rua=mailto:dmarc@tuodominio.it; ruf=mailto:dmarc@tuodominio.it; fo=1"
TTL:   3600

# ──────────────────────────────────────────────
# MX (solo se vuoi ricevere email su tuodominio.it)
# Non obbligatorio se usi solo Resend per invio
# ──────────────────────────────────────────────
Tipo:  MX
Nome:  @
Valore: 10 mail.tuodominio.it
TTL:   3600
```

### Verifica DNS

Dopo aver aggiunto i record, verifica con:

```bash
# Verifica SPF
dig TXT tuodominio.it +short

# Verifica DKIM
dig TXT resend._domainkey.tuodominio.it +short

# Verifica DMARC
dig TXT _dmarc.tuodominio.it +short

# Verifica CNAME app
dig CNAME app.tuodominio.it +short
```

Oppure usa [MXToolbox](https://mxtoolbox.com) per verifica visuale.

---

## Launch Checklist

### Infrastruttura
- [ ] Supabase progetto creato nella regione corretta (eu-west-2 o eu-central-1)
- [ ] DATABASE_URL (pooler :6543) e DIRECT_URL (:5432) salvate in Vercel
- [ ] Vercel progetto importato da GitHub con build command corretto
- [ ] Custom domain configurato su Vercel e HTTPS attivo

### DNS & Email
- [ ] Dominio app punta a Vercel (CNAME o A record)
- [ ] Record SPF aggiunto (TXT `v=spf1 include:amazonses.com ~all`)
- [ ] Record DKIM aggiunto (TXT `resend._domainkey...`)
- [ ] Record DMARC aggiunto (TXT `_dmarc...`)
- [ ] Dominio verificato in Resend Dashboard (status: Active)
- [ ] Webhook Resend configurato su URL produzione con tutti e 5 gli eventi

### Variabili d'ambiente
- [ ] `DATABASE_URL` impostata su Vercel
- [ ] `DIRECT_URL` impostata su Vercel
- [ ] `NEXTAUTH_SECRET` impostata (openssl rand -base64 32 — NON usare valori di esempio)
- [ ] `NEXTAUTH_URL` corrisponde all'URL di produzione esatto (https, no trailing slash)
- [ ] `RESEND_API_KEY` impostata
- [ ] `RESEND_WEBHOOK_SECRET` impostata
- [ ] `EMAIL_FROM` usa il dominio verificato su Resend
- [ ] `ANTHROPIC_API_KEY` impostata

### Database
- [ ] `prisma db push` o `prisma migrate deploy` eseguito sul DB di produzione
- [ ] Schema verificato: tabelle presenti su Supabase → Table Editor
- [ ] Seed eseguito (se necessario per demo)

### Test funzionali
- [ ] Login funziona su URL produzione (`/auth/login`)
- [ ] Registrazione nuovo account crea organizzazione
- [ ] Creazione evento tramite wizard completata
- [ ] Form builder: aggiunta campo e salvataggio
- [ ] Pagina registrazione pubblica (`/register/[slug]`) accessibile senza login
- [ ] Email di conferma ricevuta dopo registrazione (controlla spam)
- [ ] Webhook: apri l'email di test, verifica che `EmailTrackingEvent` venga creato in DB

### AI Agents
- [ ] `/events/[id]/agents` carica senza errori
- [ ] Almeno un agente eseguito e risposta ricevuta
- [ ] Proposta agente creata e visibile in ProposalsQueue

### Sicurezza
- [ ] `NEXTAUTH_SECRET` è una stringa casuale (non "your-secret-here" o simili)
- [ ] `.env` non è nel repository (`git ls-files .env` deve restituire vuoto)
- [ ] Nessuna chiave API hardcoded nel codice (`git grep "sk-ant-" src/` deve essere vuoto)
- [ ] HTTPS attivo (certificato SSL emesso da Vercel)

### Legale (pre-lancio)
- [ ] Privacy Policy accessibile (es. `/privacy`) — obbligatoria GDPR per utenti EU
- [ ] Cookie Policy (se usi analytics o tracking)
- [ ] Termini di Servizio accessibili (es. `/terms`)
- [ ] Link unsubscribe nelle email transazionali (gestito da `includeUnsubscribe` nei template)
- [ ] Dati personali degli iscritti trattati conformemente al GDPR (sede dati: EU — Supabase eu-west-2)

### Performance
- [ ] Lighthouse score > 80 sulla home page
- [ ] Nessuna query N+1 visibile nei Supabase logs
- [ ] Cold start Serverless Function < 2 secondi (verifica su Vercel → Functions → Logs)
