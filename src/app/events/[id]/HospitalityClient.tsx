"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Hotel, Plus, Trash2, CheckCircle2, Circle, Loader2, ChevronDown,
  ChevronUp, BedDouble, Users, Calendar, Euro,
} from "lucide-react"
import { toast } from "@/components/ui/toaster"
import { formatDate } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Registration {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string | null
  status: string
}

interface RoomType {
  id: string
  name: string
  beds: number
  price: number | null
  currency: string
}

interface HotelData {
  id: string
  name: string
  city: string | null
  stars: number | null
  roomTypes: RoomType[]
}

interface RoomAssignment {
  id: string
  registrationId: string
  checkIn: string | null
  checkOut: string | null
  confirmed: boolean
  notes: string | null
  registration: Registration
}

interface Allotment {
  id: string
  hotelId: string
  roomTypeId: string
  totalRooms: number
  checkIn: string | null
  checkOut: string | null
  deadline: string | null
  notes: string | null
  hotel: HotelData
  roomType: RoomType
  assignments: RoomAssignment[]
}

// ── AddAllotmentForm ───────────────────────────────────────────────────────────

function AddAllotmentForm({
  eventId,
  hotels,
  onAdd,
  onCancel,
}: {
  eventId: string
  hotels: HotelData[]
  onAdd: (a: Allotment) => void
  onCancel: () => void
}) {
  const [hotelId, setHotelId] = useState("")
  const [roomTypeId, setRoomTypeId] = useState("")
  const [totalRooms, setTotalRooms] = useState("10")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [deadline, setDeadline] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const selectedHotel = hotels.find((h) => h.id === hotelId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId || !roomTypeId) { toast("Seleziona hotel e tipo camera", { variant: "warning" }); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/hospitality/allotments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, roomTypeId, totalRooms: Number(totalRooms), checkIn, checkOut, deadline, notes }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error ?? "Errore", { variant: "error" }); return
      }
      const allotment = await res.json()
      onAdd(allotment)
      toast("Allotment aggiunto", { variant: "success" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hotel *</label>
          <select
            value={hotelId}
            onChange={(e) => { setHotelId(e.target.value); setRoomTypeId("") }}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona hotel...</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}{h.city ? ` — ${h.city}` : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo camera *</label>
          <select
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
            disabled={!hotelId}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Seleziona tipo...</option>
            {selectedHotel?.roomTypes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.price ? ` — €${r.price}` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Camere disponibili</label>
          <Input type="number" min={1} value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Scadenza prenotazione</label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Check-in</label>
          <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Check-out</label>
          <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note sull'allotment..." className="h-9 text-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          Aggiungi allotment
        </Button>
      </div>
    </form>
  )
}

// ── AllotmentCard ──────────────────────────────────────────────────────────────

function AllotmentCard({
  allotment,
  registrations,
  eventId,
  onUpdate,
  onDelete,
}: {
  allotment: Allotment
  registrations: Registration[]
  eventId: string
  onUpdate: (a: Allotment) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [assignRegId, setAssignRegId] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const assignedRegIds = new Set(allotment.assignments.map((a) => a.registrationId))
  const availableRegs = registrations.filter((r) => !assignedRegIds.has(r.id))
  const usedRooms = allotment.assignments.length
  const fillPct = allotment.totalRooms > 0 ? Math.round((usedRooms / allotment.totalRooms) * 100) : 0

  async function assignParticipant() {
    if (!assignRegId) return
    setAssignLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/hospitality/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allotmentId: allotment.id, registrationId: assignRegId }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.error ?? "Errore", { variant: "error" }); return }
      const assignment = await res.json()
      onUpdate({ ...allotment, assignments: [...allotment.assignments, assignment] })
      setAssignRegId("")
      setAssigning(false)
      toast("Partecipante assegnato", { variant: "success" })
    } finally {
      setAssignLoading(false)
    }
  }

  async function removeAssignment(assignId: string) {
    setDeletingId(assignId)
    try {
      await fetch(`/api/events/${eventId}/hospitality/assign/${assignId}`, { method: "DELETE" })
      onUpdate({ ...allotment, assignments: allotment.assignments.filter((a) => a.id !== assignId) })
      toast("Assegnazione rimossa")
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleConfirm(assignment: RoomAssignment) {
    setConfirmingId(assignment.id)
    try {
      const res = await fetch(`/api/events/${eventId}/hospitality/assign/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: !assignment.confirmed }),
      })
      if (!res.ok) return
      const updated = await res.json()
      onUpdate({
        ...allotment,
        assignments: allotment.assignments.map((a) => a.id === assignment.id ? updated : a),
      })
    } finally {
      setConfirmingId(null)
    }
  }

  async function deleteAllotment() {
    if (!confirm("Rimuovere questo allotment? Verranno rimosse anche tutte le assegnazioni.")) return
    await fetch(`/api/events/${eventId}/hospitality/allotments/${allotment.id}`, { method: "DELETE" })
    onDelete(allotment.id)
    toast("Allotment rimosso")
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <BedDouble className="h-4 w-4 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{allotment.hotel.name}</span>
              <Badge variant="secondary" className="text-xs">{allotment.roomType.name}</Badge>
              {allotment.roomType.price && (
                <span className="text-xs text-green-700 flex items-center gap-0.5">
                  <Euro className="h-3 w-3" />{allotment.roomType.price}/{allotment.roomType.currency}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{usedRooms}/{allotment.totalRooms} camere
              </span>
              {allotment.checkIn && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{formatDate(allotment.checkIn)} → {allotment.checkOut ? formatDate(allotment.checkOut) : "?"}
                </span>
              )}
              {allotment.deadline && (
                <span className="text-orange-600">Scadenza: {formatDate(allotment.deadline)}</span>
              )}
            </div>
            {/* Fill bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${fillPct >= 100 ? "bg-red-500" : fillPct >= 80 ? "bg-orange-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min(fillPct, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{fillPct}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={deleteAllotment}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          {/* Assignment list */}
          {allotment.assignments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">Nessuna camera assegnata</p>
          ) : (
            <div className="space-y-1">
              {allotment.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:border-gray-200 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {a.registration.firstName[0]}{a.registration.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-gray-900 truncate">{a.registration.firstName} {a.registration.lastName}</span>
                      {a.registration.company && <span className="text-[10px] text-gray-400 ml-1.5">{a.registration.company}</span>}
                    </div>
                    {a.checkIn && (
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        {formatDate(a.checkIn)} → {a.checkOut ? formatDate(a.checkOut) : "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleConfirm(a)}
                      disabled={confirmingId === a.id}
                      className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                        a.confirmed
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-400 hover:border-blue-200 hover:text-blue-600"
                      }`}
                    >
                      {confirmingId === a.id
                        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        : a.confirmed ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Circle className="h-2.5 w-2.5" />}
                      {a.confirmed ? "Confermata" : "Da confermare"}
                    </button>
                    <button
                      onClick={() => removeAssignment(a.id)}
                      disabled={deletingId === a.id}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {deletingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assign form */}
          {usedRooms < allotment.totalRooms && (
            assigning ? (
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={assignRegId}
                  onChange={(e) => setAssignRegId(e.target.value)}
                  className="flex-1 h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona partecipante...</option>
                  {availableRegs.map((r) => (
                    <option key={r.id} value={r.id}>{r.firstName} {r.lastName}{r.company ? ` — ${r.company}` : ""}</option>
                  ))}
                </select>
                <Button size="sm" className="h-8 text-xs px-3" onClick={assignParticipant} disabled={assignLoading || !assignRegId}>
                  {assignLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Assegna
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setAssigning(false); setAssignRegId("") }}>Annulla</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs w-full" onClick={() => setAssigning(true)}>
                <Plus className="h-3 w-3" />Assegna partecipante ({allotment.totalRooms - usedRooms} disponibili)
              </Button>
            )
          )}
          {usedRooms >= allotment.totalRooms && (
            <p className="text-xs text-center text-red-500 font-medium py-1">Allotment esaurito</p>
          )}
        </div>
      )}
    </Card>
  )
}

// ── HospitalityClient (main export) ───────────────────────────────────────────

export default function HospitalityClient({ eventId }: { eventId: string }) {
  const [data, setData] = useState<{ allotments: Allotment[]; hotels: HotelData[]; registrations: Registration[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/hospitality`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )

  if (!data) return <p className="text-gray-400 text-sm text-center py-8">Impossibile caricare i dati.</p>

  const { allotments, hotels, registrations } = data
  const totalAssigned = allotments.reduce((s, a) => s + a.assignments.length, 0)
  const totalRooms = allotments.reduce((s, a) => s + a.totalRooms, 0)

  return (
    <div className="space-y-4">
      {/* Stats */}
      {allotments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Allotment", value: allotments.length, color: "text-purple-600" },
            { label: "Camere totali", value: totalRooms, color: "text-blue-600" },
            { label: "Assegnate", value: totalAssigned, color: "text-green-600" },
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

      {/* Add allotment */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Hotel className="h-4 w-4 text-purple-500" />Allotment hotel
        </h3>
        <div className="flex gap-2">
          {hotels.length === 0 && (
            <a href="/settings/hotels" target="_blank" className="text-xs text-blue-600 hover:underline">
              + Aggiungi hotel in libreria →
            </a>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowAdd(true)} disabled={hotels.length === 0}>
            <Plus className="h-3.5 w-3.5" />Aggiungi allotment
          </Button>
        </div>
      </div>

      {showAdd && (
        <AddAllotmentForm
          eventId={eventId}
          hotels={hotels}
          onAdd={(a) => { setData((d) => d ? { ...d, allotments: [...d.allotments, a] } : d); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {allotments.length === 0 && !showAdd && (
        <Card>
          <CardContent className="p-10 text-center">
            <Hotel className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-500 mb-1">Nessun allotment configurato</p>
            <p className="text-xs text-gray-400">
              {hotels.length === 0
                ? <>Prima aggiungi gli hotel in <a href="/settings/hotels" className="text-blue-600 hover:underline">Impostazioni → Hotel</a></>
                : "Aggiungi un allotment per gestire l'alloggio dei partecipanti"}
            </p>
          </CardContent>
        </Card>
      )}

      {allotments.map((allotment) => (
        <AllotmentCard
          key={allotment.id}
          allotment={allotment}
          registrations={registrations}
          eventId={eventId}
          onUpdate={(updated) => setData((d) => d ? { ...d, allotments: d.allotments.map((a) => a.id === updated.id ? updated : a) } : d)}
          onDelete={(id) => setData((d) => d ? { ...d, allotments: d.allotments.filter((a) => a.id !== id) } : d)}
        />
      ))}
    </div>
  )
}
