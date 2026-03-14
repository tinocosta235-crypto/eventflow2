"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Users, Search, Download, Upload, Plus, CheckCircle2, Clock,
  XCircle, Loader2, RefreshCw, FileSpreadsheet, Trash2, Filter,
  MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Columns,
  LayoutList, Table2, Check,
} from "lucide-react"
import { getStatusColor, getStatusLabel, formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import { ParticipantModal } from "@/components/participants/ParticipantModal"
import { AddParticipantModal } from "@/components/participants/AddParticipantModal"
import { ImportPreviewModal } from "@/components/participants/ImportPreviewModal"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Registration {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  phone?: string
  jobTitle?: string
  notes?: string
  status: string
  paymentStatus: string
  ticketPrice?: number
  checkedInAt?: string
  createdAt: string
  registrationCode: string
  event: { id: string; title: string }
}

interface EventItem {
  id: string
  title: string
  capacity?: number
}

type SortDir = "asc" | "desc"
type ColId = keyof Registration | "fullName" | "event"
type View = "table" | "masterlist"

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS: {
  id: string
  label: string
  editable: boolean
  type?: "text" | "select" | "readonly"
  minW?: string
  defaultVisible: boolean
}[] = [
  { id: "fullName",         label: "Partecipante",  editable: false,  type: "readonly", minW: "200px", defaultVisible: true },
  { id: "email",            label: "Email",          editable: true,   type: "text",    minW: "200px", defaultVisible: true },
  { id: "phone",            label: "Telefono",       editable: true,   type: "text",    minW: "140px", defaultVisible: true },
  { id: "company",          label: "Azienda",        editable: true,   type: "text",    minW: "160px", defaultVisible: true },
  { id: "jobTitle",         label: "Ruolo",          editable: true,   type: "text",    minW: "160px", defaultVisible: false },
  { id: "status",           label: "Stato",          editable: true,   type: "select",  minW: "120px", defaultVisible: true },
  { id: "event",            label: "Evento",         editable: false,  type: "readonly", minW: "180px", defaultVisible: true },
  { id: "checkedInAt",      label: "Check-in",       editable: false,  type: "readonly", minW: "100px", defaultVisible: true },
  { id: "registrationCode", label: "Codice",         editable: false,  type: "readonly", minW: "120px", defaultVisible: false },
  { id: "notes",            label: "Note",           editable: true,   type: "text",    minW: "200px", defaultVisible: false },
  { id: "createdAt",        label: "Iscritto il",    editable: false,  type: "readonly", minW: "120px", defaultVisible: true },
]

const STATUS_OPTIONS = ["CONFIRMED", "PENDING", "WAITLISTED", "CANCELLED"]

// ── EditableCell ──────────────────────────────────────────────────────────────

function EditableCell({
  value, colId, regId, onSave,
}: {
  value: string; colId: string; regId: string; onSave: (id: string, field: string, val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  function save() {
    setEditing(false)
    if (draft !== value) onSave(regId, colId, draft)
  }

  if (colId === "status") {
    return (
      <select
        value={value}
        onChange={(e) => onSave(regId, colId, e.target.value)}
        className="text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 cursor-pointer w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{getStatusLabel(s)}</option>
        ))}
      </select>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(value) } }}
        className="w-full text-xs px-1 py-0.5 border border-blue-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className="text-xs text-gray-700 px-1 py-0.5 rounded hover:bg-blue-50 cursor-text min-h-[22px] truncate"
      title={value || "—"}
    >
      {value || <span className="text-gray-300 italic">—</span>}
    </div>
  )
}

// ── SortIcon ──────────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: SortDir }) {
  if (col !== sortCol) return <ArrowUpDown className="h-3 w-3 text-gray-300 ml-1" />
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 text-blue-600 ml-1" />
    : <ArrowDown className="h-3 w-3 text-blue-600 ml-1" />
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ParticipantsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [paymentFilter, setPaymentFilter] = useState("ALL")
  const [checkinFilter, setCheckinFilter] = useState("ALL")
  const [eventFilter, setEventFilter] = useState("ALL")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [view, setView] = useState<View>("table")
  const [sortCol, setSortCol] = useState("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id))
  )
  const [showColPicker, setShowColPicker] = useState(false)
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [regRes, evRes] = await Promise.all([
        fetch("/api/participants"),
        fetch("/api/events"),
      ])
      if (regRes.ok) setRegistrations(await regRes.json())
      if (evRes.ok) setEvents(await evRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const eid = params.get("eventId") ?? params.get("event")
    if (eid) setEventFilter(eid)
  }, [])

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company ?? "").toLowerCase().includes(q) ||
      r.registrationCode.toLowerCase().includes(q)
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter
    const matchPayment = paymentFilter === "ALL" || r.paymentStatus === paymentFilter
    const matchCheckin = checkinFilter === "ALL" ||
      (checkinFilter === "YES" ? !!r.checkedInAt : !r.checkedInAt)
    const matchEvent = eventFilter === "ALL" || r.event.id === eventFilter
    return matchSearch && matchStatus && matchPayment && matchCheckin && matchEvent
  })

  // ── Sort ──────────────────────────────────────────────────────────────────

  const sorted = [...filtered].sort((a, b) => {
    let va = ""
    let vb = ""
    if (sortCol === "fullName") { va = `${a.firstName} ${a.lastName}`; vb = `${b.firstName} ${b.lastName}` }
    else if (sortCol === "event") { va = a.event.title; vb = b.event.title }
    else { va = String((a as unknown as Record<string, unknown>)[sortCol] ?? ""); vb = String((b as unknown as Record<string, unknown>)[sortCol] ?? "") }
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("asc") }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((r) => r.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  async function bulkAction(action: string) {
    if (!selected.size) return
    setBulkLoading(true)
    try {
      const res = await fetch("/api/participants/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action, eventId: eventFilter !== "ALL" ? eventFilter : undefined }),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      toast(`${result.updated ?? result.deleted ?? selected.size} partecipanti aggiornati`, { variant: "success" })
      setSelected(new Set())
      fetchData()
    } catch {
      toast("Errore nell'azione bulk", { variant: "error" })
    } finally {
      setBulkLoading(false)
    }
  }

  // ── Inline save (Masterlist) ──────────────────────────────────────────────

  async function saveCell(id: string, field: string, value: string) {
    setSaving((prev) => { const n = new Set(prev); n.add(id); return n })
    // Optimistic update
    setRegistrations((prev) =>
      prev.map((r) => r.id === id ? { ...r, [field]: value } : r)
    )
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast("Errore nel salvataggio", { variant: "error" })
      fetchData() // rollback
    } finally {
      setSaving((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const statsSource = eventFilter === "ALL" ? registrations : registrations.filter((r) => r.event.id === eventFilter)
  const statusCounts = {
    CONFIRMED: statsSource.filter((r) => r.status === "CONFIRMED").length,
    PENDING: statsSource.filter((r) => r.status === "PENDING").length,
    WAITLISTED: statsSource.filter((r) => r.status === "WAITLISTED" || r.status === "WAITLIST").length,
    CANCELLED: statsSource.filter((r) => r.status === "CANCELLED").length,
  }

  function getCellValue(reg: Registration, colId: string): string {
    if (colId === "fullName") return `${reg.firstName} ${reg.lastName}`
    if (colId === "event") return reg.event.title
    if (colId === "checkedInAt") return reg.checkedInAt ? "✓" : ""
    if (colId === "createdAt") return formatDate(reg.createdAt)
    return String((reg as unknown as Record<string, unknown>)[colId] ?? "")
  }

  const visibleColDefs = COLUMNS.filter((c) => visibleCols.has(c.id))

  return (
    <DashboardLayout>
      <Header
        title="Partecipanti"
        subtitle={`${registrations.length} iscrizioni · ${filtered.length} nella vista`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <a href="/api/participants/template" download>
              <Button variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />Template
              </Button>
            </a>
            <label className="cursor-pointer">
              <input
                type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  if (eventFilter === "ALL") { toast("Seleziona prima un evento per importare", { variant: "warning" }); return }
                  setImportFile(f); e.target.value = ""
                }}
              />
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span><Upload className="h-4 w-4" />Importa</span>
              </Button>
            </label>
            <a href={`/api/participants/export${eventFilter !== "ALL" ? `?eventId=${eventFilter}` : ""}`} download>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />Esporta
              </Button>
            </a>
            <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />Aggiungi
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Stats — cliccabili per filtrare */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "CONFIRMED", label: "Confermati", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { key: "PENDING", label: "In attesa", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { key: "WAITLISTED", label: "Waitlist", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
            { key: "CANCELLED", label: "Annullati", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          ].map(({ key, label, icon: Icon, color, bg }) => (
            <Card
              key={key}
              className={`cursor-pointer hover:shadow-sm transition-all ${statusFilter === key ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setStatusFilter(statusFilter === key ? "ALL" : key)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{statusCounts[key as keyof typeof statusCounts]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input placeholder="Cerca nome, email, azienda, codice..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="ALL">Tutti gli eventi</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Tutti gli stati</option>
            <option value="CONFIRMED">Confermati</option>
            <option value="PENDING">In attesa</option>
            <option value="WAITLISTED">Waitlist</option>
            <option value="CANCELLED">Annullati</option>
          </select>
          <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={checkinFilter} onChange={(e) => setCheckinFilter(e.target.value)}>
            <option value="ALL">Tutti check-in</option>
            <option value="YES">In sede</option>
            <option value="NO">Non arrivati</option>
          </select>
          <Button variant="ghost" size="sm" onClick={fetchData} className="h-9 w-9 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-auto">
            <button
              onClick={() => setView("table")}
              className={`h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors ${view === "table" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Tabella
            </button>
            <button
              onClick={() => setView("masterlist")}
              className={`h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors ${view === "masterlist" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <Table2 className="h-3.5 w-3.5" /> Masterlist
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-blue-700">{selected.size} selezionati</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkAction("confirm")} disabled={bulkLoading} className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50">
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Conferma
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("pending")} disabled={bulkLoading} className="gap-1.5 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
                <Clock className="h-3.5 w-3.5" />In attesa
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("cancel")} disabled={bulkLoading} className="gap-1.5 text-orange-700 border-orange-200 hover:bg-orange-50">
                <XCircle className="h-3.5 w-3.5" />Annulla
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("delete")} disabled={bulkLoading} className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />Elimina
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 text-xs">
              Deseleziona
            </Button>
          </div>
        )}

        {/* Results count */}
        {(search || statusFilter !== "ALL" || eventFilter !== "ALL" || checkinFilter !== "ALL") && (
          <p className="text-sm text-gray-500">{sorted.length} risultat{sorted.length === 1 ? "o" : "i"} trovati</p>
        )}

        {/* ── TABLE VIEW ───────────────────────────────────────────────────── */}
        {view === "table" && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="pl-4 pr-2 py-3 w-8">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </th>
                      {[
                        { col: "fullName", label: "Partecipante" },
                        { col: "event", label: "Evento" },
                        { col: "status", label: "Stato" },
                        { col: "paymentStatus", label: "Pagamento" },
                        { col: "checkedInAt", label: "Check-in" },
                        { col: "createdAt", label: "Iscritto il" },
                      ].map(({ col, label }) => (
                        <th key={col} className="px-4 py-3 text-left">
                          <button
                            onClick={() => toggleSort(col)}
                            className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-800 transition-colors"
                          >
                            {label}
                            <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={8} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      </td></tr>
                    ) : sorted.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>Nessun partecipante trovato</p>
                      </td></tr>
                    ) : sorted.map((reg) => (
                      <tr key={reg.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(reg.id) ? "bg-blue-50/50" : ""}`}>
                        <td className="pl-4 pr-2 py-3">
                          <input type="checkbox" checked={selected.has(reg.id)} onChange={() => toggleOne(reg.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        <td className="px-4 py-3" onClick={() => setSelectedReg(reg)}>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {reg.firstName[0]}{reg.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 hover:text-blue-600 leading-tight">{reg.firstName} {reg.lastName}</p>
                              <p className="text-xs text-gray-400">{reg.email}</p>
                              {reg.company && <p className="text-xs text-gray-400">{reg.company}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{reg.event.title}</td>
                        <td className="px-4 py-3">
                          {/* Quick status change */}
                          <select
                            value={reg.status}
                            onChange={(e) => { e.stopPropagation(); saveCell(reg.id, "status", e.target.value) }}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${getStatusColor(reg.status)}`}
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(reg.paymentStatus)}>{getStatusLabel(reg.paymentStatus)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {reg.checkedInAt
                            ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" />In sede</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(reg.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedReg(reg)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && sorted.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                  <span>Mostrati {sorted.length} di {registrations.length} partecipanti</span>
                  {selected.size > 0 && <span className="text-blue-600 font-medium">{selected.size} selezionati</span>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── MASTERLIST VIEW ──────────────────────────────────────────────── */}
        {view === "masterlist" && (
          <div className="space-y-2">
            {/* Column picker */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {sorted.length} partecipanti · Clicca una cella per modificarla
              </p>
              <div className="relative">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setShowColPicker(!showColPicker)}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Columns className="h-3.5 w-3.5" />
                  Colonne ({visibleCols.size})
                </Button>
                {showColPicker && (
                  <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52 space-y-1">
                    {COLUMNS.map((col) => (
                      <label key={col.id} className="flex items-center gap-2.5 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${visibleCols.has(col.id) ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                          onClick={() => {
                            setVisibleCols((prev) => {
                              const n = new Set(prev)
                              n.has(col.id) ? n.delete(col.id) : n.add(col.id)
                              return n
                            })
                          }}
                        >
                          {visibleCols.has(col.id) && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="pl-3 pr-2 py-2.5 w-8 border-r border-gray-100">
                          <input type="checkbox" checked={allSelected} onChange={toggleAll}
                            className="h-3.5 w-3.5 rounded border-gray-300" />
                        </th>
                        {/* Sticky # col */}
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 w-8 border-r border-gray-100">#</th>
                        {visibleColDefs.map((col) => (
                          <th
                            key={col.id}
                            style={{ minWidth: col.minW }}
                            className="px-2 py-2.5 border-r border-gray-100 last:border-r-0"
                          >
                            <button
                              onClick={() => toggleSort(col.id)}
                              className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-800 whitespace-nowrap"
                            >
                              {col.label}
                              <SortIcon col={col.id} sortCol={sortCol} sortDir={sortDir} />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <tr><td colSpan={visibleColDefs.length + 3} className="text-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        </td></tr>
                      ) : sorted.length === 0 ? (
                        <tr><td colSpan={visibleColDefs.length + 3} className="text-center py-12 text-gray-400 text-sm">
                          Nessun partecipante trovato
                        </td></tr>
                      ) : sorted.map((reg, idx) => (
                        <tr
                          key={reg.id}
                          className={`hover:bg-blue-50/30 transition-colors ${selected.has(reg.id) ? "bg-blue-50" : ""} ${saving.has(reg.id) ? "opacity-60" : ""}`}
                        >
                          <td className="pl-3 pr-2 py-1.5 border-r border-gray-100">
                            <input type="checkbox" checked={selected.has(reg.id)} onChange={() => toggleOne(reg.id)}
                              className="h-3.5 w-3.5 rounded border-gray-300" />
                          </td>
                          <td className="px-3 py-1.5 text-xs text-gray-300 border-r border-gray-100 select-none">{idx + 1}</td>
                          {visibleColDefs.map((col) => (
                            <td key={col.id} className="px-2 py-1 border-r border-gray-100 last:border-r-0" style={{ minWidth: col.minW }}>
                              {col.id === "fullName" ? (
                                <button
                                  onClick={() => setSelectedReg(reg)}
                                  className="flex items-center gap-2 group hover:text-blue-600 text-left w-full"
                                >
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                    {reg.firstName[0]}{reg.lastName[0]}
                                  </div>
                                  <span className="text-xs font-medium text-gray-900 group-hover:text-blue-600 truncate">
                                    {reg.firstName} {reg.lastName}
                                  </span>
                                </button>
                              ) : col.id === "checkedInAt" ? (
                                <span className={`text-xs font-medium ${reg.checkedInAt ? "text-green-600" : "text-gray-300"}`}>
                                  {reg.checkedInAt ? "✓" : "—"}
                                </span>
                              ) : col.id === "status" ? (
                                <EditableCell
                                  colId="status"
                                  value={reg.status}
                                  regId={reg.id}
                                  onSave={saveCell}
                                />
                              ) : col.type === "readonly" ? (
                                <span className="text-xs text-gray-600 px-1">{getCellValue(reg, col.id) || <span className="text-gray-300">—</span>}</span>
                              ) : (
                                <EditableCell
                                  colId={col.id}
                                  value={getCellValue(reg, col.id)}
                                  regId={reg.id}
                                  onSave={saveCell}
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!loading && sorted.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                    <span>{sorted.length} partecipanti</span>
                    <span className="text-gray-300 italic">Clicca una cella per modificarla · Enter o click fuori per salvare</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedReg && (
        <ParticipantModal
          registration={selectedReg}
          onClose={() => setSelectedReg(null)}
          onUpdate={() => { fetchData(); setSelectedReg(null) }}
        />
      )}
      {showAdd && (
        <AddParticipantModal
          events={events}
          defaultEventId={eventFilter !== "ALL" ? eventFilter : undefined}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { fetchData(); setShowAdd(false) }}
        />
      )}
      {importFile && (
        <ImportPreviewModal
          file={importFile}
          eventId={eventFilter !== "ALL" ? eventFilter : ""}
          onClose={() => setImportFile(null)}
          onSuccess={() => { fetchData(); setImportFile(null) }}
        />
      )}
    </DashboardLayout>
  )
}
