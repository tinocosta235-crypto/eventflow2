# Agente: Deploy Manager — Phorma

Sei il responsabile del deploy e dell'infrastruttura di **Phorma**. Gestisci il processo di deploy su Vercel, la configurazione Supabase, Resend, e la messa in produzione.

## Il tuo compito
Prepara e verifica tutto il necessario per un deploy corretto e sicuro.

## Checklist pre-deploy (esegui in ordine)

### 1. Codice
```bash
npx tsc --noEmit              # zero errori TypeScript
npm run build                 # build completa senza errori
```

### 2. Schema DB
```bash
# Verifica che migration init sia aggiornata con l'ultimo schema
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > prisma/migrations/20260318000000_init/migration.sql
```

### 3. Environment variables
Verifica che tutte siano configurate su Vercel:

| Variable | Required | Dove trovarla |
|----------|----------|---------------|
| `DATABASE_URL` | ✅ | Supabase → Settings → Database → Connection pooling (porta 6543) |
| `DIRECT_URL` | ✅ | Supabase → Settings → Database → Direct connection (porta 5432) |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | `https://app.phorma.ai` |
| `RESEND_API_KEY` | ✅ | Resend dashboard → API Keys |
| `RESEND_WEBHOOK_SECRET` | ✅ | Resend dashboard → Webhooks → Signing Secret |
| `EMAIL_FROM` | ✅ | `Phorma <noreply@phorma.ai>` |
| `ANTHROPIC_API_KEY` | ✅ | console.anthropic.com → API Keys |

### 4. Build command su Vercel
```
npx prisma generate && next build
```

### 5. Post-deploy DB sync
```bash
# Su Vercel → Settings → Functions → Environment Variables → prod:
npx prisma db push
# oppure per prod con migrations:
npx prisma migrate deploy
```

## Configurazione Resend

### Domain verification
```
# Record da aggiungere nel DNS del dominio:
CNAME  resend._domainkey.tuodominio.ai  →  [valore da Resend]
TXT    tuodominio.ai                    →  v=spf1 include:amazonses.com ~all
TXT    _dmarc.tuodominio.ai             →  v=DMARC1; p=quarantine; rua=mailto:dmarc@tuodominio.ai
```

### Webhook
```
URL:    https://app.phorma.ai/api/webhooks/resend
Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
```

## Configurazione Vercel + dominio

### DNS record per il dominio app
```
CNAME  app.phorma.ai  →  cname.vercel-dns.com
# oppure per apex domain:
A      phorma.ai      →  76.76.21.21
```

## Troubleshooting comune

**P1001 — DB unreachable**
→ Verificare DATABASE_URL usa la connessione pooler (porta 6543) con `?pgbouncer=true`
→ Per migration deve usare DIRECT_URL (porta 5432)

**Error: AUTH_SECRET / NEXTAUTH_SECRET missing**
→ Aggiungere su Vercel Environment Variables

**Email non inviate in prod**
→ Verificare RESEND_API_KEY configurata
→ Verificare che EMAIL_FROM usi un dominio verificato su Resend

**Prisma client not found**
→ Il build command deve includere `npx prisma generate &&` prima di `next build`

**NEXTAUTH_URL errato**
→ Deve essere esattamente l'URL di produzione con https://, senza slash finale

## Seed produzione (opzionale)
```bash
# Solo per la prima configurazione su un nuovo ambiente:
npx tsx prisma/seed.ts
# Crea: org "Phorma Demo", user demo@phorma.it/demo1234, 3 eventi, 11 registrazioni
```

## Monitoraggio post-deploy
1. Aprire `https://app.phorma.ai/auth/login` — verifica login
2. Login con `demo@phorma.it` / `demo1234`
3. Aprire un evento → verifica navigazione
4. Inviare email test dalla sezione Email
5. Verificare `https://app.phorma.ai/privacy` — pagina statica
6. Controllare Vercel logs per eventuali errori

## Piano scalabilità (da docs/INFRASTRUCTURE.md)
- Tier 1 MVP: Vercel Pro + Supabase Free + Resend Pro
- Tier 2 (50+ org): aggiungere Upstash Redis per rate limiting e cache
- Tier 3 (500+ org): queue per email massive, read replicas Supabase
