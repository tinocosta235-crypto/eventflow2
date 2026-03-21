"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp, Minus, RefreshCw, Settings2, Save,
  Users, Mail, CheckSquare, ArrowUpRight, BarChart3,
} from "lucide-react"
import {
  KPI_META, KpiKey, ScoreResult, DEFAULT_WEIGHTS, DEFAULT_ENABLED,
  getScoreBg,
} from "@/lib/score-engine"
import { AIAnalyzePanel, AIEmailScorer, AIChatPanel } from "./AIPanel"
// Agents moved to /events/[id]/agents page

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
        {/* Score gauge */}
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

        {/* KPI breakdown */}
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

      {/* Email stats */}
      {stats.emailSent > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.emailSent}</p>
                <p className="text-xs text-gray-500">Inviate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.emailSent > 0 ? Math.round((stats.emailOpened / stats.emailSent) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">Open rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.emailSent > 0 ? Math.round((stats.emailClicked / stats.emailSent) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">Click rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score history */}
      {snapshotHistory.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Storico score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-20">
              {snapshotHistory.slice(0, 24).reverse().map((s, i) => {
                const h = Math.max(4, (s.score / 100) * 80)
                const color = s.score >= 75 ? "bg-green-400" : s.score >= 50 ? "bg-yellow-400" : "bg-red-400"
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${s.score} — ${new Date(s.takenAt).toLocaleString("it-IT")}`}>
                    <div className={`w-full rounded-t ${color}`} style={{ height: `${h}px` }} />
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">Ultimi {Math.min(snapshotHistory.length, 24)} snapshot</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state quando non ci sono dati */}
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
