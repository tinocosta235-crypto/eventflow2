"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Bot, RefreshCw, AlertTriangle, AlertCircle, Info,
  Sparkles, Copy, Check, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, ShieldCheck, XCircle,
  Clock, CheckCircle2, FileText, Users, Printer, Mail, ClipboardList,
} from "lucide-react"
import type { ScoreMonitorResult, ScoreAlert } from "@/app/api/events/[id]/ai/agents/score-monitor/route"
import type { EmailDraft } from "@/app/api/events/[id]/ai/agents/email-draft/route"
import type { AgentProposalRow } from "@/app/api/events/[id]/ai/proposals/route"
import type { ReportPayload } from "@/app/api/events/[id]/ai/agents/report/route"
import type { EmailTrackerResult, CampaignIssue } from "@/app/api/events/[id]/ai/agents/email-tracker/route"
import type { CampaignMetrics } from "@/app/api/events/[id]/emails/campaigns/route"
import type { FormAuditResult, FieldIssue, FieldImprovement, FollowupMapping } from "@/app/api/events/[id]/ai/agents/form-audit/route"
import { ReportViewer } from "@/components/ui/report-viewer"

// ── Score Monitor Agent ──────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: ScoreAlert }) {
  const config = {
    critical: { icon: AlertCircle, bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-800", text: "text-red-700", label: "Critico" },
    warning: { icon: AlertTriangle, bg: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-100 text-yellow-800", text: "text-yellow-700", label: "Attenzione" },
    info: { icon: Info, bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-800", text: "text-blue-700", label: "Info" },
  }[alert.severity]

  const Icon = config.icon

  return (
    <div className={`rounded-lg border p-3 ${config.bg}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">{alert.kpi}</span>
            <Badge className={`text-[10px] px-1.5 py-0 ${config.badge}`}>{config.label}</Badge>
          </div>
          <p className={`text-xs ${config.text} mb-1.5`}>{alert.issue}</p>
          <div className="bg-white/70 rounded px-2 py-1.5">
            <p className="text-xs font-medium text-gray-800">→ {alert.action}</p>
            <p className="text-xs text-gray-500 mt-0.5">Impatto atteso: {alert.impact}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ScoreMonitorAgent({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<ScoreMonitorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(true)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/agents/score-monitor`, { method: "POST" })
      if (!res.ok) return
      setResult(await res.json())
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-sm text-orange-900">Score Monitor Agent</CardTitle>
            {result && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-sm font-bold text-gray-800">{result.score}/100</span>
                <Badge className={
                  result.grade === "A" ? "bg-green-100 text-green-800" :
                  result.grade === "B" ? "bg-blue-100 text-blue-800" :
                  result.grade === "C" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }>
                  {result.grade}
                </Badge>
                {result.scoreDelta !== null && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${result.scoreDelta > 0 ? "text-green-600" : result.scoreDelta < 0 ? "text-red-600" : "text-gray-500"}`}>
                    {result.scoreDelta > 0 ? <TrendingUp className="h-3 w-3" /> : result.scoreDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {result.scoreDelta > 0 ? "+" : ""}{result.scoreDelta}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {result && (
              <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="h-7 px-2">
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              size="sm"
              onClick={run}
              disabled={loading}
              className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white h-7 px-3 text-xs"
            >
              {loading ? (
                <><RefreshCw className="h-3 w-3 animate-spin" />Analisi...</>
              ) : (
                <><Bot className="h-3 w-3" />{result ? "Riesegui" : "Esegui agent"}</>
              )}
            </Button>
          </div>
        </div>
        {result && (
          <p className="text-xs text-orange-700 mt-1">{result.alerts.length} alert rilevati</p>
        )}
      </CardHeader>

      {open && result && (
        <CardContent className="space-y-3 pt-0">
          {result.alerts.length > 0 ? (
            <div className="space-y-2">
              {result.alerts
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 }
                  return order[a.severity] - order[b.severity]
                })
                .map((alert, i) => <AlertCard key={i} alert={alert} />)}
            </div>
          ) : (
            <div className="text-center py-3 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
              Nessuna anomalia rilevata — l&apos;evento è in buona salute
            </div>
          )}

          {result.summary && (
            <div className="bg-white rounded-lg border border-orange-100 p-3 space-y-2">
              <p className="text-xs text-gray-700">{result.summary}</p>
              {result.priorityAction && (
                <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-orange-800">
                    Priorità oggi: {result.priorityAction}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── Proposals Queue (DB-based) ───────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  SCORE_MONITOR: "Score Monitor",
  EMAIL_DRAFT: "Email Draft",
  REPORT: "Report",
  EMAIL_TRACKER: "Email Tracker",
  FORM_AUDIT: "Form Audit",
}

const ACTION_LABELS: Record<string, string> = {
  EMAIL_SEND: "Invio email",
  MASTERLIST_CHANGE: "Modifica masterlist",
  REPORT_GENERATE: "Genera report",
  FLOW_ACTION: "Azione flow",
  FORM_CHANGE: "Modifica form",
}

function ProposalCard({
  proposal,
  onDecide,
}: {
  proposal: AgentProposalRow
  onDecide: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [note, setNote] = useState("")
  const [showNote, setShowNote] = useState(false)
  const [modifiedPayload, setModifiedPayload] = useState<string>("")
  const [showModify, setShowModify] = useState(false)

  async function decide(action: "approve" | "reject", customPayload?: Record<string, unknown>) {
    setProcessing(true)
    try {
      const body: Record<string, unknown> = { action }
      if (note) body.decisionNote = note
      if (customPayload) {
        body.action = "modify"
        body.payload = customPayload
      }
      const res = await fetch(
        `/api/events/${proposal.eventId}/ai/proposals/${proposal.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      if (res.ok) onDecide()
    } finally {
      setProcessing(false)
    }
  }

  function handleModifyApprove() {
    try {
      const parsed = JSON.parse(modifiedPayload)
      decide("approve", parsed)
    } catch {
      alert("JSON non valido")
    }
  }

  const payload = proposal.payload
  const previewText = proposal.summary ?? (
    payload.subject ? `Oggetto: ${payload.subject}` :
    payload.title ? String(payload.title) :
    "Vedi dettaglio"
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">
              {AGENT_LABELS[proposal.agentType] ?? proposal.agentType}
            </Badge>
            <Badge className="bg-gray-100 text-gray-700 text-[10px]">
              {ACTION_LABELS[proposal.actionType] ?? proposal.actionType}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-gray-900">{proposal.title}</p>
          <p className="text-xs text-gray-500">{previewText}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
          {JSON.stringify(payload, null, 2)}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        {new Date(proposal.createdAt).toLocaleString("it-IT")}
      </p>

      {showModify && (
        <div className="space-y-2">
          <Textarea
            value={modifiedPayload || JSON.stringify(proposal.payload, null, 2)}
            onChange={(e) => setModifiedPayload(e.target.value)}
            rows={5}
            className="text-xs font-mono resize-none"
            placeholder="JSON payload modificato..."
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-7" onClick={handleModifyApprove} disabled={processing}>
              Approva modificato
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowModify(false)}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {showNote && (
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="text-xs resize-none"
          placeholder="Motivo del rifiuto (obbligatorio)..."
        />
      )}

      {!showModify && (
        <div className="flex gap-1.5 flex-wrap">
          <Button
            size="sm"
            className="gap-1 bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
            onClick={() => decide("approve")}
            disabled={processing}
          >
            {processing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Approva
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-7 px-2 text-xs text-blue-600 border-blue-200"
            onClick={() => setShowModify(true)}
            disabled={processing}
          >
            Modifica
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-7 px-2 text-xs text-red-600 border-red-200"
            onClick={() => {
              if (!showNote) { setShowNote(true); return }
              if (!note.trim() || note.trim().length < 5) { alert("Inserisci un motivo (min 5 caratteri)"); return }
              decide("reject")
            }}
            disabled={processing}
          >
            <XCircle className="h-3 w-3" />
            Rifiuta
          </Button>
        </div>
      )}
    </div>
  )
}

export function ProposalsQueue({ eventId }: { eventId: string }) {
  const [proposals, setProposals] = useState<AgentProposalRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/proposals?status=${filter}`)
      if (!res.ok) return
      const data = await res.json()
      setProposals(data.proposals ?? [])
    } finally {
      setLoading(false)
    }
  }, [eventId, filter])

  useEffect(() => { load() }, [load])

  const pending = proposals.filter((p) => p.status === "PENDING")
  const others = proposals.filter((p) => p.status !== "PENDING")

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm text-indigo-900">Proposte Agenti</CardTitle>
            {pending.length > 0 && (
              <Badge className="bg-indigo-600 text-white text-[10px] px-1.5">{pending.length}</Badge>
            )}
          </div>
          <div className="flex gap-1">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  filter === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "text-gray-500 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {s === "PENDING" ? "In attesa" : s === "APPROVED" ? "Approvate" : "Rifiutate"}
              </button>
            ))}
            <button onClick={load} className="ml-1 text-indigo-600 hover:text-indigo-800">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {loading && proposals.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-3">Caricamento...</p>
        )}

        {!loading && proposals.length === 0 && (
          <div className="text-center py-4">
            {filter === "PENDING" ? (
              <>
                <Clock className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Nessuna proposta in attesa</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Gli agenti AI genereranno proposte qui</p>
              </>
            ) : (
              <p className="text-xs text-gray-500">Nessuna proposta {filter === "APPROVED" ? "approvata" : "rifiutata"}</p>
            )}
          </div>
        )}

        {filter === "PENDING"
          ? pending.map((p) => (
              <ProposalCard key={p.id} proposal={p} onDecide={load} />
            ))
          : others.map((p) => (
              <div key={p.id} className="rounded-lg border border-gray-100 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  {p.status === "APPROVED"
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    : <XCircle className="h-3.5 w-3.5 text-red-500" />
                  }
                  <span className="text-xs font-medium text-gray-800">{p.title}</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {p.decidedAt ? new Date(p.decidedAt).toLocaleString("it-IT") : "—"}
                  {p.decisionNote && ` — ${p.decisionNote}`}
                </p>
              </div>
            ))}
      </CardContent>
    </Card>
  )
}

// ── Email Draft Agent ────────────────────────────────────────────────────────

const AUDIENCE_LABELS: Record<string, string> = {
  CONFIRMED: "Confermati",
  PENDING: "In attesa",
  WAITLIST: "Waitlist",
  ALL: "Tutti gli iscritti",
}

const URGENCY_CONFIG = {
  high: { label: "Urgente", color: "bg-red-100 text-red-800" },
  medium: { label: "Normale", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "Bassa priorità", color: "bg-gray-100 text-gray-700" },
}

function DraftCard({ draft, eventId, onSend }: { draft: EmailDraft; eventId: string; onSend?: () => void }) {
  const [copied, setCopied] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  async function copyToClipboard() {
    await navigator.clipboard.writeText(`OGGETTO: ${draft.subject}\n\n${draft.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function requestApproval() {
    setRequesting(true)
    try {
      const statusFilter = draft.targetAudience === "ALL"
        ? ["CONFIRMED", "PENDING", "WAITLIST"]
        : [draft.targetAudience]

      const res = await fetch(`/api/events/${eventId}/ai/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: "EMAIL_DRAFT",
          actionType: "EMAIL_SEND",
          title: `Invio AI — ${draft.subject}`,
          summary: draft.rationale,
          payload: {
            type: "custom",
            subject: draft.subject,
            body: draft.body,
            statusFilter,
            urgency: draft.urgency,
          },
        }),
      })
      if (!res.ok) return
      setRequested(true)
      onSend?.()
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-purple-100 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={URGENCY_CONFIG[draft.urgency].color}>
              {URGENCY_CONFIG[draft.urgency].label}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800">
              → {AUDIENCE_LABELS[draft.targetAudience] ?? draft.targetAudience}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 italic">{draft.rationale}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-gray-50 rounded px-3 py-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Oggetto</p>
          <p className="text-sm font-semibold text-gray-900">{draft.subject}</p>
        </div>
        <div className="bg-gray-50 rounded px-3 py-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Corpo</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{draft.body}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5 flex-1">
          {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Copiato!</> : <><Copy className="h-3.5 w-3.5" />Copia</>}
        </Button>
        <Button
          size="sm"
          onClick={requestApproval}
          disabled={requesting || requested}
          className="gap-1.5 flex-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {requested ? (
            <><ShieldCheck className="h-3.5 w-3.5" />In coda approvazione</>
          ) : requesting ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Salvataggio...</>
          ) : (
            <><ShieldCheck className="h-3.5 w-3.5" />Richiedi approvazione</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Report Agent ─────────────────────────────────────────────────────────────

const RECIPIENT_OPTIONS = [
  { value: "cliente", label: "Cliente" },
  { value: "team", label: "Team interno" },
  { value: "fornitore", label: "Fornitore" },
  { value: "interno", label: "Uso interno" },
]

export function ReportAgent({ eventId }: { eventId: string }) {
  const [report, setReport] = useState<ReportPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState("")
  const [recipientType, setRecipientType] = useState("cliente")
  const [showBrief, setShowBrief] = useState(false)
  const [proposalId, setProposalId] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setReport(null)
    setProposalId(null)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/agents/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim() || undefined, recipientType }),
      })
      if (!res.ok) return
      const data = await res.json()
      setReport(data.report)
      setProposalId(data.proposalId)
    } finally {
      setLoading(false)
    }
  }

  const QUICK_BRIEFS = [
    "Stato avanzamento iscrizioni",
    "Situazione hotel e logistica",
    "Sintesi performance email",
    "Report completo pre-evento",
  ]

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm text-emerald-900">Report Agent</CardTitle>
          {proposalId && (
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Salvato in coda</Badge>
          )}
        </div>
        <p className="text-xs text-emerald-700 mt-1">
          Genera report di segreteria pronti per cliente, team o fornitori
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Recipient selector */}
        <div className="flex gap-1.5 flex-wrap">
          {RECIPIENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRecipientType(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                recipientType === opt.value
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "text-gray-600 border-gray-200 hover:border-emerald-300 bg-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Quick briefs */}
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_BRIEFS.map((b) => (
            <button
              key={b}
              onClick={() => { setBrief(b); generate() }}
              disabled={loading}
              className="text-left text-xs text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 transition-colors disabled:opacity-50"
            >
              {b}
            </button>
          ))}
        </div>

        {/* Brief personalizzato */}
        <div>
          <button
            onClick={() => setShowBrief(!showBrief)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {showBrief ? "Nascondi" : "Brief personalizzato..."}
          </button>
          {showBrief && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Descrivi cosa deve contenere il report..."
                rows={2}
                className="text-xs resize-none flex-1"
              />
              <Button
                size="sm"
                onClick={generate}
                disabled={loading || !brief.trim()}
                className="self-end bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={loading}
          className="w-full gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          {loading ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Generazione report...</>
          ) : (
            <><FileText className="h-3.5 w-3.5" />Genera report</>
          )}
        </Button>

        {/* Report generato */}
        {report && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Report generato</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3 w-3" />
                  Stampa PDF
                </Button>
                {proposalId && (
                  <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-1 h-7 flex items-center">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    In coda approvazione
                  </Badge>
                )}
              </div>
            </div>
            <div className="border border-emerald-100 rounded-xl p-3 max-h-[600px] overflow-y-auto">
              <ReportViewer report={report} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Email Tracker Agent ───────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  open_rate: "Open Rate",
  click_rate: "Click Rate",
  bounce_rate: "Bounce Rate",
}

const ACTION_ICONS: Record<string, string> = {
  send_reminder: "🔔",
  resend_to_bounced: "↩️",
  send_to_unopened: "📬",
  send_followup: "✉️",
}

function CampaignIssueCard({ issue }: { issue: CampaignIssue }) {
  const colors = {
    high: "bg-red-50 border-red-200 text-red-700",
    medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
    low: "bg-blue-50 border-blue-200 text-blue-700",
  }[issue.priority]

  return (
    <div className={`rounded-lg border p-2.5 ${colors}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold truncate">{issue.subject.slice(0, 40)}{issue.subject.length > 40 ? "…" : ""}</span>
        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${colors}`}>
          {METRIC_LABELS[issue.metric] ?? issue.metric}: {issue.value}%
        </Badge>
      </div>
      <p className="text-xs">{issue.issue}</p>
      <p className="text-[10px] mt-0.5 opacity-70">benchmark: {issue.benchmark}%</p>
    </div>
  )
}

function CampaignRow({ campaign }: { campaign: CampaignMetrics }) {
  const openColor = campaign.openRate >= 30 ? "text-green-600" : campaign.openRate >= 15 ? "text-yellow-600" : "text-red-600"
  const clickColor = campaign.clickRate >= 5 ? "text-green-600" : campaign.clickRate >= 2 ? "text-yellow-600" : "text-red-600"

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 text-xs">
      <td className="px-3 py-2">
        <p className="font-medium text-gray-800 truncate max-w-[180px]" title={campaign.subject}>{campaign.subject}</p>
        <p className="text-[10px] text-gray-400">{campaign.sent} inviati · {new Date(campaign.firstSentAt).toLocaleDateString("it-IT")}</p>
      </td>
      <td className={`px-3 py-2 font-semibold ${openColor}`}>{campaign.openRate}%</td>
      <td className={`px-3 py-2 font-semibold ${clickColor}`}>{campaign.clickRate}%</td>
      <td className="px-3 py-2 text-gray-600">{campaign.bounceRate}%</td>
      <td className="px-3 py-2 text-gray-500">{campaign.unopenedCount}</td>
    </tr>
  )
}

export function EmailTrackerAgent({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<EmailTrackerResult | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [open, setOpen] = useState(true)
  const [proposalsCreated, setProposalsCreated] = useState(0)

  // Carica campagne all'avvio
  useEffect(() => {
    fetch(`/api/events/${eventId}/emails/campaigns`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setCampaigns(d.campaigns ?? []) })
      .catch(() => {})
      .finally(() => setLoadingCampaigns(false))
  }, [eventId])

  async function run() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/agents/email-tracker`, { method: "POST" })
      if (!res.ok) return
      const data: EmailTrackerResult = await res.json()
      setResult(data)
      setProposalsCreated(data.followupProposals.length)
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-600" />
            <CardTitle className="text-sm text-sky-900">Email Tracker Agent</CardTitle>
            {result && (
              <div className="flex items-center gap-1.5 ml-1">
                <Badge className="bg-sky-100 text-sky-800 text-[10px]">
                  {result.avgOpenRate}% open rate medio
                </Badge>
                {proposalsCreated > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">
                    {proposalsCreated} follow-up in coda
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {(result || campaigns.length > 0) && (
              <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="h-7 px-2">
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              size="sm"
              onClick={run}
              disabled={loading}
              className="gap-1.5 bg-sky-500 hover:bg-sky-600 text-white h-7 px-3 text-xs"
            >
              {loading ? (
                <><RefreshCw className="h-3 w-3 animate-spin" />Analisi...</>
              ) : (
                <><Bot className="h-3 w-3" />{result ? "Riesegui" : "Analizza email"}</>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-sky-700 mt-1">
          Analizza performance campagne e propone follow-up mirati
        </p>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-3">
          {/* Campaign metrics table */}
          {loadingCampaigns ? (
            <p className="text-xs text-gray-400">Caricamento campagne...</p>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
              <Mail className="h-6 w-6 text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Nessuna campagna email inviata</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Campagne inviate ({campaigns.length})
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 text-[10px] text-gray-400 font-medium">Campagna</th>
                    <th className="text-left px-3 py-1.5 text-[10px] text-gray-400 font-medium">Open</th>
                    <th className="text-left px-3 py-1.5 text-[10px] text-gray-400 font-medium">Click</th>
                    <th className="text-left px-3 py-1.5 text-[10px] text-gray-400 font-medium">Bounce</th>
                    <th className="text-left px-3 py-1.5 text-[10px] text-gray-400 font-medium">Non aperte</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => <CampaignRow key={i} campaign={c} />)}
                </tbody>
              </table>
            </div>
          )}

          {/* Agent results */}
          {result && (
            <>
              {/* Issues */}
              {result.issues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Problemi rilevati</p>
                  {result.issues
                    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
                    .map((issue, i) => <CampaignIssueCard key={i} issue={issue} />)}
                </div>
              )}

              {/* Follow-up proposals */}
              {result.followupProposals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    Follow-up proposti ({result.followupProposals.length}) — in coda approvazione
                  </p>
                  {result.followupProposals.map((fp, i) => (
                    <div key={i} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{ACTION_ICONS[fp.action] ?? "✉️"}</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900">{fp.suggestedSubject}</p>
                          <p className="text-[11px] text-gray-500">{fp.targetDescription}</p>
                        </div>
                        <Badge className={`text-[10px] border-0 ${
                          fp.urgency === "high" ? "bg-red-100 text-red-800" :
                          fp.urgency === "medium" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {fp.urgency === "high" ? "Urgente" : fp.urgency === "medium" ? "Normale" : "Bassa"}
                        </Badge>
                      </div>
                      <div className="bg-white rounded px-2.5 py-1.5 border border-indigo-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Anteprima corpo</p>
                        <p className="text-xs text-gray-700 line-clamp-2">{fp.suggestedBody}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <ShieldCheck className="h-3 w-3 text-indigo-500" />
                        Salvato in Proposte Agenti per approvazione
                        {fp.scheduledAt && (
                          <span className="ml-1">· Schedulato: {new Date(fp.scheduledAt).toLocaleString("it-IT")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <div className="bg-white rounded-lg border border-sky-100 p-3 space-y-2">
                  <p className="text-xs text-gray-700">{result.summary}</p>
                  {result.priorityAction && (
                    <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                      <Sparkles className="h-3.5 w-3.5 text-sky-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-sky-800">
                        Priorità: {result.priorityAction}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── Form Audit Agent ──────────────────────────────────────────────────────────

const SCORE_LABEL_CONFIG: Record<string, { label: string; color: string }> = {
  ottimo: { label: "Ottimo", color: "bg-green-100 text-green-800" },
  buono: { label: "Buono", color: "bg-blue-100 text-blue-800" },
  migliorabile: { label: "Migliorabile", color: "bg-yellow-100 text-yellow-800" },
  critico: { label: "Critico", color: "bg-red-100 text-red-800" },
}

const ISSUE_SEVERITY_COLOR: Record<string, string> = {
  high: "bg-red-50 border-red-200 text-red-700",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
  low: "bg-blue-50 border-blue-200 text-blue-700",
}

const IMPROVEMENT_TYPE_LABELS: Record<string, string> = {
  relabel: "Rinomina",
  retype: "Cambia tipo",
  set_required: "Rendi obbligatorio",
  reorder: "Riordina",
  merge: "Unisci",
  add_placeholder: "Aggiungi placeholder",
  add_options: "Aggiungi opzioni",
}

const FOLLOWUP_ACTION_LABELS: Record<string, string> = {
  tag_in_notes: "Tag in note",
  notify_team: "Notifica team",
  assign_group: "Assegna gruppo",
  send_email: "Invia email",
  assign_hotel: "Assegna hotel",
  flag_for_review: "Flag per revisione",
}

function FieldIssueCard({ issue }: { issue: FieldIssue }) {
  const colors = ISSUE_SEVERITY_COLOR[issue.severity] ?? "bg-gray-50 border-gray-200 text-gray-700"
  return (
    <div className={`rounded-lg border p-2.5 ${colors}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold truncate">{issue.fieldLabel}</span>
        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${colors}`}>
          {issue.issueType.replace(/_/g, " ")}
        </Badge>
      </div>
      <p className="text-xs">{issue.description}</p>
      <p className="text-[10px] mt-0.5 opacity-70">→ {issue.suggestion}</p>
    </div>
  )
}

function ImprovementCard({ imp }: { imp: FieldImprovement }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-2.5 space-y-1">
      <div className="flex items-center gap-2">
        <Badge className="bg-violet-100 text-violet-800 text-[10px] border-0">
          {IMPROVEMENT_TYPE_LABELS[imp.improvementType] ?? imp.improvementType}
        </Badge>
        <span className="text-xs font-medium text-gray-800 truncate">{imp.fieldLabel}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-red-600 line-through truncate max-w-[120px]">{imp.currentValue}</span>
        <span className="text-gray-400">→</span>
        <span className="text-green-700 font-medium truncate max-w-[120px]">{imp.newValue}</span>
      </div>
      <p className="text-[10px] text-gray-500 italic">{imp.rationale}</p>
    </div>
  )
}

function FollowupCard({ mapping }: { mapping: FollowupMapping }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 space-y-1">
      <div className="flex items-center gap-2">
        <Badge className={`text-[10px] border-0 ${mapping.automate ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
          {mapping.automate ? "Automatizzabile" : "Manuale"}
        </Badge>
        <span className="text-xs font-medium text-gray-800 truncate">{mapping.fieldLabel}</span>
      </div>
      <p className="text-[10px] text-gray-500">Trigger: {mapping.triggerCondition}</p>
      <div className="flex items-center gap-1.5">
        <Badge className="bg-blue-100 text-blue-800 text-[10px] border-0">
          {FOLLOWUP_ACTION_LABELS[mapping.actionType] ?? mapping.actionType}
        </Badge>
        <p className="text-xs text-gray-700">{mapping.actionDescription}</p>
      </div>
    </div>
  )
}

export function FormAuditAgent({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<FormAuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<"issues" | "improvements" | "followups">("issues")

  async function run() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/agents/form-audit`, { method: "POST" })
      if (!res.ok) return
      const data: FormAuditResult = await res.json()
      setResult(data)
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const scoreConfig = result ? (SCORE_LABEL_CONFIG[result.scoreLabel] ?? SCORE_LABEL_CONFIG.critico) : null

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-violet-600" />
            <CardTitle className="text-sm text-violet-900">Form Audit Agent</CardTitle>
            {result && scoreConfig && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-sm font-bold text-gray-800">{result.auditScore}/100</span>
                <Badge className={`text-[10px] border-0 ${scoreConfig.color}`}>{scoreConfig.label}</Badge>
                {result.proposalId && (
                  <Badge className="bg-indigo-100 text-indigo-700 text-[10px] border-0">In coda</Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {result && (
              <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="h-7 px-2">
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              size="sm"
              onClick={run}
              disabled={loading}
              className="gap-1.5 bg-violet-500 hover:bg-violet-600 text-white h-7 px-3 text-xs"
            >
              {loading ? (
                <><RefreshCw className="h-3 w-3 animate-spin" />Audit...</>
              ) : (
                <><Bot className="h-3 w-3" />{result ? "Riesegui" : "Analizza form"}</>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-violet-700 mt-1">
          Analizza la struttura del form di registrazione e propone miglioramenti UX
        </p>
      </CardHeader>

      {open && result && (
        <CardContent className="pt-0 space-y-3">
          {/* Summary */}
          <div className="bg-white rounded-lg border border-violet-100 p-3 space-y-2">
            <p className="text-xs text-gray-700">{result.summary}</p>
            {result.topPriority && (
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                <Sparkles className="h-3.5 w-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-violet-800">
                  Priorità: {result.topPriority}
                </p>
              </div>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1">
            {(["issues", "improvements", "followups"] as const).map((tab) => {
              const counts = { issues: result.issues.length, improvements: result.improvements.length, followups: result.followupMappings.length }
              const labels = { issues: "Problemi", improvements: "Miglioramenti", followups: "Follow-up" }
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    activeTab === tab
                      ? "bg-violet-600 text-white border-violet-600"
                      : "text-gray-500 border-gray-200 hover:border-violet-300"
                  }`}
                >
                  {labels[tab]}
                  {counts[tab] > 0 && (
                    <span className={`text-[9px] font-bold px-1 rounded-full ${activeTab === tab ? "bg-white/20" : "bg-gray-100"}`}>
                      {counts[tab]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {activeTab === "issues" && (
            result.issues.length === 0 ? (
              <div className="text-center py-3 text-xs text-green-700 bg-green-50 rounded-lg border border-green-200">
                Nessun problema rilevato nel form
              </div>
            ) : (
              <div className="space-y-1.5">
                {result.issues
                  .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]))
                  .map((issue, i) => <FieldIssueCard key={i} issue={issue} />)}
              </div>
            )
          )}

          {activeTab === "improvements" && (
            result.improvements.length === 0 ? (
              <div className="text-center py-3 text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                Nessun miglioramento proposto
              </div>
            ) : (
              <div className="space-y-1.5">
                {result.improvements.map((imp, i) => <ImprovementCard key={i} imp={imp} />)}
                {result.proposalId && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pt-1">
                    <ShieldCheck className="h-3 w-3 text-indigo-500" />
                    {result.improvements.length} modifiche salvate in Proposte Agenti per approvazione
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === "followups" && (
            result.followupMappings.length === 0 ? (
              <div className="text-center py-3 text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                Nessuna azione di follow-up mappata
              </div>
            ) : (
              <div className="space-y-1.5">
                {result.followupMappings.map((mapping, i) => <FollowupCard key={i} mapping={mapping} />)}
              </div>
            )
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── Email Draft Agent ─────────────────────────────────────────────────────────

export function EmailDraftAgent({ eventId }: { eventId: string }) {
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [situation, setSituation] = useState("")
  const [showInput, setShowInput] = useState(false)

  async function generate(customSituation?: string) {
    setLoading(true)
    setDraft(null)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/agents/email-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: customSituation || undefined }),
      })
      if (!res.ok) return
      const data = await res.json()
      setDraft(data.draft)
    } finally {
      setLoading(false)
    }
  }

  const QUICK_SITUATIONS = [
    "Ricorda ai pending di confermare",
    "Aumenta il tasso di check-in",
    "Promuovi partecipanti dalla waitlist",
    "Invita a portare un collega",
  ]

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm text-purple-900">Email Draft Agent</CardTitle>
        </div>
        <p className="text-xs text-purple-700 mt-1">
          L&apos;agent analizza i dati e genera una bozza email pronta all&apos;invio
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick situations */}
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_SITUATIONS.map((s) => (
            <button
              key={s}
              onClick={() => generate(s)}
              disabled={loading}
              className="text-left text-xs text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-2 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Custom situation */}
        <div>
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {showInput ? "Nascondi" : "Situazione personalizzata..."}
          </button>
          {showInput && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Descrivi la situazione..."
                rows={2}
                className="text-xs resize-none flex-1"
              />
              <Button
                size="sm"
                onClick={() => generate(situation)}
                disabled={loading || !situation.trim()}
                className="self-end"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => generate()}
          disabled={loading}
          className="w-full gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          {loading ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Agent in esecuzione...</>
          ) : (
            <><Bot className="h-3.5 w-3.5" />Genera automaticamente</>
          )}
        </Button>

        {draft && <DraftCard draft={draft} eventId={eventId} onSend={() => setDraft(null)} />}
      </CardContent>
    </Card>
  )
}
