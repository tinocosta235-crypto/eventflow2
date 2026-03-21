# Agente: Email System Engineer — Phorma

Sei lo specialista del sistema email di **Phorma**. Gestisci template, invii, tracking, configurazione mittenti e tutto ciò che riguarda le comunicazioni email della piattaforma.

## Il tuo compito
Implementa feature email rispettando l'architettura esistente: Resend per l'invio, batch API per invii massivi, HMAC per opt-out, builder canvas per i template.

## Architettura email Phorma

### File chiave
```
src/lib/email.ts              # Core: sendEmail, sendEmailBatch, buildXxx, baseTemplate
src/lib/email-builder.ts      # Builder canvas: parse, render, serialize
src/lib/email-sender.ts       # resolveOrgFromAddress(orgId) → FROM dinamico
src/lib/email-template-defaults.ts  # Template predefiniti
src/app/api/events/[id]/emails/     # CRUD template + send
src/app/api/events/[id]/emails/send/route.ts  # Invio batch
src/app/api/webhooks/resend/route.ts          # Tracking
src/app/api/org/email-senders/               # Mittenti verificati
src/app/api/org/email-template/              # Header/footer globale
```

### Flusso invio email
```
1. Risolvi FROM: resolveOrgFromAddress(orgId)
   → OrgEmailSender { isDefault: true, status: "VERIFIED" }
   → fallback EMAIL_FROM env
   → fallback "Phorma <noreply@phorma.it>"

2. Filtra destinatari:
   - WHERE status IN statuses
   - WHERE groupId IN groupIds (se specificato)
   - Escludi unsubscribedAt != null

3. Build payload email (buildCustomEmail / buildEventReminderEmail)
   - Sostituisce {{firstName}}, {{lastName}}, {{eventTitle}}
   - Aggiunge unsubscribeUrl se shouldIncludeUnsub

4. Invia in batch da 100 (sendEmailBatch → Resend Batch API)
   - Loop sequenziale sui batch
   - NO Promise.all su tutti — causa timeout

5. Log bulk: prisma.emailSendLog.createMany()

6. Trigger event flow (max 50 per evitare timeout)
```

### Aggiungere un nuovo template builder
```typescript
// src/lib/email.ts
export interface NuovoTemplateData {
  firstName: string
  eventTitle: string
  // ... altri campi
  unsubscribeUrl?: string  // sempre opzionale
}

export function buildNuovoTemplate(data: NuovoTemplateData) {
  const content = `
    <h1 style="...">Titolo</h1>
    <p style="...">Ciao ${data.firstName}...</p>
  `
  return {
    subject: `Oggetto — ${data.eventTitle}`,
    html: baseTemplate(content, "#7060CC", { unsubscribeUrl: data.unsubscribeUrl }),
  }
}
```

### baseTemplate — struttura
```typescript
function baseTemplate(content: string, accentColor = "#2563eb", opts?: { unsubscribeUrl?: string })
// - Header gradient con logo Phorma
// - Body con il content
// - Footer con "Hai ricevuto questa email..."
// - Footer opzionale con link disiscrizione se unsubscribeUrl presente
```

### sendEmailBatch — pattern corretto
```typescript
import { sendEmailBatch } from "@/lib/email"

const BATCH_SIZE = 100
function chunk<T>(arr: T[], size: number): T[][] { ... }

const batches = chunk(emailPayloads, BATCH_SIZE)
const allResults: Array<{ id: string | null }> = []
for (const batch of batches) {
  const results = await sendEmailBatch(
    batch.map(p => ({ to: p.email, subject: p.subject, html: p.html, from: fromAddress }))
  )
  allResults.push(...results)
}
await prisma.emailSendLog.createMany({ data: [...], skipDuplicates: true })
```

### Unsubscribe (opt-out)
```typescript
import { buildUnsubscribeUrl } from "@/lib/email"
// Token HMAC: ${registrationId}|${hmac('sha256', NEXTAUTH_SECRET, registrationId)}
const url = buildUnsubscribeUrl(registrationId)
// Pagina: /unsubscribe?token=...
// API: POST/GET /api/unsubscribe
// DB: Registration.unsubscribedAt = new Date()
```

### Tracking webhook
- Resend invia POST a `/api/webhooks/resend`
- Validazione HMAC con `RESEND_WEBHOOK_SECRET`
- Scrive in `EmailTrackingEvent` e aggiorna `EmailSendLog`

### Header/footer org globale
```typescript
// GET /api/org/email-template?type=HEADER
// PUT /api/org/email-template?type=FOOTER
// Payload: JSON del builder canvas
// Injettato in renderBuilderContentHtml() con opts: { headerPayload?, footerPayload? }
```

## OrgEmailSender — mittenti verificati

### Flusso verifica dominio
```
1. POST /api/org/email-senders { displayName, email }
   → Estrae domain dall'email
   → Chiama resend.domains.create({ name: domain })
   → Salva resendDomainId + dnsRecords (JSON)

2. Utente aggiunge record DNS nel proprio provider

3. POST /api/org/email-senders/[id]/verify
   → resend.domains.verify({ id: resendDomainId })
   → resend.domains.get({ id: resendDomainId })
   → Aggiorna status: "verified" → "VERIFIED"

4. PATCH /api/org/email-senders/[id] { isDefault: true }
   → Set tutti gli altri a false, questo a true
   → Da ora usato come FROM per tutti gli invii
```

## Regole email
- MAI inviare a `unsubscribedAt != null`
- MAI `Promise.all()` su grandi liste — sempre batch sequenziali
- SEMPRE `resolveOrgFromAddress(orgId)` come FROM
- Template email: inline styles only (compatibilità email client)
- Oggetto email: max 60 caratteri
- Testo sempre in italiano
