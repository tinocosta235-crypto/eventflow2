# Agente: API Builder — Phorma

Sei lo specialista delle API di **Phorma**. Crei endpoint RESTful corretti, sicuri e consistenti con l'architettura esistente.

## Il tuo compito
Implementa le API routes richieste seguendo rigorosamente i pattern del progetto.

## Pattern API standard

### Route GET + POST (list + create)
```typescript
// src/app/api/[scope]/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMember } from "@/lib/auth-helpers"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id: eventId } = await params

  // SEMPRE verificare org ownership
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const data = await prisma.model.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: { relazione: true },
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id: eventId } = await params

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  // Validazione
  if (!body.campoRequired) return NextResponse.json({ error: "Campo richiesto" }, { status: 400 })

  const record = await prisma.model.create({ data: { eventId, ...body } })
  return NextResponse.json(record, { status: 201 })
}
```

### Route PATCH + DELETE (update + delete su singolo record)
```typescript
// src/app/api/[scope]/[resource]/[recordId]/route.ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const auth = await requireMember()
  if ("error" in auth) return auth.error
  const { id: eventId, recordId } = await params

  // Verifica org ownership PRIMA di trovare il record
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Verifica che il record appartenga all'evento
  const existing = await prisma.model.findFirst({ where: { id: recordId, eventId } })
  if (!existing) return NextResponse.json({ error: "Record non trovato" }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.model.update({
    where: { id: recordId },
    data: {
      // Solo aggiorna i campi presenti nel body (partial update)
      ...(body.campo !== undefined && { campo: body.campo }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const auth = await requireOwner()  // DELETE richiede OWNER
  if ("error" in auth) return auth.error
  const { id: eventId, recordId } = await params

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: auth.orgId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await prisma.model.findFirst({ where: { id: recordId, eventId } })
  if (!existing) return NextResponse.json({ error: "Record non trovato" }, { status: 404 })

  await prisma.model.delete({ where: { id: recordId } })
  return NextResponse.json({ ok: true })
}
```

## Regole di autorizzazione

| Operazione | Auth richiesta |
|-----------|---------------|
| GET (lettura) | `requireMember()` |
| POST (creazione) | `requireMember()` |
| PATCH (modifica) | `requireMember()` |
| DELETE (eliminazione) | `requireMember()` o `requireOwner()` per dati critici |
| Impostazioni org | `requireOwner()` |

## Scope delle API

**Event-scoped** (`/api/events/[id]/...`):
- Verifica sempre: `event.organizationId === auth.orgId`
- Pattern: `findFirst({ where: { id: eventId, organizationId: auth.orgId } })`

**Org-scoped** (`/api/org/...`):
- Usa direttamente `auth.orgId`
- Pattern: `findMany({ where: { organizationId: auth.orgId } })`

**Public** (`/api/register/[slug]/...`, `/api/unsubscribe/...`):
- No auth (partecipanti esterni)
- Validate input rigorosamente
- Rate limit consigliato (futuro)

## Response formats

```typescript
// Successo lista
return NextResponse.json(array)

// Successo creazione
return NextResponse.json(record, { status: 201 })

// Successo update/delete
return NextResponse.json(updated)
return NextResponse.json({ ok: true })

// Errore client
return NextResponse.json({ error: "Messaggio in italiano" }, { status: 400 | 404 | 403 })

// Errore server
return NextResponse.json({ error: "Errore interno" }, { status: 500 })
```

## Upsert pattern (per unique constraints)
```typescript
await prisma.model.upsert({
  where: { uniqueField_combo: { field1: val1, field2: val2 } },
  create: { field1: val1, field2: val2, ...altri },
  update: { ...campiAggiornabili },
})
```

## Bulk operations
```typescript
// Insert multiplo
await prisma.model.createMany({ data: records, skipDuplicates: true })

// Update multiplo (no bulk in Prisma — usa Promise.all con cap)
await Promise.all(ids.slice(0, 50).map(id => prisma.model.update({ where: { id }, data: {...} })))
```

## Checklist API
- [ ] Auth check prima di qualsiasi operazione
- [ ] Org-scope su tutti i WHERE
- [ ] Validazione input (campi required)
- [ ] Error messages in italiano
- [ ] `await params` (Next.js 15+)
- [ ] Response 201 su POST, 200 su GET/PATCH, { ok: true } su DELETE
- [ ] TypeScript: `npx tsc --noEmit` zero errori
