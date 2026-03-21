"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { CopilotKit } from "@copilotkit/react-core"
import { CopilotChat } from "@copilotkit/react-ui"
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core"
import { X, Sparkles } from "lucide-react"

function extractEventId(pathname: string): string | null {
  const match = pathname.match(/\/events\/([^/]+)/)
  return match ? match[1] : null
}

// ── Agent actions bridge ──────────────────────────────────────────────────────

function AgentBridge({ eventId }: { eventId: string | null }) {
  useCopilotReadable({
    description: "Contesto corrente Phorma",
    value: {
      platform: "Phorma - Gestione eventi",
      eventId: eventId ?? null,
      hasEventContext: !!eventId,
    },
  })

  useCopilotAction({
    name: "generateReport",
    description: "Genera un report completo sull'evento (iscrizioni, presenze, comunicazioni). Usalo quando l'utente chiede un report o un riepilogo.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato. Apri un evento prima."
      const res = await fetch(`/api/events/${eventId}/ai/agents/report`, { method: "POST" })
      if (!res.ok) return "Errore nella generazione del report."
      const data = await res.json() as { sections?: Array<{ title: string; content: string }> }
      if (!data.sections?.length) return "Report vuoto."
      return data.sections.map((s) => `## ${s.title}\n${s.content}`).join("\n\n")
    },
  })

  useCopilotAction({
    name: "analyzeEmails",
    description: "Analizza le campagne email: aperture, click, bounce. Usalo quando l'utente chiede delle email o comunicazioni.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato."
      const res = await fetch(`/api/events/${eventId}/ai/agents/email-tracker`, { method: "POST" })
      if (!res.ok) return "Errore analisi email."
      const data = await res.json() as { summary?: string }
      return data.summary ?? "Analisi completata."
    },
  })

  useCopilotAction({
    name: "auditForm",
    description: "Analizza il form di registrazione e suggerisce miglioramenti.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato."
      const res = await fetch(`/api/events/${eventId}/ai/agents/form-audit`, { method: "POST" })
      if (!res.ok) return "Errore audit form."
      const data = await res.json() as { summary?: string }
      return data.summary ?? "Audit completato."
    },
  })

  useCopilotAction({
    name: "consultFlow",
    description: "Analizza e ottimizza il workflow dell'evento.",
    parameters: [],
    handler: async () => {
      if (!eventId) return "Nessun evento selezionato."
      const res = await fetch(`/api/events/${eventId}/ai/agents/flow-consultant`, { method: "POST" })
      if (!res.ok) return "Errore consulenza flow."
      const data = await res.json() as { analysis?: string }
      return data.analysis ?? "Analisi completata."
    },
  })

  return null
}

// ── Main floating panel ───────────────────────────────────────────────────────

function PanelInner({ eventId }: { eventId: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <AgentBridge eventId={eventId} />

      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "linear-gradient(135deg, #7060CC, #9D8DF5)",
          color: "#fff",
          border: "none",
          borderRadius: "999px",
          padding: "12px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(112,96,204,0.45)",
        }}
      >
        {open ? <X size={18} /> : <Sparkles size={18} />}
        {open ? "Chiudi" : "Agenti AI"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            right: "24px",
            width: "380px",
            height: "520px",
            zIndex: 99998,
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 8px 48px rgba(0,0,0,0.3)",
            border: "1px solid rgba(112,96,204,0.3)",
            background: "#0D0522",
          }}
        >
          <CopilotChat
            instructions={`Sei Phorma AI, assistente per la gestione eventi. Rispondi in italiano, sii conciso.
Hai 4 azioni disponibili:
- generateReport: report completo sull'evento
- analyzeEmails: analisi campagne email
- auditForm: audit form di registrazione
- consultFlow: ottimizzazione workflow
${eventId ? `Evento corrente: ${eventId}` : "Nessun evento selezionato — vai su un evento per usare gli agenti."}`}
            labels={{
              title: "✦ Agenti Phorma",
              initial: eventId
                ? "Ciao! Posso generare report, analizzare email, auditare il form o ottimizzare il flow. Come posso aiutarti?"
                : "Ciao! Apri un evento per usare gli agenti AI.",
              placeholder: "Scrivi un messaggio...",
            }}
          />
        </div>
      )}
    </>
  )
}

// ── Provider wrapper ──────────────────────────────────────────────────────────

export function FloatingAgentPanel() {
  const pathname = usePathname()
  const eventId = extractEventId(pathname)

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <PanelInner eventId={eventId} />
    </CopilotKit>
  )
}
