// Form Audit Agent — analizza la struttura del form di registrazione
// Identifica problemi UX, label poco chiare, campi ridondanti
// Mappa le risposte critiche a azioni di follow-up (es. allergie → lista catering)
// Salva il risultato come AgentProposal(FORM_CHANGE)
import { NextRequest, NextResponse } from "next/server"
import { requirePlanner } from "@/lib/auth-helpers"
import { anthropic, AGENT_MODELS } from "@/lib/ai"
import { prisma } from "@/lib/db"

// ── Tipi pubblici ─────────────────────────────────────────────────────────────

export type IssueType =
  | "label_unclear"
  | "type_mismatch"
  | "redundant"
  | "missing_required"
  | "bad_order"
  | "missing_field"
  | "no_options"
  | "accessibility"

export type ImprovementType =
  | "relabel"
  | "retype"
  | "set_required"
  | "reorder"
  | "merge"
  | "add_placeholder"
  | "add_options"

export type FollowupActionType =
  | "tag_in_notes"
  | "notify_team"
  | "assign_group"
  | "send_email"
  | "assign_hotel"
  | "flag_for_review"

export interface FieldIssue {
  fieldId: string
  fieldLabel: string
  issueType: IssueType
  description: string
  suggestion: string
  severity: "high" | "medium" | "low"
}

export interface FieldImprovement {
  fieldId: string
  fieldLabel: string
  improvementType: ImprovementType
  currentValue: string
  newValue: string
  rationale: string
}

export interface FollowupMapping {
  fieldId: string
  fieldLabel: string
  triggerCondition: string  // es. "valore contiene 'celiachia'"
  actionType: FollowupActionType
  actionDescription: string
  automate: boolean          // true = può essere aggiunta al flow automaticamente
}

export interface FormAuditResult {
  auditScore: number         // 0-100 qualità form
  scoreLabel: "ottimo" | "buono" | "migliorabile" | "critico"
  summary: string
  topPriority: string
  issues: FieldIssue[]
  improvements: FieldImprovement[]
  followupMappings: FollowupMapping[]
  proposalId: string | null
}

// ── Tools Claude ──────────────────────────────────────────────────────────────

const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
  {
    name: "flag_field_issue",
    description: "Segnala un problema strutturale o UX in un campo del form",
    input_schema: {
      type: "object" as const,
      properties: {
        field_id: { type: "string", description: "ID del campo" },
        field_label: { type: "string", description: "Label corrente del campo" },
        issue_type: {
          type: "string",
          enum: ["label_unclear", "type_mismatch", "redundant", "missing_required", "bad_order", "missing_field", "no_options", "accessibility"],
        },
        description: { type: "string", description: "Descrizione del problema (max 20 parole)" },
        suggestion: { type: "string", description: "Suggerimento concreto per risolvere (max 20 parole)" },
        severity: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["field_id", "field_label", "issue_type", "description", "suggestion", "severity"],
    },
  },
  {
    name: "suggest_improvement",
    description: "Propone una modifica concreta a un campo esistente (label, tipo, obbligatorio, placeholder, opzioni)",
    input_schema: {
      type: "object" as const,
      properties: {
        field_id: { type: "string", description: "ID del campo da modificare" },
        field_label: { type: "string", description: "Label corrente del campo" },
        improvement_type: {
          type: "string",
          enum: ["relabel", "retype", "set_required", "reorder", "merge", "add_placeholder", "add_options"],
        },
        current_value: { type: "string", description: "Valore attuale (label / tipo / stato)" },
        new_value: { type: "string", description: "Nuovo valore proposto" },
        rationale: { type: "string", description: "Perché questa modifica migliora il form (max 15 parole)" },
      },
      required: ["field_id", "field_label", "improvement_type", "current_value", "new_value", "rationale"],
    },
  },
  {
    name: "map_followup_action",
    description: "Mappa una risposta critica di un campo a un'azione di follow-up operativo",
    input_schema: {
      type: "object" as const,
      properties: {
        field_id: { type: "string", description: "ID del campo trigger" },
        field_label: { type: "string", description: "Label del campo" },
        trigger_condition: { type: "string", description: "Condizione che attiva l'azione (es. 'risposta contiene allergia/celiachia')" },
        action_type: {
          type: "string",
          enum: ["tag_in_notes", "notify_team", "assign_group", "send_email", "assign_hotel", "flag_for_review"],
        },
        action_description: { type: "string", description: "Cosa deve accadere operativamente (max 20 parole)" },
        automate: {
          type: "boolean",
          description: "true = l'azione può essere aggiunta al flow automaticamente; false = richiede gestione manuale",
        },
      },
      required: ["field_id", "field_label", "trigger_condition", "action_type", "action_description", "automate"],
    },
  },
  {
    name: "set_audit_summary",
    description: "Imposta il punteggio finale e il riepilogo dell'audit. Chiamare UNA SOLA VOLTA alla fine.",
    input_schema: {
      type: "object" as const,
      properties: {
        audit_score: {
          type: "number",
          description: "Punteggio qualità form 0-100 (100 = perfetto, 0 = inutilizzabile)",
        },
        summary: { type: "string", description: "Valutazione complessiva del form in 2-3 frasi in italiano" },
        top_priority: { type: "string", description: "La singola cosa più urgente da fare subito" },
      },
      required: ["audit_score", "summary", "top_priority"],
    },
  },
]

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Supporto chiamata interna da Paperclip http adapter
  const body = await req.json().catch(() => ({}))
  const internalKey = req.headers.get("x-paperclip-internal-key")
  const isInternal = !!internalKey && internalKey === process.env.PAPERCLIP_INTERNAL_KEY

  let orgId: string, userId: string
  if (isInternal) {
    if (!body.orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 })
    orgId = body.orgId as string
    userId = "paperclip-agent"
  } else {
    const auth = await requirePlanner()
    if ("error" in auth) return auth.error
    orgId = auth.orgId
    userId = auth.userId
  }

  const { id: eventId } = await params

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: orgId },
    select: { id: true, title: true, eventType: true, capacity: true },
  })
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 })

  // Legge tutti i campi del form con statistiche risposta
  const fields = await prisma.formField.findMany({
    where: { eventId },
    include: {
      registrationFields: { select: { value: true }, take: 50 },
    },
    orderBy: { order: "asc" },
  })

  if (fields.length === 0) {
    return NextResponse.json({
      auditScore: 0,
      scoreLabel: "critico",
      summary: "Il form non ha campi configurati. Aggiungi almeno i campi base (nome, cognome, email).",
      topPriority: "Aggiungere i campi obbligatori: nome, cognome, email.",
      issues: [],
      improvements: [],
      followupMappings: [],
      proposalId: null,
    } satisfies FormAuditResult)
  }

  // Costruisce il quadro dei campi per il prompt
  const fieldsText = fields.map((f, i) => {
    const options = f.options ? (() => { try { return JSON.parse(f.options!) } catch { return [] } })() : []
    const responses = f.registrationFields.length
    const sampleValues = f.registrationFields
      .map((r) => r.value)
      .filter(Boolean)
      .slice(0, 5)
      .join(", ")

    return `${i + 1}. ID:${f.id}
   Label: "${f.label}"
   Tipo: ${f.type} | Obbligatorio: ${f.required ? "sì" : "no"} | Ordine: ${f.order}
   Opzioni: ${options.length > 0 ? options.join(", ") : "nessuna"}
   Risposte raccolte: ${responses}${sampleValues ? ` | Esempi: ${sampleValues}` : ""}`
  }).join("\n\n")

  const prompt = `Sei il Form Audit Agent di Phorma. Analizza questo form di registrazione per un evento e fornisci un audit professionale.

EVENTO: "${event.title}" (${event.eventType}) | Capacità: ${event.capacity ?? "illimitata"}

CAMPI DEL FORM (${fields.length} totali):
${fieldsText}

CRITERI DI VALUTAZIONE:
1. Completezza: presenti i campi essenziali? (nome, cognome, email — almeno questi)
2. Chiarezza label: ogni campo è univoco e comprensibile senza ambiguità?
3. Tipo corretto: telefono come "phone", email come "email", scelte con "select/radio"?
4. Ordine logico: dati anagrafici → dati professionali → preferenze logistiche → domande specifiche
5. Obbligatorietà: email sempre obbligatoria? Campi critici non opzionali?
6. Campi critica operativa: ci sono campi che richiedono azioni (allergie, albergo, transfer)?

ISTRUZIONI:
1. Chiama flag_field_issue per ogni problema (max 5 problemi)
2. Chiama suggest_improvement per miglioramenti concreti applicabili (max 4)
3. Chiama map_followup_action per OGNI campo con risposta critica operativa:
   - Allergie/diete speciali → tag_in_notes + notify_team
   - Richiesta hotel/camera → assign_hotel
   - Transfer/navetta → notify_team
   - Preferenze specifiche → assign_group o tag_in_notes
4. Chiama set_audit_summary UNA SOLA VOLTA alla fine
5. Sii specifico e pratico — usa i field_id reali dai dati sopra
6. Linguaggio italiano professionale`

  // ── Agentic loop ──────────────────────────────────────────────────────────

  const issues: FieldIssue[] = []
  const improvements: FieldImprovement[] = []
  const followupMappings: FollowupMapping[] = []
  let auditScore = 50
  let summary = ""
  let topPriority = ""

  let response = await anthropic.messages.create({
    model: AGENT_MODELS.form_audit,
    max_tokens: 3000,
    tools,
    messages: [{ role: "user", content: prompt }],
  })

  const history: Parameters<typeof anthropic.messages.create>[0]["messages"] = [
    { role: "user", content: prompt },
  ]

  while (response.stop_reason === "tool_use") {
    const toolResults: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] = []

    for (const block of response.content) {
      if (block.type !== "tool_use") continue

      if (block.name === "flag_field_issue") {
        const inp = block.input as {
          field_id: string; field_label: string; issue_type: string
          description: string; suggestion: string; severity: string
        }
        issues.push({
          fieldId: inp.field_id,
          fieldLabel: inp.field_label,
          issueType: inp.issue_type as IssueType,
          description: inp.description,
          suggestion: inp.suggestion,
          severity: inp.severity as FieldIssue["severity"],
        })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      } else if (block.name === "suggest_improvement") {
        const inp = block.input as {
          field_id: string; field_label: string; improvement_type: string
          current_value: string; new_value: string; rationale: string
        }
        improvements.push({
          fieldId: inp.field_id,
          fieldLabel: inp.field_label,
          improvementType: inp.improvement_type as ImprovementType,
          currentValue: inp.current_value,
          newValue: inp.new_value,
          rationale: inp.rationale,
        })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      } else if (block.name === "map_followup_action") {
        const inp = block.input as {
          field_id: string; field_label: string; trigger_condition: string
          action_type: string; action_description: string; automate: boolean
        }
        followupMappings.push({
          fieldId: inp.field_id,
          fieldLabel: inp.field_label,
          triggerCondition: inp.trigger_condition,
          actionType: inp.action_type as FollowupActionType,
          actionDescription: inp.action_description,
          automate: inp.automate,
        })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      } else if (block.name === "set_audit_summary") {
        const inp = block.input as { audit_score: number; summary: string; top_priority: string }
        auditScore = Math.max(0, Math.min(100, inp.audit_score))
        summary = inp.summary
        topPriority = inp.top_priority
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" })
      }
    }

    history.push({ role: "assistant", content: response.content })
    history.push({ role: "user", content: toolResults })
    response = await anthropic.messages.create({
      model: AGENT_MODELS.form_audit,
      max_tokens: 3000,
      tools,
      messages: history,
    })
  }

  const scoreLabel: FormAuditResult["scoreLabel"] =
    auditScore >= 85 ? "ottimo" : auditScore >= 65 ? "buono" : auditScore >= 40 ? "migliorabile" : "critico"

  // Costruisce il payload per la proposta
  const proposalPayload = {
    auditScore,
    scoreLabel,
    summary,
    topPriority,
    issues,
    improvements,
    followupMappings,
    // Applica improvements come diff
    fieldChanges: improvements.map((imp) => ({
      fieldId: imp.fieldId,
      field: impToFieldKey(imp.improvementType),
      before: imp.currentValue,
      after: imp.newValue,
      reason: imp.rationale,
    })),
  }

  // diffPayload per visualizzazione ProposalDiff
  const diffPayload =
    proposalPayload.fieldChanges.length > 0
      ? {
          changes: proposalPayload.fieldChanges.map((c) => ({
            registrationId: c.fieldId, // riuso struttura MasterlistChange con fieldId come id
            firstName: fields.find((f) => f.id === c.fieldId)?.label ?? c.fieldId,
            lastName: "",
            email: c.field,
            field: "label/tipo",
            before: c.before,
            after: c.after,
            reason: c.reason,
          })),
        }
      : null

  const proposal = await prisma.agentProposal.create({
    data: {
      eventId,
      orgId,
      agentType: "FORM_AUDIT",
      actionType: "FORM_CHANGE",
      title: `Audit form — ${event.title} (score: ${auditScore}/100)`,
      summary: summary.slice(0, 160),
      payload: JSON.stringify(proposalPayload),
      diffPayload: diffPayload ? JSON.stringify(diffPayload) : null,
      status: "PENDING",
      requestedBy: userId,
    },
  })

  const result: FormAuditResult = {
    auditScore,
    scoreLabel,
    summary,
    topPriority,
    issues,
    improvements,
    followupMappings,
    proposalId: proposal.id,
  }

  // Notifica Paperclip task completato (se chiamata interna)
  if (isInternal) {
    const issueId = (body.context as Record<string, unknown>)?.issueId as string | undefined
    if (issueId) {
      try {
        const { updateIssue } = await import("@/lib/paperclip-client")
        await updateIssue(issueId, {
          status: "done",
          comment: `Audit form completato. Score: **${auditScore}/100** (${scoreLabel})\n- ${issues.length} problemi\n- ${improvements.length} miglioramenti\n- ${followupMappings.length} azioni follow-up\n\n${summary}`,
        })
      } catch {
        // non bloccante
      }
    }
  }

  return NextResponse.json(result)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function impToFieldKey(type: ImprovementType): string {
  switch (type) {
    case "relabel": return "label"
    case "retype": return "type"
    case "set_required": return "required"
    case "add_placeholder": return "placeholder"
    case "add_options": return "options"
    default: return type
  }
}
