# Phorma — Deployment Guide

> Guida completa per il deploy in produzione su Vercel + Supabase.
> Stack: Next.js 16 · React 19 · Prisma 7 · Supabase PostgreSQL · NextAuth 5 · Resend · Anthropic Claude

---

## Prerequisiti

### Strumenti locali
- **Node.js 20+** — `node --version`
- **npm 10+** — incluso con Node 20
- **Git** — per push su GitHub
- **OpenSSL** — per generare segreti (`openssl` su macOS/Linux, Git Bash su Windows)

### Account richiesti
| Servizio | URL | Piano minimo |
|---|---|---|
| GitHub | github.com | Free |
| Vercel | vercel.com | Hobby (free) o Pro ($20/mo) |
| Supabase | supabase.com | Free (500 MB) |
| Resend | resend.com | Free (3k email/mese) |
| Anthropic | console.anthropic.com | Pay-as-you-go |

---

## Step 1: Supabase Setup

### 1.1 Crea il progetto

1. Vai su [supabase.com](https://supabase.com) → **New project**
2. Scegli l'organizzazione, inserisci nome e password DB (salvala in un password manager)
3. **Regione consigliata**: `eu-west-2 (London)` o `eu-central-1 (Frankfurt)` per utenti europei
4. Attendi il provisioning (~2 minuti)

### 1.2 Recupera le connection strings

Vai su **Project Settings → Database → Connection string**.

Hai bisogno di **due** URL distinti:

**DATABASE_URL** — connessione pooled via PgBouncer (usata dall'app in produzione):
```
postgresql://postgres.[project-ref]:[password]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
> Nota: porta **6543** e parametro `pgbouncer=true` sono obbligatori per il connection pooling serverless.

**DIRECT_URL** — connessione diretta (usata da `prisma migrate deploy`):
```
postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```
> Nota: porta **5432**, nessun parametro aggiuntivo.

> Su Supabase trovi entrambe le stringhe già precompilate nella tab **"Connection string"** selezionando **"Transaction"** (pooler) e **"Direct connection"**.

### 1.3 Connection pooling — configurazione Transaction mode

Supabase usa PgBouncer in **Transaction mode**, che è compatibile con le Serverless Functions di Vercel (ogni invocazione ottiene una connessione dal pool e la rilascia subito dopo).

Parametri pool consigliati (default Supabase, non serve modificarli):
- Pool size: 15
- Max client connections: 200

### 1.4 Row Level Security (nota)

Il progetto attualmente **non usa RLS** di PostgreSQL — la sicurezza multi-tenant è applicata a livello applicativo tramite `requireOrg()` in `src/lib/auth-helpers.ts`. Questo è un approccio valido per la fase MVP.

Se in futuro abiliti RLS su Supabase, ogni query Prisma dovrà impostare `SET LOCAL role = ...` nel transaction context — vedi la sezione Infrastructure per il migration path.

---

## Step 2: Resend Setup

### 2.1 Crea account e verifica dominio

1. Registrati su [resend.com](https://resend.com)
2. Vai su **Domains → Add Domain**
3. Inserisci il tuo dominio (es. `tuodominio.it`)
4. Resend mostrerà i DNS record da aggiungere

### 2.2 DNS record da aggiungere

Accedi al pannello DNS del tuo registrar (Cloudflare, Aruba, Register.it, ecc.) e aggiungi i seguenti record:

**SPF** (autorizza Resend a inviare per tuo conto):
```
Tipo:  TXT
Nome:  tuodominio.it   (o @)
Valore: v=spf1 include:amazonses.com ~all
```

**DKIM** (firma crittografica — Resend fornisce il valore esatto):
```
Tipo:  TXT
Nome:  resend._domainkey.tuodominio.it
Valore: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSI...  (fornito da Resend)
```

**DMARC** (policy per email non autenticate — consigliato):
```
Tipo:  TXT
Nome:  _dmarc.tuodominio.it
Valore: v=DMARC1; p=none; rua=mailto:dmarc@tuodominio.it
```
> Inizia con `p=none` (solo monitoraggio). Dopo 2-4 settimane di dati puliti puoi passare a `p=quarantine` o `p=reject`.

La verifica DNS può richiedere fino a 48 ore, ma di solito avviene in meno di 30 minuti con Cloudflare.

### 2.3 Crea API key

1. **API Keys → Create API Key**
2. Nome: `phorma-production`
3. Permission: **"Sending access"** (non full access)
4. Copia la chiave — verrà mostrata una sola volta

### 2.4 Configura webhook per email tracking

1. **Webhooks → Add Endpoint**
2. **Endpoint URL**: `https://app.tuodominio.it/api/webhooks/resend`
3. **Events da selezionare**:
   - `email.delivered`
   - `email.opened`
   - `email.clicked`
   - `email.bounced`
   - `email.complained`
4. Clicca **Create**
5. Copia il **Signing Secret** (inizia con `whsec_...`) — serve per `RESEND_WEBHOOK_SECRET`

> Il webhook è necessario per tracciare aperture e click nelle email. Senza di esso, le statistiche email nell'Analytics non si aggiornano.

---

## Step 3: GitHub + Vercel

### 3.1 Push su GitHub

```bash
# Se non hai ancora un repository remoto:
git remote add origin https://github.com/tuo-username/phorma.git
git branch -M main
git push -u origin main
```

### 3.2 Importa su Vercel

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Seleziona **"Import Git Repository"**
3. Scegli il repository `phorma` da GitHub
4. Autorizza Vercel ad accedere al repo

### 3.3 Configura le build settings

Nella schermata di configurazione del progetto su Vercel:

| Campo | Valore |
|---|---|
| Framework Preset | Next.js (auto-rilevato) |
| Root Directory | `./` (default) |
| Build Command | `npx prisma generate && next build` |
| Output Directory | `.next` (default) |
| Install Command | `npm install` (default) |

> **Importante**: il prefisso `npx prisma generate &&` nel build command è obbligatorio. Senza di esso, Prisma Client non viene generato nell'ambiente Vercel e il build fallisce.

---

## Step 4: Environment Variables su Vercel

Vai su **Project Settings → Environment Variables** e aggiungi tutte le seguenti variabili. Seleziona gli ambienti: Production, Preview, Development (o solo Production per le chiavi sensibili).

| Variabile | Valore / Formato | Obbligatoria | Dove ottenerla |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pwd]@...pooler...:6543/postgres?pgbouncer=true` | SI | Supabase → Settings → Database → Connection string (Transaction) |
| `DIRECT_URL` | `postgresql://postgres.[ref]:[pwd]@db.[ref].supabase.co:5432/postgres` | SI | Supabase → Settings → Database → Connection string (Direct) |
| `NEXTAUTH_SECRET` | Output di `openssl rand -base64 32` | SI | Generare in locale |
| `NEXTAUTH_URL` | `https://app.tuodominio.it` | SI | Il tuo dominio di produzione (senza trailing slash) |
| `RESEND_API_KEY` | `re_xxxxxxxxxx...` | SI | Resend → API Keys |
| `RESEND_WEBHOOK_SECRET` | `whsec_xxxxxxxxxx...` | SI | Resend → Webhooks → Signing Secret |
| `EMAIL_FROM` | `Phorma <noreply@tuodominio.it>` | SI | Il dominio deve corrispondere al dominio verificato su Resend |
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxxxxxxx...` | SI (per AI) | console.anthropic.com → API Keys |
| `PAPERCLIP_URL` | `https://paperclip.tuodominio.it` | NO | Solo se usi Paperclip |
| `PAPERCLIP_API_KEY` | `pk_xxxxxxxxxx...` | NO | Dashboard Paperclip → API Keys |
| `PAPERCLIP_INTERNAL_KEY` | Output di `openssl rand -hex 32` | NO | Generare in locale |

### Generare NEXTAUTH_SECRET in locale

```bash
openssl rand -base64 32
# Esempio output: K7mP9+xQzR2vN8wL5tY3hJ6cF0eA4dI1bG...
```

> **Sicurezza**: `NEXTAUTH_SECRET` deve essere una stringa casuale di almeno 32 caratteri. Non usare valori di esempio o stringhe prevedibili.

---

## Step 5: Database Migration

### Primo deploy — opzione A (consigliata): `prisma db push`

```bash
# Esegui in locale con DATABASE_URL puntante al DB Supabase di produzione
DATABASE_URL="postgresql://..." npx prisma db push
```

`prisma db push` è consigliata per il **primo deploy** perché:
- Crea lo schema direttamente senza gestione di file di migration
- Non richiede la cartella `prisma/migrations/` nel repo
- È più veloce e meno soggetta ad errori in fase iniziale
- Va bene finché non hai dati di produzione da proteggere

### Primo deploy — opzione B: `prisma migrate deploy`

```bash
# Richiede che i file di migration siano presenti in prisma/migrations/
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Usa `migrate deploy` quando:
- Hai già un DB con dati e vuoi applicare solo le migration delta
- Vuoi tracciabilità completa di ogni modifica schema nel tempo
- Sei in un team con pipeline CI/CD strutturata

### Seed dati demo (opzionale)

```bash
DATABASE_URL="postgresql://..." npm run seed
```

> Il seed crea un'organizzazione demo con eventi di esempio. Utile per testare l'app subito dopo il deploy.

### Eseguire migration da Vercel (CI/CD)

Per automatizzare le migration al deploy, aggiungi uno script in `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

Oppure usa un GitHub Action dedicato (vedi `INFRASTRUCTURE.md`).

---

## Step 6: Custom Domain

### 6.1 Aggiungi il dominio su Vercel

1. **Project Settings → Domains → Add**
2. Inserisci `app.tuodominio.it`
3. Vercel mostra il record DNS da configurare

### 6.2 Configura DNS

**Se usi un sottodominio** (consigliato, es. `app.tuodominio.it`):
```
Tipo:  CNAME
Nome:  app
Valore: cname.vercel-dns.com
```

**Se usi il dominio root** (es. `tuodominio.it`):
```
Tipo:  A
Nome:  @
Valore: 76.76.21.21
```

### 6.3 SSL

Il certificato SSL (HTTPS) viene emesso automaticamente da Vercel tramite Let's Encrypt entro pochi minuti dalla verifica DNS.

### 6.4 Aggiorna NEXTAUTH_URL

Dopo aver configurato il dominio, assicurati che `NEXTAUTH_URL` su Vercel corrisponda esattamente all'URL finale (es. `https://app.tuodominio.it`).

---

## Step 7: Post-Deploy Verification Checklist

Esegui questi test dopo ogni deploy in produzione:

### Autenticazione
- [ ] `/auth/login` — login con credenziali funziona
- [ ] `/auth/register` — registrazione crea organizzazione e reindirizza alla dashboard
- [ ] Logout funziona e invalida la sessione

### Core features
- [ ] Creazione nuovo evento tramite wizard (`/events/new`)
- [ ] Form builder funziona e salva i campi
- [ ] Pagina registrazione pubblica (`/register/[slug]`) accessibile senza login
- [ ] Invio email di conferma dopo registrazione (controlla inbox)

### Email tracking
- [ ] Invia email di test da un evento
- [ ] Verifica che il webhook Resend riceva eventi (Resend Dashboard → Webhooks → Logs)
- [ ] Controlla che `EmailTrackingEvent` venga creato nel DB

### AI Agents
- [ ] `/events/[id]/agents` — pagina agenti carica correttamente
- [ ] Chiama un agente e verifica che risponda (richiede `ANTHROPIC_API_KEY` valida)

### Performance
- [ ] Tempo di caricamento dashboard < 3 secondi
- [ ] Nessun errore 500 nei Vercel Function Logs

---

## Troubleshooting

### `P1001: Can't reach database server`

**Causa**: `DATABASE_URL` non corretta o connessione bloccata.

```
# Verifica che l'URL contenga:
# - Host: *.pooler.supabase.com
# - Porta: 6543
# - Parametro: ?pgbouncer=true
DATABASE_URL="postgresql://postgres.[ref]:[pwd]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Supabase → Settings → Database → verifica che "Connection pooling" sia abilitato.

### `AUTH_SECRET is missing`

**Causa**: `NEXTAUTH_SECRET` non impostata su Vercel.

```bash
# Genera un nuovo secret
openssl rand -base64 32
# Aggiungilo su Vercel: Project Settings → Environment Variables
```

### Email non inviate

**Causa 1**: `RESEND_API_KEY` non valida o scaduta.
```
# Verifica su Resend Dashboard → API Keys che la chiave sia attiva
```

**Causa 2**: `EMAIL_FROM` usa un dominio non verificato su Resend.
```
# EMAIL_FROM deve usare lo stesso dominio verificato in Resend → Domains
# Esempio corretto: "Phorma <noreply@tuodominio.it>"
# Esempio errato:  "Phorma <noreply@gmail.com>"
```

### `PrismaClientInitializationError` / Prisma Client non generato

**Causa**: Build command non include `prisma generate`.

Verifica in **Vercel → Project Settings → Build & Development Settings → Build Command**:
```
npx prisma generate && next build
```

### `NEXTAUTH_URL` mismatch (redirect loop o 401)

**Causa**: `NEXTAUTH_URL` non corrisponde all'URL effettivo dell'app.

```
# Deve essere l'URL HTTPS completo senza trailing slash
NEXTAUTH_URL="https://app.tuodominio.it"
# Non: "https://app.tuodominio.it/"
# Non: "http://app.tuodominio.it"
```

### Webhook Resend non funziona (tracking eventi non arrivano)

**Causa 1**: `RESEND_WEBHOOK_SECRET` errata.
```
# Verifica che il valore in Vercel corrisponda esattamente al Signing Secret
# mostrato in Resend → Webhooks → [endpoint] → Signing Secret
```

**Causa 2**: URL webhook non raggiungibile.
```
# Testa manualmente:
curl -X POST https://app.tuodominio.it/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Deve rispondere 400 (firma HMAC mancante), non 404
```

### Build fallisce con errori TypeScript

```bash
# Verifica in locale prima del push:
npx tsc --noEmit
npm run lint
```

Gli errori TS preesistenti in `src/lib/db.ts` (conflitto `@types/pg` vs `@prisma/adapter-pg`) sono noti e non bloccanti — il build di Next.js li ignora.
