"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Bot, Sparkles, Zap, Clock, CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  ScoreMonitorAgent,
  EmailDraftAgent,
  ReportAgent,
  EmailTrackerAgent,
  ProposalsQueue,
  FormAuditAgent,
} from "../analytics/AgentsPanel"
import type { AgentProposalRow } from "@/app/api/events/[id]/ai/proposals/route"

// ── Agent definitions ─────────────────────────────────────────────────────────

interface AgentDef {
  id: string
  name: string
  description: string
  color: string
  borderColor: string
  bgColor: string
  lastRunKey: string
}

const AGENT_DEFS: AgentDef[] = [
  {
    id: "score_monitor",
    name: "Score Monitor",
    description: "Analizza i KPI dell'evento e genera alert con azioni correttive prioritizzate.",
    color: "#EA580C",
    borderColor: "rgba(234,88,12,0.22)",
    bgColor: "rgba(234,88,12,0.04)",
    lastRunKey: "score_monitor_last",
  },
  {
    id: "email_draft",
    name: "Email Draft",
    description: "Genera bozze email personalizzate per ogni fase del ciclo di vita dell'evento.",
    color: "#0891B2",
    borderColor: "rgba(8,145,178,0.22)",
    bgColor: "rgba(8,145,178,0.04)",
    lastRunKey: "email_draft_last",
  },
  {
    id: "email_tracker",
    name: "Email Tracker",
    description: "Monitora le campagne email e identifica template con performance anomale.",
    color: "#7C3AED",
    borderColor: "rgba(124,58,237,0.22)",
    bgColor: "rgba(124,58,237,0.04)",
    lastRunKey: "email_tracker_last",
  },
  {
    id: "report",
    name: "Report Agent",
    description: "Produce report executive completi con trend, insight e raccomandazioni strategiche.",
    color: "#059669",
    borderColor: "rgba(5,150,105,0.22)",
    bgColor: "rgba(5,150,105,0.04)",
    lastRunKey: "report_last",
  },
  {
    id: "form_audit",
    name: "Form Audit",
    description: "Analizza il form di registrazione e suggerisce miglioramenti per aumentare il tasso di completamento.",
    color: "#DB2777",
    borderColor: "rgba(219,39,119,0.22)",
    bgColor: "rgba(219,39,119,0.04)",
    lastRunKey: "form_audit_last",
  },
]

// ── History Modal ─────────────────────────────────────────────────────────────

function HistoryModal({ proposal, onClose }: { proposal: AgentProposalRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[560px] max-w-[95vw] max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{proposal.title}</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {new Date(proposal.decidedAt ?? proposal.createdAt).toLocaleString("it-IT")} · {proposal.agentType}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>

        {proposal.summary && (
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{proposal.summary}</p>
        )}

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(109,98,243,0.14)" }}>
          <div className="px-3 py-2 text-xs font-semibold" style={{ background: "rgba(112,96,204,0.06)", color: "var(--text-tertiary)" }}>
            Payload
          </div>
          <pre className="p-3 text-xs text-gray-600 overflow-x-auto bg-gray-50 rounded-b-xl">
            {JSON.stringify(proposal.payload, null, 2)}
          </pre>
        </div>

        {proposal.diffPayload && (
          <div className="mt-3 rounded-xl border overflow-hidden" style={{ borderColor: "rgba(109,98,243,0.14)" }}>
            <div className="px-3 py-2 text-xs font-semibold" style={{ background: "rgba(112,96,204,0.06)", color: "var(--text-tertiary)" }}>
              Modifiche applicate
            </div>
            <pre className="p-3 text-xs text-gray-600 overflow-x-auto bg-gray-50 rounded-b-xl">
              {JSON.stringify(proposal.diffPayload, null, 2)}
            </pre>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "rgba(112,96,204,0.10)", color: "var(--accent)" }}
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}

// ── Approved History ──────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  SCORE_MONITOR: "Score Monitor",
  EMAIL_DRAFT: "Email Draft",
  REPORT: "Report",
  EMAIL_TRACKER: "Email Tracker",
  FORM_AUDIT: "Form Audit",
}

function ApprovedHistory({ eventId }: { eventId: string }) {
  const [proposals, setProposals] = useState<AgentProposalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<AgentProposalRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/proposals?status=APPROVED`)
      if (!res.ok) return
      const data = await res.json() as AgentProposalRow[]
      setProposals(data)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const visible = expanded ? proposals : proposals.slice(0, 4)

  if (!loading && proposals.length === 0) return null

  return (
    <>
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "rgba(109,98,243,0.14)", boxShadow: "0 2px 8px rgba(109,98,243,0.06)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, rgba(5,150,105,0.05), rgba(16,185,129,0.03))", borderColor: "rgba(5,150,105,0.10)" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(5,150,105,0.12)" }}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Storico azioni</h3>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{proposals.length} azioni approvate ed eseguite</p>
            </div>
          </div>
          {proposals.length > 4 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)", background: "rgba(0,0,0,0.04)" }}
            >
              {expanded ? <><ChevronUp className="h-3.5 w-3.5" />Comprimi</> : <><ChevronDown className="h-3.5 w-3.5" />Vedi tutto</>}
            </button>
          )}
        </div>

        {/* List */}
        <div className="bg-white divide-y divide-[rgba(109,98,243,0.06)]">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Caricamento...</div>
          ) : (
            visible.map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(5,150,105,0.08)" }}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                      {new Date(p.decidedAt ?? p.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(112,96,204,0.08)", color: "var(--accent)" }}>
                      {AGENT_LABELS[p.agentType] ?? p.agentType}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Completato</Badge>
                  <button
                    onClick={() => setSelected(p)}
                    className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                    style={{ color: "var(--accent)", background: "rgba(112,96,204,0.08)" }}
                  >
                    Rivedi
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selected && <HistoryModal proposal={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

// ── Agent Card Grid ───────────────────────────────────────────────────────────

function AgentCardShell({
  def,
  children,
}: {
  def: AgentDef
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: def.borderColor,
        background: def.bgColor,
        boxShadow: `0 2px 12px ${def.color}10`,
      }}
    >
      {children}
    </div>
  )
}

// ── Coming Soon Card ──────────────────────────────────────────────────────────

function ComingSoonCard() {
  return (
    <div
      className="rounded-2xl border-2 border-dashed p-6 space-y-4"
      style={{
        background: "linear-gradient(135deg, rgba(112,96,204,0.04), rgba(34,211,238,0.03))",
        borderColor: "rgba(109,98,243,0.20)",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(112,96,204,0.14), rgba(34,211,238,0.10))" }}
        >
          <div className="relative">
            <Bot className="h-5 w-5" style={{ color: "var(--accent)" }} />
            <Sparkles
              className="h-3 w-3 absolute -top-1 -right-1"
              style={{ color: "#22D3EE" }}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Crea il tuo agente di segreteria
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(112,96,204,0.12)", color: "var(--accent)", border: "1px solid rgba(112,96,204,0.18)" }}
            >
              In sviluppo
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Connetti la tua email professionale e lascia che Phorma AI legga le email in arrivo, suggerisca task e risponda automaticamente ai partecipanti.
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-2">
        {[
          "Analisi email in arrivo",
          "Suggerimento task automatico",
          "Bozze risposta AI",
          "Integrazione calendar",
        ].map(f => (
          <div
            key={f}
            className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.7)", color: "var(--text-secondary)" }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>✦</span>
            {f}
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        disabled
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-not-allowed opacity-60"
        style={{
          background: "linear-gradient(135deg, rgba(112,96,204,0.15), rgba(34,211,238,0.10))",
          color: "var(--accent)",
          border: "1px solid rgba(112,96,204,0.20)",
        }}
      >
        Disponibile presto
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentsClient({
  eventId,
  eventTitle,
}: {
  eventId: string
  eventTitle: string
}) {
  return (
    <>
      <Header
        title="Agenti AI"
        subtitle={eventTitle}
        actions={
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{ background: "rgba(112,96,204,0.08)", borderColor: "rgba(112,96,204,0.18)" }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>Powered by Claude</span>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        {/* Intro banner */}
        <div
          className="rounded-2xl border px-6 py-5 flex items-start gap-4"
          style={{ background: "rgba(112,96,204,0.06)", borderColor: "rgba(112,96,204,0.16)" }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(112,96,204,0.14)", color: "var(--accent)" }}
          >
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Team Agenti Phorma
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Ogni agente analizza il tuo evento e propone azioni concrete. Le proposte richiedono
              approvazione prima di essere eseguite. Puoi eseguire gli agenti in qualsiasi momento.
            </p>
          </div>
        </div>

        {/* Section 1: Proposals Queue */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Azioni in sospeso</h2>
          </div>
          <ProposalsQueue eventId={eventId} />
        </section>

        {/* Section 2: Agents grid */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Agenti disponibili</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AgentCardShell def={AGENT_DEFS[0]}>
              <ScoreMonitorAgent eventId={eventId} />
            </AgentCardShell>
            <AgentCardShell def={AGENT_DEFS[1]}>
              <EmailDraftAgent eventId={eventId} />
            </AgentCardShell>
          </div>

          <AgentCardShell def={AGENT_DEFS[2]}>
            <EmailTrackerAgent eventId={eventId} />
          </AgentCardShell>

          <AgentCardShell def={AGENT_DEFS[3]}>
            <ReportAgent eventId={eventId} />
          </AgentCardShell>

          <AgentCardShell def={AGENT_DEFS[4]}>
            <FormAuditAgent eventId={eventId} />
          </AgentCardShell>
        </section>

        {/* Section 3: History */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Storico azioni</h2>
          <ApprovedHistory eventId={eventId} />
        </section>

        {/* Section 4: Coming soon */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Prossimamente</h2>
          <ComingSoonCard />
        </section>
      </div>
    </>
  )
}
