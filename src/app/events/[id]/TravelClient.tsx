"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plane, Train, Car, Bus, MoreHorizontal, Plus, Trash2,
  CheckCircle2, Circle, Loader2, ArrowRight, ArrowLeft,
} from "lucide-react"
import { toast } from "@/components/ui/toaster"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Registration {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string | null
}

interface TravelEntry {
  id: string
  registrationId: string
  direction: string
  type: string
  carrier: string | null
  flightNo: string | null
  departure: string | null
  arrival: string | null
  departureTime: string | null
  arrivalTime: string | null
  confirmed: boolean
  notes: string | null
  registration: Registration
}

const TRAVEL_TYPES = [
  { value: "FLIGHT", label: "Volo", icon: Plane },
  { value: "TRAIN", label: "Treno", icon: Train },
  { value: "CAR", label: "Auto", icon: Car },
  { value: "SHUTTLE", label: "Shuttle", icon: Bus },
  { value: "OTHER", label: "Altro", icon: MoreHorizontal },
]

function typeIcon(type: string) {
  const t = TRAVEL_TYPES.find((x) => x.value === type)
  const Icon = t?.icon ?? MoreHorizontal
  return <Icon className="h-3.5 w-3.5" />
}

// ── AddTravelForm ──────────────────────────────────────────────────────────────

function AddTravelForm({
  eventId,
  registrations,
  onAdd,
  onCancel,
}: {
  eventId: string
  registrations: Registration[]
  onAdd: (entry: TravelEntry) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    registrationId: "",
    direction: "INBOUND",
    type: "FLIGHT",
    carrier: "",
    flightNo: "",
    departure: "",
    arrival: "",
    departureTime: "",
    arrivalTime: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.registrationId) { toast("Seleziona un partecipante", { variant: "warning" }); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/travel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      })
      if (!res.ok) { toast("Errore", { variant: "error" }); return }
      const entry = await res.json()
      onAdd(entry)
      toast("Tratta aggiunta", { variant: "success" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Partecipante */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Partecipante *</label>
          <select value={form.registrationId} onChange={(e) => set("registrationId", e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleziona...</option>
            {registrations.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}{r.company ? ` — ${r.company}` : ""}</option>)}
          </select>
        </div>

        {/* Direzione */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Direzione</label>
          <select value={form.direction} onChange={(e) => set("direction", e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="INBOUND">→ Arrivo (inbound)</option>
            <option value="OUTBOUND">← Partenza (outbound)</option>
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mezzo</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TRAVEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Vettore */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vettore / Compagnia</label>
          <Input value={form.carrier} onChange={(e) => set("carrier", e.target.value)} placeholder="Ryanair, Trenitalia..." className="h-9 text-sm" />
        </div>

        {/* Numero volo/treno */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">N° volo / treno</label>
          <Input value={form.flightNo} onChange={(e) => set("flightNo", e.target.value)} placeholder="FR1234" className="h-9 text-sm" />
        </div>

        {/* Partenza */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Da</label>
          <Input value={form.departure} onChange={(e) => set("departure", e.target.value)} placeholder="MXP — Milano Malpensa" className="h-9 text-sm" />
        </div>

        {/* Arrivo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">A</label>
          <Input value={form.arrival} onChange={(e) => set("arrival", e.target.value)} placeholder="FCO — Roma Fiumicino" className="h-9 text-sm" />
        </div>

        {/* Orario partenza */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ora partenza</label>
          <Input type="datetime-local" value={form.departureTime} onChange={(e) => set("departureTime", e.target.value)} className="h-9 text-sm" />
        </div>

        {/* Orario arrivo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ora arrivo</label>
          <Input type="datetime-local" value={form.arrivalTime} onChange={(e) => set("arrivalTime", e.target.value)} className="h-9 text-sm" />
        </div>

        {/* Note */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
          <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Note aggiuntive..." className="h-9 text-sm" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          Aggiungi tratta
        </Button>
      </div>
    </form>
  )
}

// ── TravelRow ─────────────────────────────────────────────────────────────────

function TravelRow({
  entry,
  eventId,
  onUpdate,
  onDelete,
}: {
  entry: TravelEntry
  eventId: string
  onUpdate: (e: TravelEntry) => void
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function toggleConfirm() {
    setConfirming(true)
    try {
      const res = await fetch(`/api/events/${eventId}/travel/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: !entry.confirmed }),
      })
      if (res.ok) onUpdate(await res.json())
    } finally {
      setConfirming(false)
    }
  }

  async function deleteEntry() {
    setDeleting(true)
    try {
      await fetch(`/api/events/${eventId}/travel/${entry.id}`, { method: "DELETE" })
      onDelete(entry.id)
      toast("Tratta eliminata")
    } finally {
      setDeleting(false)
    }
  }

  const typeInfo = TRAVEL_TYPES.find((t) => t.value === entry.type)

  function formatDT(dt: string | null) {
    if (!dt) return null
    return new Date(dt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 group">
      {/* Direction icon */}
      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        entry.direction === "INBOUND" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
      }`}>
        {entry.direction === "INBOUND" ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
      </div>

      {/* Participant */}
      <div className="flex items-center gap-2 w-40 flex-shrink-0">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {entry.registration.firstName[0]}{entry.registration.lastName[0]}
        </div>
        <span className="text-xs font-medium text-gray-900 truncate">
          {entry.registration.firstName} {entry.registration.lastName}
        </span>
      </div>

      {/* Type badge */}
      <Badge variant="secondary" className="gap-1 text-xs flex-shrink-0">
        {typeIcon(entry.type)}{typeInfo?.label}
      </Badge>

      {/* Route */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 text-xs text-gray-600">
        {entry.carrier && <span className="font-medium text-gray-800">{entry.carrier}</span>}
        {entry.flightNo && <span className="text-gray-400">#{entry.flightNo}</span>}
        {(entry.departure || entry.arrival) && (
          <>
            {entry.departure && <span className="font-mono text-gray-700">{entry.departure}</span>}
            {entry.departure && entry.arrival && <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />}
            {entry.arrival && <span className="font-mono text-gray-700">{entry.arrival}</span>}
          </>
        )}
      </div>

      {/* Times */}
      <div className="text-xs text-gray-400 hidden lg:flex items-center gap-1.5 flex-shrink-0">
        {formatDT(entry.departureTime) && <span>{formatDT(entry.departureTime)}</span>}
        {formatDT(entry.departureTime) && formatDT(entry.arrivalTime) && <ArrowRight className="h-2.5 w-2.5" />}
        {formatDT(entry.arrivalTime) && <span>{formatDT(entry.arrivalTime)}</span>}
      </div>

      {/* Confirm */}
      <button
        onClick={toggleConfirm}
        disabled={confirming}
        className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${
          entry.confirmed
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-600"
        }`}
      >
        {confirming ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : entry.confirmed ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Circle className="h-2.5 w-2.5" />}
        {entry.confirmed ? "Confermato" : "Da conf."}
      </button>

      {/* Delete */}
      <button
        onClick={deleteEntry}
        disabled={deleting}
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
      >
        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      </button>
    </div>
  )
}

// ── TravelClient (main export) ─────────────────────────────────────────────────

export default function TravelClient({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<TravelEntry[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterDir, setFilterDir] = useState("ALL")
  const [filterType, setFilterType] = useState("ALL")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [travelRes, regRes] = await Promise.all([
        fetch(`/api/events/${eventId}/travel`),
        fetch(`/api/events/${eventId}/hospitality`), // riusa la lista partecipanti
      ])
      if (travelRes.ok) setEntries(await travelRes.json())
      if (regRes.ok) {
        const d = await regRes.json()
        setRegistrations(d.registrations ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = entries.filter((e) => {
    const matchDir = filterDir === "ALL" || e.direction === filterDir
    const matchType = filterType === "ALL" || e.type === filterType
    return matchDir && matchType
  })

  const inbound = entries.filter((e) => e.direction === "INBOUND")
  const outbound = entries.filter((e) => e.direction === "OUTBOUND")
  const confirmed = entries.filter((e) => e.confirmed)

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Arrivi", value: inbound.length, color: "text-blue-600" },
            { label: "Partenze", value: outbound.length, color: "text-orange-600" },
            { label: "Confermati", value: confirmed.length, color: "text-green-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select value={filterDir} onChange={(e) => setFilterDir(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs focus:outline-none">
            <option value="ALL">Tutte le direzioni</option>
            <option value="INBOUND">→ Arrivi</option>
            <option value="OUTBOUND">← Partenze</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs focus:outline-none">
            <option value="ALL">Tutti i mezzi</option>
            {TRAVEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" />Aggiungi tratta
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <AddTravelForm
          eventId={eventId}
          registrations={registrations}
          onAdd={(e) => { setEntries((prev) => [...prev, e]); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Entries */}
      {filtered.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Plane className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-500 mb-1">Nessuna tratta di viaggio</p>
            <p className="text-xs text-gray-400">Aggiungi le tratte di volo, treno o trasferimento dei partecipanti</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            {filtered.map((entry) => (
              <TravelRow
                key={entry.id}
                entry={entry}
                eventId={eventId}
                onUpdate={(updated) => setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e))}
                onDelete={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
