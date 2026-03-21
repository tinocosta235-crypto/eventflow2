"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plane, Train, Bus, Car, Hotel, Plus, Trash2, Edit,
  ChevronDown, ChevronUp, Users, MapPin, Calendar, Clock,
  Package, Route, Loader2, ArrowRight, Check,
} from "lucide-react"
import { toast } from "@/components/ui/toaster"

// ── Types ───────────────────────────────────────────────────────────────────

type TravelResource = {
  id: string
  name: string
  travelType: string
  departureLocation: string
  arrivalLocation: string
  departureDate: string | null
  arrivalDate: string | null
  departureTime: string | null
  arrivalTime: string | null
  operator: string | null
  serviceNumber: string | null
  description: string | null
  internalNotes: string | null
  units: number | null
  internalCost: number | null
  sellingPrice: number | null
}

type RouteStep = {
  id: string
  routeId: string
  order: number
  stepType: string
  travelResourceId: string | null
  hotelAllotmentId: string | null
  checkIn: string | null
  checkOut: string | null
  notes: string | null
  travelResource?: TravelResource | null
  allotment?: {
    id: string
    hotel: { name: string }
    roomType: { name: string }
    checkIn: string | null
    checkOut: string | null
  } | null
}

type RouteGroupAssignment = {
  id: string
  routeId: string
  groupId: string
  group: { id: string; name: string; color: string }
}

type TravelRoute = {
  id: string
  name: string
  internalNotes: string | null
  startingLocation: string | null
  startingDate: string | null
  maxExtraGuests: number
  hidden: boolean
  allowChangeRequests: boolean
  changeRequestMessage: string | null
  steps: RouteStep[]
  groupAssignments: RouteGroupAssignment[]
}

type EventGroup = {
  id: string
  name: string
  color: string
}

type HotelAllotment = {
  id: string
  hotel: { name: string }
  roomType: { name: string }
  checkIn: string | null
  checkOut: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const TRAVEL_TYPES = [
  { value: "FLIGHT", label: "Volo", icon: Plane },
  { value: "TRAIN", label: "Treno", icon: Train },
  { value: "COACH", label: "Pullman", icon: Bus },
  { value: "CAR_TRANSFER", label: "Transfer auto", icon: Car },
  { value: "OWN_VEHICLE", label: "Veicolo proprio", icon: Car },
]

function travelTypeIcon(type: string) {
  switch (type) {
    case "FLIGHT": return <Plane className="h-4 w-4" />
    case "TRAIN": return <Train className="h-4 w-4" />
    case "COACH": return <Bus className="h-4 w-4" />
    case "CAR_TRANSFER":
    case "OWN_VEHICLE": return <Car className="h-4 w-4" />
    default: return <Route className="h-4 w-4" />
  }
}

function travelTypeIconSmall(type: string) {
  switch (type) {
    case "FLIGHT": return <Plane className="h-3 w-3" />
    case "TRAIN": return <Train className="h-3 w-3" />
    case "COACH": return <Bus className="h-3 w-3" />
    case "CAR_TRANSFER":
    case "OWN_VEHICLE": return <Car className="h-3 w-3" />
    default: return <Route className="h-3 w-3" />
  }
}

function travelTypeLabel(type: string) {
  return TRAVEL_TYPES.find((t) => t.value === type)?.label ?? type
}

function formatDateShort(val: string | null | undefined) {
  if (!val) return null
  return new Date(val).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })
}

const GROUP_COLORS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  purple: "bg-purple-100 text-purple-800",
  orange: "bg-orange-100 text-orange-800",
  pink: "bg-pink-100 text-pink-800",
  indigo: "bg-indigo-100 text-indigo-800",
  teal: "bg-teal-100 text-teal-800",
  yellow: "bg-yellow-100 text-yellow-800",
  gray: "bg-gray-100 text-gray-800",
}

function groupBadgeClass(color: string) {
  return GROUP_COLORS[color] ?? "bg-gray-100 text-gray-800"
}

// ── ResourceForm ─────────────────────────────────────────────────────────────

type ResourceFormData = {
  name: string
  travelType: string
  departureLocation: string
  arrivalLocation: string
  departureDate: string
  arrivalDate: string
  departureTime: string
  arrivalTime: string
  operator: string
  serviceNumber: string
  description: string
  internalNotes: string
  units: string
  internalCost: string
  sellingPrice: string
}

const emptyResourceForm = (): ResourceFormData => ({
  name: "", travelType: "FLIGHT",
  departureLocation: "", arrivalLocation: "",
  departureDate: "", arrivalDate: "",
  departureTime: "", arrivalTime: "",
  operator: "", serviceNumber: "",
  description: "", internalNotes: "",
  units: "", internalCost: "", sellingPrice: "",
})

function resourceToForm(r: TravelResource): ResourceFormData {
  return {
    name: r.name,
    travelType: r.travelType,
    departureLocation: r.departureLocation,
    arrivalLocation: r.arrivalLocation,
    departureDate: r.departureDate ? r.departureDate.slice(0, 10) : "",
    arrivalDate: r.arrivalDate ? r.arrivalDate.slice(0, 10) : "",
    departureTime: r.departureTime ?? "",
    arrivalTime: r.arrivalTime ?? "",
    operator: r.operator ?? "",
    serviceNumber: r.serviceNumber ?? "",
    description: r.description ?? "",
    internalNotes: r.internalNotes ?? "",
    units: r.units != null ? String(r.units) : "",
    internalCost: r.internalCost != null ? String(r.internalCost) : "",
    sellingPrice: r.sellingPrice != null ? String(r.sellingPrice) : "",
  }
}

function ResourceForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  submitLabel,
}: {
  initial: ResourceFormData
  onSubmit: (data: ResourceFormData) => void
  onCancel: () => void
  loading: boolean
  submitLabel: string
}) {
  const [form, setForm] = useState<ResourceFormData>(initial)
  const set = (k: keyof ResourceFormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
      className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome risorsa *</label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="es. Volo Milano → Roma"
            className="h-9 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo di trasporto *</label>
          <select
            value={form.travelType}
            onChange={(e) => set("travelType", e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7060CC]"
          >
            {TRAVEL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vettore / Operatore</label>
          <Input
            value={form.operator}
            onChange={(e) => set("operator", e.target.value)}
            placeholder="es. ITA Airways"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Partenza da *</label>
          <Input
            value={form.departureLocation}
            onChange={(e) => set("departureLocation", e.target.value)}
            placeholder="es. Milano Malpensa (MXP)"
            className="h-9 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Arrivo a *</label>
          <Input
            value={form.arrivalLocation}
            onChange={(e) => set("arrivalLocation", e.target.value)}
            placeholder="es. Roma Fiumicino (FCO)"
            className="h-9 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data partenza</label>
          <Input
            type="date"
            value={form.departureDate}
            onChange={(e) => set("departureDate", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data arrivo</label>
          <Input
            type="date"
            value={form.arrivalDate}
            onChange={(e) => set("arrivalDate", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Orario partenza</label>
          <Input
            type="time"
            value={form.departureTime}
            onChange={(e) => set("departureTime", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Orario arrivo</label>
          <Input
            type="time"
            value={form.arrivalTime}
            onChange={(e) => set("arrivalTime", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Numero servizio / volo</label>
          <Input
            value={form.serviceNumber}
            onChange={(e) => set("serviceNumber", e.target.value)}
            placeholder="es. AZ0614"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unità / posti</label>
          <Input
            type="number"
            min={0}
            value={form.units}
            onChange={(e) => set("units", e.target.value)}
            placeholder="es. 50"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Costo interno (€)</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.internalCost}
            onChange={(e) => set("internalCost", e.target.value)}
            placeholder="0.00"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prezzo vendita (€)</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.sellingPrice}
            onChange={(e) => set("sellingPrice", e.target.value)}
            placeholder="0.00"
            className="h-9 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione</label>
          <Input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Descrizione visibile ai partecipanti..."
            className="h-9 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
          <Input
            value={form.internalNotes}
            onChange={(e) => set("internalNotes", e.target.value)}
            placeholder="Note interne (non visibili ai partecipanti)..."
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

// ── ResourceCard ─────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  onUpdate,
  onDelete,
  eventId,
}: {
  resource: TravelResource
  onUpdate: (r: TravelResource) => void
  onDelete: (id: string) => void
  eventId: string
}) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleEdit(data: ResourceFormData) {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/travel-resources/${resource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          units: data.units ? Number(data.units) : null,
          internalCost: data.internalCost ? Number(data.internalCost) : null,
          sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : null,
        }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.error ?? "Errore", { variant: "error" }); return }
      onUpdate(await res.json())
      setEditing(false)
      toast("Risorsa aggiornata", { variant: "success" })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare la risorsa "${resource.name}"?`)) return
    const res = await fetch(`/api/events/${eventId}/travel-resources/${resource.id}`, { method: "DELETE" })
    if (!res.ok) { toast("Errore durante l'eliminazione", { variant: "error" }); return }
    onDelete(resource.id)
    toast("Risorsa eliminata")
  }

  if (editing) {
    return (
      <ResourceForm
        initial={resourceToForm(resource)}
        onSubmit={handleEdit}
        onCancel={() => setEditing(false)}
        loading={loading}
        submitLabel="Salva modifiche"
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
            {travelTypeIcon(resource.travelType)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{resource.name}</span>
              <Badge variant="secondary" className="text-xs">{travelTypeLabel(resource.travelType)}</Badge>
              {resource.serviceNumber && (
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {resource.serviceNumber}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gray-400" />
                {resource.departureLocation}
                <ArrowRight className="h-3 w-3" />
                {resource.arrivalLocation}
              </span>
              {(resource.departureDate || resource.departureTime) && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  {formatDateShort(resource.departureDate)}
                  {resource.departureTime && (
                    <span className="flex items-center gap-0.5 ml-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {resource.departureTime}
                    </span>
                  )}
                </span>
              )}
              {resource.arrivalTime && (
                <span className="flex items-center gap-1 text-gray-400">
                  <ArrowRight className="h-3 w-3" />
                  {resource.arrivalTime}
                </span>
              )}
              {resource.operator && (
                <span className="text-gray-400">{resource.operator}</span>
              )}
              {resource.units != null && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-gray-400" />
                  {resource.units} posti
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => setEditing(true)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── RouteForm ─────────────────────────────────────────────────────────────────

type RouteFormData = {
  name: string
  internalNotes: string
  startingLocation: string
  startingDate: string
  maxExtraGuests: string
  hidden: boolean
  allowChangeRequests: boolean
  changeRequestMessage: string
}

const emptyRouteForm = (): RouteFormData => ({
  name: "", internalNotes: "", startingLocation: "", startingDate: "",
  maxExtraGuests: "0", hidden: false, allowChangeRequests: false, changeRequestMessage: "",
})

function routeToForm(r: TravelRoute): RouteFormData {
  return {
    name: r.name,
    internalNotes: r.internalNotes ?? "",
    startingLocation: r.startingLocation ?? "",
    startingDate: r.startingDate ? r.startingDate.slice(0, 10) : "",
    maxExtraGuests: String(r.maxExtraGuests),
    hidden: r.hidden,
    allowChangeRequests: r.allowChangeRequests,
    changeRequestMessage: r.changeRequestMessage ?? "",
  }
}

function RouteForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  submitLabel,
}: {
  initial: RouteFormData
  onSubmit: (d: RouteFormData) => void
  onCancel: () => void
  loading: boolean
  submitLabel: string
}) {
  const [form, setForm] = useState<RouteFormData>(initial)
  const set = (k: keyof RouteFormData, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
      className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome percorso *</label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="es. Percorso Nord Italia"
            className="h-9 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Punto di partenza</label>
          <Input
            value={form.startingLocation}
            onChange={(e) => set("startingLocation", e.target.value)}
            placeholder="es. Milano"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data inizio</label>
          <Input
            type="date"
            value={form.startingDate}
            onChange={(e) => set("startingDate", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max ospiti extra</label>
          <Input
            type="number"
            min={0}
            value={form.maxExtraGuests}
            onChange={(e) => set("maxExtraGuests", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(e) => set("hidden", e.target.checked)}
              className="rounded accent-[#7060CC]"
            />
            Nascondi ai partecipanti
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.allowChangeRequests}
              onChange={(e) => set("allowChangeRequests", e.target.checked)}
              className="rounded accent-[#7060CC]"
            />
            Consenti richieste modifica
          </label>
        </div>
        {form.allowChangeRequests && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Messaggio richieste modifica</label>
            <Input
              value={form.changeRequestMessage}
              onChange={(e) => set("changeRequestMessage", e.target.value)}
              placeholder="es. Contattare la segreteria entro 48h..."
              className="h-9 text-sm"
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
          <Input
            value={form.internalNotes}
            onChange={(e) => set("internalNotes", e.target.value)}
            placeholder="Note interne sul percorso..."
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

// ── AddStepPanel ──────────────────────────────────────────────────────────────

function AddStepPanel({
  eventId,
  routeId,
  resources,
  allotments,
  onAdd,
  onCancel,
}: {
  eventId: string
  routeId: string
  resources: TravelResource[]
  allotments: HotelAllotment[]
  onAdd: (step: RouteStep) => void
  onCancel: () => void
}) {
  const [stepType, setStepType] = useState<"TRAVEL" | "ACCOMMODATION">("TRAVEL")
  const [travelResourceId, setTravelResourceId] = useState("")
  const [hotelAllotmentId, setHotelAllotmentId] = useState("")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (stepType === "TRAVEL" && !travelResourceId) {
      toast("Seleziona una risorsa di trasporto", { variant: "warning" }); return
    }
    if (stepType === "ACCOMMODATION" && !hotelAllotmentId) {
      toast("Seleziona un allotment hotel", { variant: "warning" }); return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/routes/${routeId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepType,
          travelResourceId: stepType === "TRAVEL" ? travelResourceId : null,
          hotelAllotmentId: stepType === "ACCOMMODATION" ? hotelAllotmentId : null,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.error ?? "Errore", { variant: "error" }); return }
      onAdd(await res.json())
      toast("Tappa aggiunta", { variant: "success" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStepType("TRAVEL")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            stepType === "TRAVEL"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
          }`}
        >
          <Route className="h-3.5 w-3.5" />Trasporto
        </button>
        <button
          type="button"
          onClick={() => setStepType("ACCOMMODATION")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            stepType === "ACCOMMODATION"
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
          }`}
        >
          <Hotel className="h-3.5 w-3.5" />Alloggio
        </button>
      </div>

      {stepType === "TRAVEL" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Risorsa trasporto *</label>
          {resources.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nessuna risorsa disponibile. Aggiungine prima nel tab Risorse.</p>
          ) : (
            <select
              value={travelResourceId}
              onChange={(e) => setTravelResourceId(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona risorsa...</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.departureLocation} → {r.arrivalLocation}
                  {r.departureTime ? ` (${r.departureTime})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {stepType === "ACCOMMODATION" && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Allotment hotel *</label>
            {allotments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nessun allotment disponibile. Configuralo nella sezione Alloggio.</p>
            ) : (
              <select
                value={hotelAllotmentId}
                onChange={(e) => setHotelAllotmentId(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleziona allotment...</option>
                {allotments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.hotel.name} — {a.roomType.name}
                    {a.checkIn ? ` (${formatDateShort(a.checkIn)} → ${formatDateShort(a.checkOut)})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-in</label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-out</label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note opzionali..."
          className="h-8 text-xs"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>Annulla</Button>
        <Button type="submit" size="sm" className="h-7 text-xs" disabled={loading}>
          {loading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Aggiungi tappa
        </Button>
      </div>
    </form>
  )
}

// ── RouteCard ─────────────────────────────────────────────────────────────────

function RouteCard({
  route,
  eventId,
  resources,
  allotments,
  groups,
  onUpdate,
  onDelete,
}: {
  route: TravelRoute
  eventId: string
  resources: TravelResource[]
  allotments: HotelAllotment[]
  groups: EventGroup[]
  onUpdate: (r: TravelRoute) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [addingStep, setAddingStep] = useState(false)
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null)
  const [assigningGroup, setAssigningGroup] = useState(false)

  async function handleEdit(data: RouteFormData) {
    setEditLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/routes/${route.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          maxExtraGuests: Number(data.maxExtraGuests),
        }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.error ?? "Errore", { variant: "error" }); return }
      onUpdate(await res.json())
      setEditing(false)
      toast("Percorso aggiornato", { variant: "success" })
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare il percorso "${route.name}"?`)) return
    const res = await fetch(`/api/events/${eventId}/routes/${route.id}`, { method: "DELETE" })
    if (!res.ok) { toast("Errore durante l'eliminazione", { variant: "error" }); return }
    onDelete(route.id)
    toast("Percorso eliminato")
  }

  async function handleDeleteStep(stepId: string) {
    setDeletingStepId(stepId)
    try {
      const res = await fetch(`/api/events/${eventId}/routes/${route.id}/steps/${stepId}`, { method: "DELETE" })
      if (!res.ok) { toast("Errore eliminazione tappa", { variant: "error" }); return }
      onUpdate({ ...route, steps: route.steps.filter((s) => s.id !== stepId) })
      toast("Tappa rimossa")
    } finally {
      setDeletingStepId(null)
    }
  }

  async function moveStep(step: RouteStep, direction: "up" | "down") {
    const sorted = [...route.steps].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((s) => s.id === step.id)
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sorted.length) return

    const sibling = sorted[targetIdx]
    const newStepOrder = sibling.order
    const newSiblingOrder = step.order

    // Optimistic update
    const updatedSteps = route.steps.map((s) => {
      if (s.id === step.id) return { ...s, order: newStepOrder }
      if (s.id === sibling.id) return { ...s, order: newSiblingOrder }
      return s
    })
    onUpdate({ ...route, steps: updatedSteps })

    await Promise.all([
      fetch(`/api/events/${eventId}/routes/${route.id}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newStepOrder }),
      }),
      fetch(`/api/events/${eventId}/routes/${route.id}/steps/${sibling.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newSiblingOrder }),
      }),
    ])
  }

  async function toggleGroupAssignment(group: EventGroup) {
    const existing = route.groupAssignments.find((a) => a.groupId === group.id)
    if (existing) {
      const res = await fetch(`/api/events/${eventId}/routes/${route.id}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      })
      if (!res.ok) { toast("Errore rimozione assegnazione", { variant: "error" }); return }
      onUpdate({ ...route, groupAssignments: route.groupAssignments.filter((a) => a.groupId !== group.id) })
      toast(`Gruppo "${group.name}" rimosso dal percorso`)
    } else {
      const res = await fetch(`/api/events/${eventId}/routes/${route.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.error ?? "Errore", { variant: "error" }); return }
      const assignment = await res.json()
      onUpdate({ ...route, groupAssignments: [...route.groupAssignments, assignment] })
      toast(`Gruppo "${group.name}" assegnato al percorso`, { variant: "success" })
    }
  }

  const sortedSteps = [...route.steps].sort((a, b) => a.order - b.order)

  if (editing) {
    return (
      <RouteForm
        initial={routeToForm(route)}
        onSubmit={handleEdit}
        onCancel={() => setEditing(false)}
        loading={editLoading}
        submitLabel="Salva modifiche"
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Route className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{route.name}</span>
              {route.hidden && <Badge variant="secondary" className="text-xs">Nascosto</Badge>}
              {route.allowChangeRequests && (
                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">Modifiche abilitate</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
              {route.startingLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{route.startingLocation}
                </span>
              )}
              {route.startingDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{formatDateShort(route.startingDate)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Route className="h-3 w-3" />{route.steps.length} {route.steps.length === 1 ? "tappa" : "tappe"}
              </span>
            </div>
            {route.groupAssignments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {route.groupAssignments.map((a) => (
                  <span key={a.id} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${groupBadgeClass(a.group.color)}`}>
                    {a.group.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => setEditing(true)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          {/* Steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tappe itinerario</h4>
            {sortedSteps.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Nessuna tappa aggiunta</p>
            ) : (
              <div className="space-y-1">
                {sortedSteps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 group">
                    <div className={`h-6 w-6 rounded flex items-center justify-center flex-shrink-0 ${
                      step.stepType === "TRAVEL"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {step.stepType === "TRAVEL"
                        ? travelTypeIconSmall(step.travelResource?.travelType ?? "FLIGHT")
                        : <Hotel className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {step.stepType === "TRAVEL" && step.travelResource && (
                        <div className="text-xs font-medium text-gray-800 truncate">
                          {step.travelResource.name}
                          <span className="text-gray-400 font-normal ml-2">
                            {step.travelResource.departureLocation} → {step.travelResource.arrivalLocation}
                            {step.travelResource.departureTime ? ` · ${step.travelResource.departureTime}` : ""}
                            {step.travelResource.arrivalTime ? ` → ${step.travelResource.arrivalTime}` : ""}
                          </span>
                        </div>
                      )}
                      {step.stepType === "ACCOMMODATION" && step.allotment && (
                        <div className="text-xs font-medium text-gray-800 truncate">
                          {step.allotment.hotel.name} — {step.allotment.roomType.name}
                          {(step.checkIn ?? step.allotment.checkIn) && (
                            <span className="text-gray-400 font-normal ml-2">
                              {formatDateShort(step.checkIn ?? step.allotment.checkIn)} → {formatDateShort(step.checkOut ?? step.allotment.checkOut)}
                            </span>
                          )}
                        </div>
                      )}
                      {step.notes && <p className="text-[10px] text-gray-400 mt-0.5">{step.notes}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => moveStep(step, "up")}
                        disabled={idx === 0}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 disabled:opacity-20"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveStep(step, "down")}
                        disabled={idx === sortedSteps.length - 1}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 disabled:opacity-20"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        disabled={deletingStepId === step.id}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                      >
                        {deletingStepId === step.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {addingStep ? (
              <AddStepPanel
                eventId={eventId}
                routeId={route.id}
                resources={resources}
                allotments={allotments}
                onAdd={(step) => {
                  onUpdate({ ...route, steps: [...route.steps, step] })
                  setAddingStep(false)
                }}
                onCancel={() => setAddingStep(false)}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs w-full border-dashed"
                onClick={() => setAddingStep(true)}
              >
                <Plus className="h-3 w-3" />Aggiungi tappa
              </Button>
            )}
          </div>

          {/* Group assignments */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />Gruppi assegnati
              </h4>
              <button
                onClick={() => setAssigningGroup(!assigningGroup)}
                className="text-xs text-[#7060CC] hover:underline"
              >
                {assigningGroup ? "Chiudi" : "Gestisci"}
              </button>
            </div>
            {assigningGroup && (
              <div className="space-y-1">
                {groups.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nessun gruppo disponibile per questo evento.</p>
                ) : (
                  groups.map((group) => {
                    const isAssigned = route.groupAssignments.some((a) => a.groupId === group.id)
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroupAssignment(group)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          isAssigned
                            ? "bg-[#7060CC]/10 border-[#7060CC]/30 text-[#7060CC]"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color.startsWith("#") ? group.color : `var(--color-${group.color}-500, #6B7280)` }} />
                          {group.name}
                        </span>
                        {isAssigned
                          ? <Check className="h-3.5 w-3.5" />
                          : <Plus className="h-3.5 w-3.5 text-gray-400" />}
                      </button>
                    )
                  })
                )}
              </div>
            )}
            {!assigningGroup && route.groupAssignments.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nessun gruppo assegnato</p>
            )}
            {!assigningGroup && route.groupAssignments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {route.groupAssignments.map((a) => (
                  <span key={a.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${groupBadgeClass(a.group.color)}`}>
                    {a.group.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── TravelClient (main export) ────────────────────────────────────────────────

export default function TravelClient({ eventId }: { eventId: string }) {
  const [activeTab, setActiveTab] = useState<"resources" | "routes">("resources")
  const [resources, setResources] = useState<TravelResource[]>([])
  const [routes, setRoutes] = useState<TravelRoute[]>([])
  const [groups, setGroups] = useState<EventGroup[]>([])
  const [allotments, setAllotments] = useState<HotelAllotment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddResource, setShowAddResource] = useState(false)
  const [addResourceLoading, setAddResourceLoading] = useState(false)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [addRouteLoading, setAddRouteLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resRes, routesRes, groupsRes, hospitalityRes] = await Promise.all([
        fetch(`/api/events/${eventId}/travel-resources`),
        fetch(`/api/events/${eventId}/routes`),
        fetch(`/api/events/${eventId}/groups`),
        fetch(`/api/events/${eventId}/hospitality`),
      ])
      if (resRes.ok) setResources(await resRes.json())
      if (routesRes.ok) setRoutes(await routesRes.json())
      if (groupsRes.ok) setGroups(await groupsRes.json())
      if (hospitalityRes.ok) {
        const hospData = await hospitalityRes.json()
        setAllotments(hospData.allotments ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAddResource(data: ResourceFormData) {
    setAddResourceLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/travel-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          units: data.units ? Number(data.units) : null,
          internalCost: data.internalCost ? Number(data.internalCost) : null,
          sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : null,
        }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.error ?? "Errore", { variant: "error" }); return }
      const resource = await res.json()
      setResources((prev) => [...prev, resource])
      setShowAddResource(false)
      toast("Risorsa creata", { variant: "success" })
    } finally {
      setAddResourceLoading(false)
    }
  }

  async function handleAddRoute(data: RouteFormData) {
    setAddRouteLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          maxExtraGuests: Number(data.maxExtraGuests),
        }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.error ?? "Errore", { variant: "error" }); return }
      const route = await res.json()
      setRoutes((prev) => [...prev, route])
      setShowAddRoute(false)
      toast("Percorso creato", { variant: "success" })
    } finally {
      setAddRouteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const totalAssignedGroups = new Set(routes.flatMap((r) => r.groupAssignments.map((a) => a.groupId))).size

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Risorse viaggio", value: resources.length, color: "text-blue-600" },
          { label: "Percorsi", value: routes.length, color: "text-indigo-600" },
          { label: "Gruppi assegnati", value: totalAssignedGroups, color: "text-purple-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(["resources", "routes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "resources" ? "Risorse Viaggio" : "Percorsi"}
          </button>
        ))}
      </div>

      {/* ── RISORSE TAB ── */}
      {activeTab === "resources" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Plane className="h-4 w-4 text-blue-500" />Risorse di trasporto
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setShowAddResource(true)}
              disabled={showAddResource}
            >
              <Plus className="h-3.5 w-3.5" />Aggiungi risorsa
            </Button>
          </div>

          {showAddResource && (
            <ResourceForm
              initial={emptyResourceForm()}
              onSubmit={handleAddResource}
              onCancel={() => setShowAddResource(false)}
              loading={addResourceLoading}
              submitLabel="Crea risorsa"
            />
          )}

          {resources.length === 0 && !showAddResource && (
            <Card>
              <CardContent className="p-10 text-center">
                <Plane className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-500 mb-1">Nessuna risorsa di trasporto</p>
                <p className="text-xs text-gray-400">
                  Le risorse rappresentano singoli voli, treni o transfer.<br />
                  Poi potrai combinarle nei Percorsi.
                </p>
              </CardContent>
            </Card>
          )}

          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              eventId={eventId}
              onUpdate={(updated) => setResources((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
              onDelete={(id) => setResources((prev) => prev.filter((r) => r.id !== id))}
            />
          ))}
        </div>
      )}

      {/* ── PERCORSI TAB ── */}
      {activeTab === "routes" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Route className="h-4 w-4 text-indigo-500" />Percorsi di viaggio
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setShowAddRoute(true)}
              disabled={showAddRoute}
            >
              <Plus className="h-3.5 w-3.5" />Crea percorso
            </Button>
          </div>

          {showAddRoute && (
            <RouteForm
              initial={emptyRouteForm()}
              onSubmit={handleAddRoute}
              onCancel={() => setShowAddRoute(false)}
              loading={addRouteLoading}
              submitLabel="Crea percorso"
            />
          )}

          {routes.length === 0 && !showAddRoute && (
            <Card>
              <CardContent className="p-10 text-center">
                <Route className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-500 mb-1">Nessun percorso configurato</p>
                <p className="text-xs text-gray-400">
                  I percorsi combinano risorse di trasporto e alloggio in un itinerario.<br />
                  Puoi assegnarli a gruppi specifici di partecipanti.
                </p>
              </CardContent>
            </Card>
          )}

          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              eventId={eventId}
              resources={resources}
              allotments={allotments}
              groups={groups}
              onUpdate={(updated) => setRoutes((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
              onDelete={(id) => setRoutes((prev) => prev.filter((r) => r.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
