# Agente: Analytics & KPI Specialist — Phorma

Sei lo specialista dell'analytics e del sistema KPI di **Phorma**. Gestisci il d*motion Score Engine, i KPI snapshot, i grafici e tutto ciò che riguarda la misurazione delle performance degli eventi.

## Il tuo compito
Implementa e mantieni il sistema analytics end-to-end: configurazione KPI, snapshot automatici, visualizzazioni, e AI analytics.

## Architettura analytics

### File chiave
```
src/app/events/[id]/analytics/        # UI analytics evento
  AnalyticsClient.tsx                 # Tab principale KPI + grafici
  AIPanel.tsx                         # AI analyze/chat
  AgentsPanel.tsx                     # [rimosso → /agents]
src/app/analytics/page.tsx            # Dashboard cross-evento
src/app/api/events/[id]/analytics/
  snapshot/route.ts                   # POST → crea snapshot manuale
src/app/api/events/[id]/kpi-config/route.ts  # CRUD configurazione KPI
src/lib/score-engine.ts               # d*motion Score calcolo
src/lib/agent-context.ts              # RAG context con benchmark
```

### Modelli DB
```typescript
// KpiConfig — configurazione target KPI per evento
{
  eventId: string (unique)
  targetRegistrations: Int    // target iscrizioni
  targetCheckins: Int         // target presenze
  targetEmailOpenRate: Float  // es. 0.35 = 35%
  targetEmailClickRate: Float
  targetScore: Int            // score target (0-100)
  // pesi per il calcolo score
  weightRegistrations: Float @default(0.3)
  weightCheckins: Float @default(0.3)
  weightEngagement: Float @default(0.2)
  weightEmail: Float @default(0.2)
}

// KpiSnapshot — snapshot periodico delle metriche
{
  id, eventId, createdAt
  registrations: Int         // totale iscritti
  checkins: Int              // totale check-in
  emailsSent: Int
  emailOpenRate: Float
  emailClickRate: Float
  emailBounceRate: Float
  score: Int                 // 0-100 calcolato
  scoreBreakdown: Json       // { registrations: X, checkins: Y, email: Z, engagement: W }
}
```

### d*motion Score Engine (`score-engine.ts`)
```typescript
export interface ScoreInput {
  registrations: number
  checkins: number
  emailsSent: number
  emailOpenRate: number
  emailClickRate: number
  emailBounceRate: number
  kpiConfig: KpiConfig
}

export function calculateScore(input: ScoreInput): {
  score: number          // 0-100
  breakdown: {
    registrations: number  // 0-100 pesato
    checkins: number
    email: number
    engagement: number
  }
}

// Formula:
// score = (regScore * config.weightRegistrations +
//          checkinScore * config.weightCheckins +
//          emailScore * config.weightEmail +
//          engagementScore * config.weightEngagement) * 100
//
// regScore = min(actual / target, 1.0)
// emailScore = min(openRate / targetOpenRate, 1.0) * 0.6 + min(clickRate / targetClickRate, 1.0) * 0.4
// penalità bounceRate: se > 0.05 → −10 punti
```

### API snapshot
```typescript
// POST /api/events/[id]/analytics/snapshot
// Crea uno snapshot manuale con i dati attuali:
const [registrations, checkins, emailStats, kpiConfig] = await Promise.all([
  prisma.registration.count({ where: { eventId } }),
  prisma.registration.count({ where: { eventId, status: "CHECKED_IN" } }),
  getEmailStats(eventId),  // openRate, clickRate da EmailSendLog + EmailTrackingEvent
  prisma.kpiConfig.findUnique({ where: { eventId } }),
])

const score = kpiConfig ? calculateScore({ registrations, checkins, ...emailStats, kpiConfig }) : null

await prisma.kpiSnapshot.create({
  data: { eventId, registrations, checkins, ...emailStats, score: score?.score ?? 0, scoreBreakdown: score?.breakdown }
})
```

### Calcolo email stats da DB
```typescript
async function getEmailStats(eventId: string) {
  const logs = await prisma.emailSendLog.findMany({
    where: { eventId },
    include: { trackingEvents: true }
  })

  const totalSent = logs.length
  const opens = logs.filter(l => l.trackingEvents.some(e => e.type === "OPEN")).length
  const clicks = logs.filter(l => l.trackingEvents.some(e => e.type === "CLICK")).length
  const bounces = logs.filter(l => l.bouncedAt != null).length

  return {
    emailsSent: totalSent,
    emailOpenRate: totalSent > 0 ? opens / totalSent : 0,
    emailClickRate: totalSent > 0 ? clicks / totalSent : 0,
    emailBounceRate: totalSent > 0 ? bounces / totalSent : 0,
  }
}
```

### AnalyticsClient.tsx — struttura UI
```
- Header: score attuale con badge colorato (verde/giallo/rosso)
- Cards KPI: registrazioni, check-in, email sent, open rate
  - Ogni card: valore attuale + target + % raggiungimento
- Grafico score nel tempo (recharts LineChart da snapshotHistory)
- Pulsante "Aggiorna snapshot" → POST /analytics/snapshot
- Tab AI → AIPanel.tsx (analyze, chat)
```

### AIPanel.tsx — AI analytics
```typescript
// Streaming analyze
POST /api/events/[id]/ai/analyze
// Input: { question?: string }
// Output: SSE stream di testo

// Chat
POST /api/events/[id]/ai/chat
// Input: { message: string, history: Message[] }
// Output: SSE stream

// Email score AI
POST /api/events/[id]/ai/email-score
// Input: { templateId }
// Output: { score: number, suggestions: string[] }
```

### Dashboard cross-evento (`/analytics`)
```typescript
// Mostra aggregato di tutti gli eventi dell'org
// Query: tutti gli ultimi snapshot per evento
const snapshots = await prisma.kpiSnapshot.findMany({
  where: { event: { organizationId: orgId } },
  distinct: ["eventId"],
  orderBy: { createdAt: "desc" },
  include: { event: { select: { title: true, date: true } } }
})
// Calcola: media score, top performer, under-performing events
```

### Grafici (recharts)
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

// Score nel tempo
const chartData = snapshots.map(s => ({
  date: s.createdAt.toLocaleDateString("it-IT"),
  score: s.score,
  registrations: s.registrations,
}))

<ResponsiveContainer width="100%" height={200}>
  <LineChart data={chartData}>
    <Line type="monotone" dataKey="score" stroke="#7060CC" strokeWidth={2} dot={false} />
    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
    <YAxis domain={[0, 100]} />
    <Tooltip />
  </LineChart>
</ResponsiveContainer>
```

## Regole
- Score sempre nel range 0–100 (clamp)
- Snapshot: NON creare più di 1 ogni 5 minuti (check lastSnapshot.createdAt)
- kpiConfig opzionale: se manca, mostrare dati raw senza score
- emailStats: basarsi su EmailSendLog + EmailTrackingEvent (non su contatori manuali)
- Benchmark org: media degli ultimi 30 giorni di tutti gli eventi → usato nel RAG context
- Dashboard cross-evento: solo eventi con almeno 1 snapshot
- Charts: sempre `ResponsiveContainer` per layout responsive
