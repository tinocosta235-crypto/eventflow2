"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Hotel, Plus, Pencil, Trash2, Star, MapPin, Phone, Mail,
  Globe, ChevronDown, ChevronUp, Loader2, BedDouble, Euro,
} from "lucide-react"
import { toast } from "@/components/ui/toaster"

// ── Types ──────────────────────────────────────────────────────────────────────

interface RoomType {
  id: string
  name: string
  beds: number
  price: number | null
  currency: string
  notes: string | null
}

interface HotelItem {
  id: string
  name: string
  address: string | null
  city: string | null
  stars: number | null
  phone: string | null
  email: string | null
  website: string | null
  notes: string | null
  roomTypes: RoomType[]
}

// ── HotelForm ──────────────────────────────────────────────────────────────────

function HotelForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<HotelItem>
  onSave: (data: Partial<HotelItem>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    stars: initial?.stars?.toString() ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    website: initial?.website ?? "",
    notes: initial?.notes ?? "",
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({ ...form, stars: form.stars ? Number(form.stars) : undefined })
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form, label: string, opts?: { type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <Input
        type={opts?.type ?? "text"}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="h-9 text-sm"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">{field("name", "Nome hotel *", { placeholder: "Grand Hotel Milano" })}</div>
        {field("address", "Indirizzo", { placeholder: "Via Roma 1" })}
        {field("city", "Città", { placeholder: "Milano" })}
        {field("stars", "Stelle", { type: "number", placeholder: "4" })}
        {field("phone", "Telefono", { placeholder: "+39 02 12345678" })}
        {field("email", "Email", { type: "email", placeholder: "info@hotel.it" })}
        {field("website", "Sito web", { placeholder: "https://hotel.it" })}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Note interne sull'hotel..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
        <Button type="submit" size="sm" disabled={loading || !form.name.trim()}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          {initial?.id ? "Salva modifiche" : "Crea hotel"}
        </Button>
      </div>
    </form>
  )
}

// ── RoomTypeForm ───────────────────────────────────────────────────────────────

function RoomTypeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<RoomType>
  onSave: (data: Partial<RoomType>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    beds: initial?.beds?.toString() ?? "1",
    price: initial?.price?.toString() ?? "",
    currency: initial?.currency ?? "EUR",
    notes: initial?.notes ?? "",
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({ ...form, beds: Number(form.beds), price: form.price ? Number(form.price) : undefined })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex-1 min-w-32">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Tipo camera *</label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Standard" className="h-8 text-xs" />
      </div>
      <div className="w-16">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Letti</label>
        <Input type="number" min={1} value={form.beds} onChange={(e) => setForm((f) => ({ ...f, beds: e.target.value }))} className="h-8 text-xs" />
      </div>
      <div className="w-24">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Prezzo/notte</label>
        <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="120" className="h-8 text-xs" />
      </div>
      <div className="w-20">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Valuta</label>
        <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          className="h-8 w-full rounded-md border border-gray-200 text-xs px-2 focus:outline-none">
          <option>EUR</option><option>USD</option><option>GBP</option>
        </select>
      </div>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 px-2 text-xs">Annulla</Button>
        <Button type="submit" size="sm" disabled={loading || !form.name.trim()} className="h-8 px-3 text-xs">
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          {initial?.id ? "Salva" : "Aggiungi"}
        </Button>
      </div>
    </form>
  )
}

// ── HotelCard ──────────────────────────────────────────────────────────────────

function HotelCard({ hotel, onUpdate, onDelete }: {
  hotel: HotelItem
  onUpdate: (updated: HotelItem) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingHotel, setEditingHotel] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function saveHotel(data: Partial<HotelItem>) {
    const res = await fetch(`/api/org/hotels/${hotel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) { toast("Errore nel salvataggio", { variant: "error" }); return }
    const updated = await res.json()
    onUpdate({ ...updated, roomTypes: hotel.roomTypes })
    setEditingHotel(false)
    toast("Hotel aggiornato", { variant: "success" })
  }

  async function deleteHotel() {
    if (!confirm(`Eliminare "${hotel.name}"? Verranno rimossi anche tutti i tipi di camera.`)) return
    setDeleting(true)
    const res = await fetch(`/api/org/hotels/${hotel.id}`, { method: "DELETE" })
    if (!res.ok) { toast("Errore nell'eliminazione", { variant: "error" }); setDeleting(false); return }
    onDelete(hotel.id)
    toast("Hotel eliminato")
  }

  async function addRoom(data: Partial<RoomType>) {
    const res = await fetch(`/api/org/hotels/${hotel.id}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) { toast("Errore", { variant: "error" }); return }
    const newRoom = await res.json()
    onUpdate({ ...hotel, roomTypes: [...hotel.roomTypes, newRoom] })
    setAddingRoom(false)
    toast("Tipo camera aggiunto", { variant: "success" })
  }

  async function saveRoom(roomId: string, data: Partial<RoomType>) {
    const res = await fetch(`/api/org/hotels/${hotel.id}/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) { toast("Errore", { variant: "error" }); return }
    const updated = await res.json()
    onUpdate({ ...hotel, roomTypes: hotel.roomTypes.map((r) => r.id === roomId ? updated : r) })
    setEditingRoom(null)
    toast("Tipo camera aggiornato", { variant: "success" })
  }

  async function deleteRoom(roomId: string) {
    const res = await fetch(`/api/org/hotels/${hotel.id}/rooms/${roomId}`, { method: "DELETE" })
    if (!res.ok) { toast("Errore", { variant: "error" }); return }
    onUpdate({ ...hotel, roomTypes: hotel.roomTypes.filter((r) => r.id !== roomId) })
    toast("Tipo camera eliminato")
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Hotel className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{hotel.name}</h3>
              {hotel.stars && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: hotel.stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
              {hotel.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{hotel.city}</span>}
              {hotel.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{hotel.phone}</span>}
              {hotel.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{hotel.email}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="secondary" className="text-xs">{hotel.roomTypes.length} tipi</Badge>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingHotel(!editingHotel)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={deleteHotel} disabled={deleting}>
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Edit form */}
      {editingHotel && (
        <div className="px-4 pb-4">
          <HotelForm initial={hotel} onSave={saveHotel} onCancel={() => setEditingHotel(false)} />
        </div>
      )}

      {/* Room types */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipi di camera</p>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddingRoom(true)}>
              <Plus className="h-3 w-3" />Aggiungi
            </Button>
          </div>

          {addingRoom && (
            <RoomTypeForm onSave={addRoom} onCancel={() => setAddingRoom(false)} />
          )}

          {hotel.roomTypes.length === 0 && !addingRoom && (
            <p className="text-xs text-gray-400 text-center py-3">Nessun tipo di camera configurato.</p>
          )}

          {hotel.roomTypes.map((room) => (
            <div key={room.id}>
              {editingRoom === room.id ? (
                <RoomTypeForm
                  initial={room}
                  onSave={(d) => saveRoom(room.id, d)}
                  onCancel={() => setEditingRoom(null)}
                />
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 bg-white group">
                  <div className="flex items-center gap-3">
                    <BedDouble className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{room.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{room.beds} {room.beds === 1 ? "letto" : "letti"}</span>
                    </div>
                    {room.price && (
                      <span className="flex items-center gap-0.5 text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                        <Euro className="h-3 w-3" />{room.price}/{room.currency}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingRoom(room.id)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50" onClick={() => deleteRoom(room.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HotelsPage() {
  const [hotels, setHotels] = useState<HotelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/org/hotels")
      if (res.ok) setHotels(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHotels() }, [fetchHotels])

  async function createHotel(data: Partial<HotelItem>) {
    const res = await fetch("/api/org/hotels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) { toast("Errore nella creazione", { variant: "error" }); return }
    const hotel = await res.json()
    setHotels((h) => [...h, hotel])
    setShowAdd(false)
    toast("Hotel aggiunto", { variant: "success" })
  }

  return (
    <DashboardLayout>
      <Header
        title="Hotel & Strutture"
        subtitle="Libreria hotel riutilizzabili per tutti gli eventi"
        actions={
          <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />Aggiungi hotel
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {showAdd && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Hotel className="h-4 w-4 text-purple-500" />Nuovo hotel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HotelForm onSave={createHotel} onCancel={() => setShowAdd(false)} />
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : hotels.length === 0 && !showAdd ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Hotel className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500 mb-1">Nessun hotel nella libreria</p>
              <p className="text-sm text-gray-400 mb-4">Aggiungi gli hotel che usi per i tuoi eventi per riutilizzarli rapidamente</p>
              <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" />Aggiungi il primo hotel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                onUpdate={(updated) => setHotels((h) => h.map((x) => x.id === updated.id ? updated : x))}
                onDelete={(id) => setHotels((h) => h.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
