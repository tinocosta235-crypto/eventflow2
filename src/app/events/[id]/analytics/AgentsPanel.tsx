"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Bot, RefreshCw, AlertTriangle, AlertCircle, Info,
  Sparkles, Copy, Check, Send, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react"
import type { ScoreMonitorResult, ScoreAlert } from "@/app/api/events/[id]/ai/agents/score-monitor/route"
import type { EmailDraft } from "@/app/api/events/[id]/ai/agents/email-draft/route"

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
          {/* Alert */}
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
              Nessuna anomalia rilevata — l'evento è in buona salute
            </div>
          )}

          {/* Summary + Priority */}
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

// ── Email Draft Agent ────────────────────────────────────────────────────────

const AUDIENCE_LABELS: Record<string, string> = {
  CONFIRMED: "Confermati",
  PENDING: "In attesa",
  WAITLISTED: "Waitlist",
  ALL: "Tutti gli iscritti",
}

const URGENCY_CONFIG = {
  high: { label: "Urgente", color: "bg-red-100 text-red-800" },
  medium: { label: "Normale", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "Bassa priorità", color: "bg-gray-100 text-gray-700" },
}

function DraftCard({ draft, eventId, onSend }: { draft: EmailDraft; eventId: string; onSend?: () => void }) {
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function copyToClipboard() {
    await navigator.clipboard.writeText(`OGGETTO: ${draft.subject}\n\n${draft.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function sendNow() {
    setSending(true)
    try {
      const statusFilter = draft.targetAudience === "ALL"
        ? ["CONFIRMED", "PENDING", "WAITLISTED"]
        : [draft.targetAudience]

      await fetch(`/api/events/${eventId}/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          subject: draft.subject,
          body: draft.body,
          statusFilter,
        }),
      })
      setSent(true)
      onSend?.()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-purple-100 p-4 space-y-3">
      {/* Header draft */}
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

      {/* Email preview */}
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

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5 flex-1">
          {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Copiato!</> : <><Copy className="h-3.5 w-3.5" />Copia</>}
        </Button>
        <Button
          size="sm"
          onClick={sendNow}
          disabled={sending || sent}
          className="gap-1.5 flex-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {sent ? (
            <><Check className="h-3.5 w-3.5" />Inviata!</>
          ) : sending ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Invio...</>
          ) : (
            <><Send className="h-3.5 w-3.5" />Invia ora</>
          )}
        </Button>
      </div>
    </div>
  )
}

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
          L'agent analizza i dati e genera una bozza email pronta all'invio
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
                placeholder="Descrivi la situazione... es. 'ci sono 30 iscritti in pending da 5 giorni'"
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

        {/* Auto-generate */}
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

        {/* Draft result */}
        {draft && <DraftCard draft={draft} eventId={eventId} onSend={() => setDraft(null)} />}
      </CardContent>
    </Card>
  )
}
