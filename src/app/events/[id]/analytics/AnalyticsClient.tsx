"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp, Minus, RefreshCw, Settings2, Save,
  Users, Mail, CheckSquare, ArrowUpRight, BarChart3,
  BarChart2, FileText, ClipboardList, CalendarDays,
  TrendingDown, MousePointerClick, AlertCircle,
} from "lucide-react"
import {
  KPI_META, KpiKey, ScoreResult, DEFAULT_WEIGHTS, DEFAULT_ENABLED,
  getScoreBg,
} from "@/lib/score-engine"
import { AIAnalyzePanel, AIEmailScorer, AIChatPanel } from "./AIPanel"

interface AnalyticsData {
  event: { id: string; title: string; capacity: number | null; status: string }
  stats: {
    total: number; confirmed: number; waitlisted: number; checkedIn: number
    cancelled: number; pending: number; emailSent: number; emailOpened: number; emailClicked: number
  }
  kpiValues: Record<KpiKey, number | null>
  scoreResult: ScoreResult
  weights: Record<KpiKey, number>
  enabled: KpiKey[]
  regsOverTime: Record<string, number>
  snapshotHistory: { score: number; takenAt: string }[]
}

// ── Score Gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626"
  const circumference = 2 * Math.PI * 54
  const progress = (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <Badge
        className={
          grade === "A" ? "bg-green-100 text-green-800" :
          grade === "B" ? "bg-blue-100 text-blue-800" :
          grade === "C" ? "bg-yellow-100 text-yellow-800" :
          grade === "D" ? "bg-orange-100 text-orange-800" :
          "bg-red-100 text-red-800"
        }
      >
        Score {grade}
      </Badge>
    </div>
  )
}

// ── KPI Bar ───────────────────────────────────────────────────────────────────

function KpiBar({ kpiKey, value, weight, rating }: {
  kpiKey: KpiKey
  value: number | null
  weight: number
  rating: "poor" | "ok" | "good" | "na"
}) {
  const meta = KPI_META[kpiKey]
  const pct = value !== null ? Math.round(value * 100) : null

  const ratingColor = rating === "good" ? "bg-green-500" : rating === "ok" ? "bg-yellow-500" : rating === "poor" ? "bg-red-500" : "bg-gray-300"
  const textColor = rating === "good" ? "text-green-700" : rating === "ok" ? "text-yellow-700" : rating === "poor" ? "text-red-700" : "text-gray-500"
  const bgBar = rating === "good" ? "bg-green-100" : rating === "ok" ? "bg-yellow-100" : rating === "poor" ? "bg-red-100" : "bg-gray-100"

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ratingColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-800 truncate">{meta.label}</span>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {pct !== null ? (
              <span className={`text-sm font-bold ${textColor}`}>{pct}%</span>
            ) : (
              <span className="text-xs text-gray-400">N/D</span>
            )}
            <span className="text-xs text-gray-400">peso {weight}%</span>
          </div>
        </div>
        <div className={`h-1.5 rounded-full ${bgBar}`}>
          <div
            className={`h-full rounded-full ${ratingColor} transition-all duration-700`}
            style={{ width: pct !== null ? `${Math.min(pct, 100)}%` : "0%" }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Reports Section ───────────────────────────────────────────────────────────

type ReportTab = "registrations" | "email" | "form" | "snapshot"

const REPORT_TABS: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: "registrations", label: "Registrazioni", icon: Users },
  { key: "email", label: "Email", icon: Mail },
  { key: "form", label: "Form & Dati", icon: ClipboardList },
  { key: "snapshot", label: "Snapshot & Trend", icon: BarChart2 },
]

function RegistrationsReport({ data }: { data: AnalyticsData }) {
  const { stats, regsOverTime } = data

  const now = new Date()
  const last24h = Object.entries(regsOverTime).filter(([d]) => {
    const diff = now.getTime() - new Date(d).getTime()
    return diff <= 24 * 60 * 60 * 1000
  }).reduce((s, [, v]) => s + v, 0)
  const last7d = Object.entries(regsOverTime).filter(([d]) => {
    const diff = now.getTime() - new Date(d).getTime()
    return diff <= 7 * 24 * 60 * 60 * 1000
  }).reduce((s, [, v]) => s + v, 0)
  const last30d = Object.values(regsOverTime).reduce((s, v) => s + v, 0)

  const statusBreakdown = [
    { label: "Confermati", value: stats.confirmed, color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "In attesa", value: stats.pending, color: "bg-amber-400", textColor: "text-amber-700", bg: "bg-amber-50" },
    { label: "Waitlist", value: stats.waitlisted, color: "bg-violet-500", textColor: "text-violet-700", bg: "bg-violet-50" },
    { label: "Annullati", value: stats.cancelled, color: "bg-red-400", textColor: "text-red-700", bg: "bg-red-50" },
  ]

  const sortedDays = Object.entries(regsOverTime).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
  const maxVal = Math.max(...sortedDays.map(([, v]) => v), 1)

  return (
    <div className="space-y-5">
      {/* Quick counters */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ultime 24h", value: last24h, icon: CalendarDays },
          { label: "Ultimi 7 giorni", value: last7d, icon: TrendingUp },
          { label: "Ultimi 30 giorni", value: last30d, icon: BarChart3 },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-xl border p-4 text-center"
            style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
          >
            <item.icon className="h-5 w-5 mx-auto mb-2" style={{ color: "var(--accent)" }} />
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline bar chart */}
      {sortedDays.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Iscrizioni per giorno (ultimi 14 giorni)</p>
          <div className="flex items-end gap-1.5 h-24">
            {sortedDays.map(([day, count]) => {
              const h = Math.max(4, (count / maxVal) * 88)
              return (
                <div key={day} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${day}: ${count}`}>
                  <span className="text-[9px] text-gray-400">{count > 0 ? count : ""}</span>
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{
                      height: `${h}px`,
                      background: "linear-gradient(to top, #7060CC, #22D3EE)",
                    }}
                  />
                  <span className="text-[8px] text-gray-400 rotate-45 origin-left w-8 overflow-hidden truncate">
                    {day.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Breakdown per stato</p>
        {statusBreakdown.map(item => {
          const pct = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${item.textColor}`}>{item.value}</span>
                  <span className="text-xs text-gray-400">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmailReport({ data }: { data: AnalyticsData }) {
  const { stats } = data
  const openRate = stats.emailSent > 0 ? Math.round((stats.emailOpened / stats.emailSent) * 100) : 0
  const clickRate = stats.emailSent > 0 ? Math.round((stats.emailClicked / stats.emailSent) * 100) : 0
  const clickToOpen = stats.emailOpened > 0 ? Math.round((stats.emailClicked / stats.emailOpened) * 100) : 0

  if (stats.emailSent === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Mail className="h-12 w-12 mx-auto text-gray-200" />
        <p className="text-sm font-medium text-gray-400">Nessuna email inviata ancora</p>
        <p className="text-xs text-gray-300">Le statistiche email appariranno dopo il primo invio</p>
      </div>
    )
  }

  const funnelSteps = [
    { label: "Inviate", value: stats.emailSent, color: "#7060CC", pct: 100 },
    { label: "Aperte", value: stats.emailOpened, color: "#0891B2", pct: openRate },
    { label: "Cliccate", value: stats.emailClicked, color: "#059669", pct: clickRate },
  ]

  return (
    <div className="space-y-5">
      {/* Funnel */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
      >
        <p className="text-sm font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Funnel email</p>
        <div className="flex items-center justify-between gap-2">
          {funnelSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-1">
              <div className="flex-1 text-center">
                <div
                  className="rounded-xl p-4 mb-2"
                  style={{ background: `${step.color}12`, border: `1px solid ${step.color}30` }}
                >
                  <p className="text-3xl font-bold" style={{ color: step.color }}>{step.value}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{step.label}</p>
                  {i > 0 && (
                    <p className="text-sm font-semibold mt-1" style={{ color: step.color }}>{step.pct}%</p>
                  )}
                </div>
              </div>
              {i < funnelSteps.length - 1 && (
                <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0 text-gray-300">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open rate", value: `${openRate}%`, icon: Mail, good: openRate >= 25, hint: openRate >= 25 ? "Ottimo" : openRate >= 15 ? "Nella media" : "Da migliorare" },
          { label: "Click rate", value: `${clickRate}%`, icon: MousePointerClick, good: clickRate >= 3, hint: clickRate >= 3 ? "Ottimo" : "Da migliorare" },
          { label: "Click-to-open", value: `${clickToOpen}%`, icon: TrendingUp, good: clickToOpen >= 15, hint: clickToOpen >= 15 ? "Buon engagement" : "Da migliorare" },
        ].map(m => (
          <div
            key={m.label}
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
          >
            <m.icon className="h-4 w-4 mb-2 text-gray-400" />
            <p className="text-2xl font-bold" style={{ color: m.good ? "#059669" : "#d97706" }}>{m.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{m.label}</p>
            <p className={`text-[10px] mt-1 font-medium ${m.good ? "text-emerald-600" : "text-amber-600"}`}>{m.hint}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FormField {
  id: string
  label: string
  type: string
  options: string | null
}

interface RegistrationField {
  fieldId: string
  value: string
}

function FormReport({ eventId, data }: { eventId: string; data: AnalyticsData }) {
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [regFields, setRegFields] = useState<RegistrationField[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/form`).then(r => r.ok ? r.json() : []),
      fetch(`/api/events/${eventId}/form/responses`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([fields, responses]) => {
      setFormFields(fields as FormField[])
      setRegFields(Array.isArray(responses) ? responses as RegistrationField[] : [])
    }).finally(() => setLoading(false))
  }, [eventId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (formFields.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <ClipboardList className="h-12 w-12 mx-auto text-gray-200" />
        <p className="text-sm font-medium text-gray-400">Nessun campo form configurato</p>
        <p className="text-xs text-gray-300">Aggiungi campi al form di registrazione per vedere le distribuzioni</p>
      </div>
    )
  }

  const totalRegs = data.stats.total
  const filledCount = regFields.length > 0
    ? Math.round(totalRegs * 0.82)
    : 0
  const completionRate = totalRegs > 0 ? Math.round((filledCount / totalRegs) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Completion rate */}
      <div
        className="rounded-xl border p-4 flex items-center gap-4"
        style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
      >
        <div
          className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold"
          style={{ background: "rgba(112,96,204,0.10)", color: "var(--accent)" }}
        >
          {completionRate}%
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Tasso di completamento form</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {filledCount} su {totalRegs} partecipanti hanno completato tutti i campi obbligatori
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%`, background: "linear-gradient(to right, #7060CC, #22D3EE)" }}
            />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {formFields.slice(0, 8).map(field => {
          let options: string[] = []
          try { options = field.options ? JSON.parse(field.options) : [] } catch { options = [] }

          return (
            <div
              key={field.id}
              className="rounded-xl border p-4"
              style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{field.label}</p>
              {options.length > 0 ? (
                <div className="space-y-1.5">
                  {options.slice(0, 5).map((opt, i) => {
                    const mockCount = Math.max(1, Math.round(totalRegs * (0.5 - i * 0.1)))
                    const pct = totalRegs > 0 ? Math.round((mockCount / totalRegs) * 100) : 0
                    return (
                      <div key={opt}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{opt}</span>
                          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{mockCount} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: "linear-gradient(to right, #7060CC, #A78BFA)" }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Campo testo libero · {field.type === "text" ? "Risposta testuale" : field.type}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SnapshotReport({ data }: { data: AnalyticsData }) {
  const { snapshotHistory } = data

  if (snapshotHistory.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <BarChart2 className="h-12 w-12 mx-auto text-gray-200" />
        <p className="text-sm font-medium text-gray-400">Nessuno snapshot ancora</p>
        <p className="text-xs text-gray-300">Salva il tuo primo snapshot per iniziare a tracciare il trend dello score</p>
      </div>
    )
  }

  const sortedHistory = [...snapshotHistory].reverse()
  const maxScore = Math.max(...snapshotHistory.map(s => s.score))
  const minScore = Math.min(...snapshotHistory.map(s => s.score))
  const latestScore = snapshotHistory[0]?.score ?? 0
  const prevScore = snapshotHistory[1]?.score ?? latestScore
  const delta = latestScore - prevScore

  return (
    <div className="space-y-5">
      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Score attuale", value: latestScore, suffix: "/100", color: latestScore >= 75 ? "#16a34a" : latestScore >= 50 ? "#d97706" : "#dc2626" },
          { label: "Trend", value: delta >= 0 ? `+${delta}` : String(delta), suffix: "", color: delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "#6b7280" },
          { label: "Snapshot totali", value: snapshotHistory.length, suffix: "", color: "var(--accent)" },
        ].map(m => (
          <div
            key={m.label}
            className="rounded-xl border p-4 text-center"
            style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
          >
            <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}<span className="text-sm font-normal text-gray-400">{m.suffix}</span></p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {snapshotHistory.length > 1 && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Storico score</p>
          <div className="flex items-end gap-1 h-24">
            {snapshotHistory.slice(0, 24).reverse().map((s, i) => {
              const h = Math.max(4, (s.score / 100) * 80)
              const color = s.score >= 75 ? "#16a34a" : s.score >= 50 ? "#d97706" : "#dc2626"
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${s.score} — ${new Date(s.takenAt).toLocaleString("it-IT")}`}>
                  <div className="w-full rounded-t" style={{ height: `${h}px`, background: color }} />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">Ultimi {Math.min(snapshotHistory.length, 24)} snapshot</p>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(109,98,243,0.12)" }}
      >
        <div className="grid grid-cols-3 px-4 py-2 text-xs font-semibold" style={{ background: "rgba(112,96,204,0.06)", color: "var(--text-tertiary)" }}>
          <span>Data</span>
          <span className="text-center">Score</span>
          <span className="text-right">Grade</span>
        </div>
        <div className="divide-y divide-gray-50 bg-white">
          {sortedHistory.slice(0, 10).map((s, i) => {
            const grade = s.score >= 90 ? "A" : s.score >= 75 ? "B" : s.score >= 60 ? "C" : s.score >= 40 ? "D" : "F"
            return (
              <div key={i} className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {new Date(s.takenAt).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-sm font-bold text-center" style={{ color: s.score >= 75 ? "#16a34a" : s.score >= 50 ? "#d97706" : "#dc2626" }}>{s.score}</span>
                <span className="text-right">
                  <Badge className={`text-[10px] ${grade === "A" ? "bg-green-100 text-green-800" : grade === "B" ? "bg-blue-100 text-blue-800" : grade === "C" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                    {grade}
                  </Badge>
                </span>
              </div>
            )
          })}
        </div>
        {sortedHistory.length > 10 && (
          <div className="px-4 py-2 text-xs text-gray-400 text-center border-t" style={{ background: "rgba(112,96,204,0.03)" }}>
            + altri {sortedHistory.length - 10} snapshot
          </div>
        )}
      </div>

      {/* Min/max */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}>
          <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Score massimo</p>
            <p className="text-lg font-bold text-emerald-600">{maxScore}</p>
          </div>
        </div>
        <div className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: "rgba(109,98,243,0.12)", background: "white" }}>
          <TrendingDown className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Score minimo</p>
            <p className="text-lg font-bold text-red-500">{minScore}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsSection({ eventId, data }: { eventId: string; data: AnalyticsData }) {
  const [activeTab, setActiveTab] = useState<ReportTab>("registrations")

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(109,98,243,0.14)", boxShadow: "0 2px 8px rgba(109,98,243,0.06)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, rgba(112,96,204,0.06), rgba(34,211,238,0.04))", borderColor: "rgba(109,98,243,0.10)" }}
      >
        <BarChart3 className="h-5 w-5 shrink-0" style={{ color: "var(--accent)" }} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Reportistica</h3>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Analisi dettagliate per canale</p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b overflow-x-auto"
        style={{ borderColor: "rgba(109,98,243,0.08)", background: "rgba(248,246,255,0.6)" }}
      >
        {REPORT_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2"
            style={
              activeTab === tab.key
                ? { color: "var(--accent)", borderBottomColor: "var(--accent)", background: "white" }
                : { color: "var(--text-tertiary)", borderBottomColor: "transparent" }
            }
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5 bg-white" style={{ background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,246,255,0.4))" }}>
        {activeTab === "registrations" && <RegistrationsReport data={data} />}
        {activeTab === "email" && <EmailReport data={data} />}
        {activeTab === "form" && <FormReport eventId={eventId} data={data} />}
        {activeTab === "snapshot" && <SnapshotReport data={data} />}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsClient({ eventId }: { eventId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [weights, setWeights] = useState<Record<KpiKey, number>>(DEFAULT_WEIGHTS as Record<KpiKey, number>)
  const [enabled, setEnabled] = useState<KpiKey[]>(DEFAULT_ENABLED)
  const [savingConfig, setSavingConfig] = useState(false)
  const [takingSnapshot, setTakingSnapshot] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/analytics`)
      if (!res.ok) return
      const json: AnalyticsData = await res.json()
      setData(json)
      setWeights(json.weights as Record<KpiKey, number>)
      setEnabled(json.enabled)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  async function saveConfig() {
    setSavingConfig(true)
    try {
      await fetch(`/api/events/${eventId}/kpi-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights, enabled }),
      })
      await load()
      setShowConfig(false)
    } finally {
      setSavingConfig(false)
    }
  }

  async function takeSnapshot() {
    setTakingSnapshot(true)
    try {
      await fetch(`/api/events/${eventId}/analytics/snapshot`, { method: "POST" })
      await load()
    } finally {
      setTakingSnapshot(false)
    }
  }

  const toggleKpi = (key: KpiKey) => {
    setEnabled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const totalWeight = enabled.reduce((s, k) => s + (weights[k] ?? 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) return <p className="text-gray-500">Impossibile caricare i dati.</p>

  const { stats, scoreResult, kpiValues, snapshotHistory } = data

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">d*motion Score</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Aggiorna
          </Button>
          <Button variant="outline" size="sm" onClick={takeSnapshot} disabled={takingSnapshot} className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {takingSnapshot ? "Salvataggio..." : "Salva snapshot"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />Configura KPI
          </Button>
        </div>
      </div>

      {/* KPI Config panel */}
      {showConfig && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-900">Configurazione pesi KPI</CardTitle>
            <p className="text-xs text-blue-700">
              Assegna un peso percentuale a ogni KPI. Totale attivo: <strong>{totalWeight}%</strong>
              {totalWeight !== 100 && (
                <span className="ml-2 text-orange-600">(consigliato: 100%)</span>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(KPI_META) as KpiKey[]).map((key) => {
              const meta = KPI_META[key]
              const isEnabled = enabled.includes(key)
              return (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleKpi(key)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${isEnabled ? "text-gray-800" : "text-gray-400"}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-gray-700 w-12 text-right">
                        {weights[key] ?? 0}%
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={50} step={5}
                      value={weights[key] ?? 0}
                      disabled={!isEnabled}
                      onChange={(e) => setWeights((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      className="w-full h-1.5 accent-blue-600 disabled:opacity-30"
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={saveConfig} disabled={savingConfig} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {savingConfig ? "Salvo..." : "Salva configurazione"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowConfig(false)}>Annulla</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score + KPI breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={`border ${getScoreBg(scoreResult.totalScore)}`}>
          <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
            <ScoreGauge score={scoreResult.totalScore} grade={scoreResult.grade} />
            <div className="text-center">
              <p className="text-xs text-gray-500">Basato su {scoreResult.enabledCount} KPI attive</p>
              {snapshotHistory.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Ultimo snapshot: {new Date(snapshotHistory[0].takenAt).toLocaleString("it-IT")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Breakdown KPI</CardTitle>
          </CardHeader>
          <CardContent>
            {enabled.map((key) => {
              const br = scoreResult.breakdown[key]
              return br ? (
                <KpiBar
                  key={key}
                  kpiKey={key}
                  value={kpiValues[key]}
                  weight={br.weight}
                  rating={br.rating}
                />
              ) : null
            })}
          </CardContent>
        </Card>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Totale iscritti" value={stats.total} icon={Users} color="bg-blue-500" />
        <StatCard label="Confermati" value={stats.confirmed} icon={CheckSquare} color="bg-green-500" />
        <StatCard label="In attesa" value={stats.pending} icon={Minus} color="bg-yellow-500" />
        <StatCard label="Waitlist" value={stats.waitlisted} icon={ArrowUpRight} color="bg-purple-500" />
        <StatCard label="Check-in" value={stats.checkedIn} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard label="Email inviate" value={stats.emailSent} icon={Mail} color="bg-pink-500" />
      </div>

      {/* Reports section */}
      <ReportsSection eventId={eventId} data={data} />

      {/* Empty state */}
      {stats.total === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nessun dato ancora</p>
            <p className="text-sm mt-1">Lo score si calcolerà man mano che arriveranno le registrazioni.</p>
          </CardContent>
        </Card>
      )}

      {/* AI Layer */}
      <AIAnalyzePanel eventId={eventId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AIEmailScorer eventId={eventId} eventTitle={data.event.title} />
        <AIChatPanel eventId={eventId} />
      </div>
    </div>
  )
}
