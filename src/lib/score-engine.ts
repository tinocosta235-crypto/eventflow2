// d*motion Score Engine
// Calcola uno score 0-100 per evento basato su KPI pesate configurabili

export type KpiKey =
  | "registration_rate"
  | "confirmed_rate"
  | "checkin_rate"
  | "email_open_rate"
  | "email_click_rate"
  | "form_completion_rate"
  | "waitlist_conversion"

export interface KpiWeights {
  registration_rate: number
  confirmed_rate: number
  checkin_rate: number
  email_open_rate: number
  email_click_rate: number
  form_completion_rate: number
  waitlist_conversion: number
}

export interface KpiValues {
  registration_rate: number | null
  confirmed_rate: number | null
  checkin_rate: number | null
  email_open_rate: number | null
  email_click_rate: number | null
  form_completion_rate: number | null
  waitlist_conversion: number | null
}

export interface KpiMeta {
  key: KpiKey
  label: string
  description: string
  format: "percent" | "ratio" | "number"
  higherIsBetter: boolean
  benchmarks: { poor: number; ok: number; good: number }
}

export interface ScoreResult {
  totalScore: number
  breakdown: Record<KpiKey, {
    value: number | null
    weight: number
    contribution: number
    rating: "poor" | "ok" | "good" | "na"
  }>
  grade: "A" | "B" | "C" | "D" | "F"
  enabledCount: number
}

export const DEFAULT_WEIGHTS: KpiWeights = {
  registration_rate: 25,
  confirmed_rate: 20,
  checkin_rate: 15,
  email_open_rate: 15,
  email_click_rate: 10,
  form_completion_rate: 10,
  waitlist_conversion: 5,
}

export const DEFAULT_ENABLED: KpiKey[] = [
  "registration_rate",
  "confirmed_rate",
  "checkin_rate",
  "email_open_rate",
  "email_click_rate",
  "form_completion_rate",
  "waitlist_conversion",
]

export const KPI_META: Record<KpiKey, KpiMeta> = {
  registration_rate: {
    key: "registration_rate",
    label: "Tasso di registrazione",
    description: "Registrati rispetto alla capacità massima dell'evento",
    format: "percent",
    higherIsBetter: true,
    benchmarks: { poor: 0.3, ok: 0.6, good: 0.85 },
  },
  confirmed_rate: {
    key: "confirmed_rate",
    label: "Tasso di conferma",
    description: "Partecipanti confermati sul totale dei registrati",
    format: "percent",
    higherIsBetter: true,
    benchmarks: { poor: 0.5, ok: 0.7, good: 0.9 },
  },
  checkin_rate: {
    key: "checkin_rate",
    label: "Tasso di check-in",
    description: "Check-in effettuati rispetto ai confermati",
    format: "percent",
    higherIsBetter: true,
    benchmarks: { poor: 0.5, ok: 0.7, good: 0.85 },
  },
  email_open_rate: {
    key: "email_open_rate",
    label: "Open rate email",
    description: "Email aperte sul totale inviate",
    format: "percent",
    higherIsBetter: true,
    benchmarks: { poor: 0.15, ok: 0.3, good: 0.45 },
  },
  email_click_rate: {
    key: "email_click_rate",
    label: "Click rate email",
    description: "Click nelle email sul totale inviate",
    format: "percent",
    higherIsBetter: true,
    benchmarks: { poor: 0.02, ok: 0.05, good: 0.1 },
  },
  form_completion_rate: {
    key: "form_completion_rate",
    label: "Completamento form",
    description: "Form di registrazione completati rispetto agli avviati",
    format: "percent",
    higherIsBetter: true,
    benchmarks: { poor: 0.4, ok: 0.65, good: 0.85 },
  },
  waitlist_conversion: {
    key: "waitlist_conversion",
    label: "Conversione waitlist",
    description: "Passaggi da waitlist a confermato",
    format: "percent",
    higherIsBetter: true,
    benchmarks: { poor: 0.2, ok: 0.5, good: 0.8 },
  },
}

function rateKpi(value: number, meta: KpiMeta): "poor" | "ok" | "good" {
  if (value >= meta.benchmarks.good) return "good"
  if (value >= meta.benchmarks.ok) return "ok"
  return "poor"
}

// Normalizza un valore KPI in un punteggio 0-100 basato sui benchmark
function normalizeKpi(value: number, meta: KpiMeta): number {
  const { poor, ok, good } = meta.benchmarks
  if (value >= good) return 100
  if (value >= ok) return 60 + ((value - ok) / (good - ok)) * 40
  if (value >= poor) return 20 + ((value - poor) / (ok - poor)) * 40
  return (value / poor) * 20
}

export function computeScore(
  values: KpiValues,
  weights: KpiWeights,
  enabled: KpiKey[]
): ScoreResult {
  let totalWeight = 0
  let weightedSum = 0

  const breakdown = {} as ScoreResult["breakdown"]

  for (const key of enabled) {
    const meta = KPI_META[key]
    const weight = weights[key] ?? 0
    const value = values[key]

    if (value === null || value === undefined) {
      breakdown[key] = { value: null, weight, contribution: 0, rating: "na" }
      continue
    }

    const normalized = normalizeKpi(value, meta)
    const contribution = (normalized * weight) / 100
    totalWeight += weight
    weightedSum += contribution

    breakdown[key] = {
      value,
      weight,
      contribution: Math.round(contribution * 10) / 10,
      rating: rateKpi(value, meta),
    }
  }

  const totalScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100)
    : 0

  const grade =
    totalScore >= 90 ? "A" :
    totalScore >= 75 ? "B" :
    totalScore >= 60 ? "C" :
    totalScore >= 40 ? "D" : "F"

  return { totalScore, breakdown, grade, enabledCount: enabled.length }
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-600"
  if (score >= 50) return "text-yellow-600"
  return "text-red-600"
}

export function getScoreBg(score: number): string {
  if (score >= 75) return "bg-green-50 border-green-200"
  if (score >= 50) return "bg-yellow-50 border-yellow-200"
  return "bg-red-50 border-red-200"
}
