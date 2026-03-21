"use client"

import { usePathname } from "next/navigation"
import { CopilotKit } from "@copilotkit/react-core"
import { CopilotPopup } from "@copilotkit/react-ui"
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core"
import "@copilotkit/react-ui/styles.css"

// Estrae l'eventId dal pathname /events/[id]/...
function extractEventId(pathname: string): string | null {
  const match = pathname.match(/\/events\/([^/]+)/)
  return match ? match[1] : null
}

// ── Context + Actions bridge (deve stare dentro CopilotKit provider) ──────────

function AgentBridge({ eventId }: { eventId: string | null }) {
  useCopilotReadable({
    description: "Contesto corrente della piattaforma Phorma",
    value: {
      platform: "Phorma - Gestione eventi professionale",
      eventId: eventId ?? null,
      hasEventContext: !!eventId,
      availableAgents: ["report", "email_tracker", "form_audit", "flow_consultant"],
    },
  })

  // Agente Report
  useCopilotAction({
    name: "generateReport",
    description: "Genera un report completo sull'evento: iscrizioni, presenze, comunicazioni, hospitality. Usa questo quando l'utente chiede un report, un riepilogo o un'analisi dell'evento.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato. Apri un evento per usare questo agente."
      const res = await fetch(`/api/events/${eventId}/ai/agents/report`, { method: "POST" })
      if (!res.ok) return "Errore nella generazione del report."
      const data = await res.json() as { sections?: Array<{ title: string; content: string }> }
      if (!data.sections?.length) return "Report generato ma vuoto."
      return data.sections.map((s) => `## ${s.title}\n${s.content}`).join("\n\n")
    },
  })

  // Agente Email Tracker
  useCopilotAction({
    name: "analyzeEmails",
    description: "Analizza le campagne email dell'evento: tassi apertura, click, bounce e suggerimenti. Usa quando l'utente chiede dell'email marketing o delle comunicazioni.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato."
      const res = await fetch(`/api/events/${eventId}/ai/agents/email-tracker`, { method: "POST" })
      if (!res.ok) return "Errore nell'analisi email."
      const data = await res.json() as { summary?: string; issues?: Array<{ campaign: string; issue: string }> }
      const issues = data.issues?.map((i) => `- **${i.campaign}**: ${i.issue}`).join("\n") ?? ""
      return `${data.summary ?? "Analisi completata."}\n\n${issues}`
    },
  })

  // Agente Form Audit
  useCopilotAction({
    name: "auditForm",
    description: "Analizza il form di registrazione dell'evento: qualità dei campi, tasso completamento, suggerimenti di miglioramento. Usa quando l'utente chiede del form.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato."
      const res = await fetch(`/api/events/${eventId}/ai/agents/form-audit`, { method: "POST" })
      if (!res.ok) return "Errore nell'audit del form."
      const data = await res.json() as { summary?: string; improvements?: Array<{ field: string; suggestion: string }> }
      const improvements = data.improvements?.map((i) => `- **${i.field}**: ${i.suggestion}`).join("\n") ?? ""
      return `${data.summary ?? "Audit completato."}\n\n${improvements}`
    },
  })

  // Agente Flow Consultant
  useCopilotAction({
    name: "consultFlow",
    description: "Analizza e ottimizza il flow dell'evento. Propone modifiche al workflow automatizzato. Usa quando l'utente chiede del flow o delle automazioni.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato."
      const res = await fetch(`/api/events/${eventId}/ai/agents/flow-consultant`, { method: "POST" })
      if (!res.ok) return "Errore nella consulenza flow."
      const data = await res.json() as { analysis?: string; proposals?: Array<{ title: string; summary: string }> }
      const proposals = data.proposals?.map((p) => `- **${p.title}**: ${p.summary}`).join("\n") ?? ""
      return `${data.analysis ?? "Analisi completata."}\n\n${proposals}`
    },
  })

  return (
    <CopilotPopup
      instructions={`Sei Phorma AI, l'assistente intelligente integrato nella piattaforma di gestione eventi Phorma.
Hai accesso a 4 agenti specializzati che puoi attivare:
- **generateReport**: genera un report completo sull'evento
- **analyzeEmails**: analizza le campagne email e i tassi di apertura
- **auditForm**: verifica e migliora il form di registrazione
- **consultFlow**: ottimizza il workflow automatizzato dell'evento

${eventId ? `Stai lavorando sull'evento con ID: ${eventId}.` : "Nessun evento selezionato — naviga su un evento per sbloccare gli agenti."}

Rispondi sempre in italiano. Sii conciso e professionale. Suggerisci proattivamente quale agente usare in base alla domanda dell'utente.`}
      defaultOpen={false}
      labels={{
        title: "✦ Agenti Phorma",
        initial: eventId
          ? "Ciao! Sono qui per aiutarti. Posso generare report, analizzare email, auditare il form o ottimizzare il flow. Come posso aiutarti?"
          : "Ciao! Apri un evento per sbloccare tutti gli agenti AI.",
      }}
    />
  )
}

// ── Provider wrapper ──────────────────────────────────────────────────────────

export function FloatingAgentPanel() {
  const pathname = usePathname()
  const eventId = extractEventId(pathname)

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <AgentBridge eventId={eventId} />
    </CopilotKit>
  )
}
