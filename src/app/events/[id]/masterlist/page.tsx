"use client"

import { useState, useEffect, useCallback, use, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Download, Search, Filter, RefreshCw, Loader2,
  Users, Check, Columns, CheckCircle2, Circle, ArrowUpDown, ArrowUp, ArrowDown,
  UserPlus, Upload, X, FileSpreadsheet,
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/toaster"
import { getStatusColor, getStatusLabel, formatDate } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormField {
  id: string
  label: string
  type: string
  order: number
}

interface Group {
  id: string
  name: string
  color: string
}

interface RegistrationField {
  fieldId: string
  value: string | null
  field: FormField
}

interface RoomAssignment {
  roomType: { name: string }
  allotment: { hotel: { name: string } }
}

interface Registration {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  company: string | null
  jobTitle: string | null
  status: string
  paymentStatus: string
  checkedInAt: string | null
  registrationCode: string
  createdAt: string
  groupId: string | null
  group: Group | null
  fields: RegistrationField[]
  checkIn: { checkedInAt: string } | null
  roomAssignments: RoomAssignment[]
}

interface Event {
  id: string
  title: string
  clientName: string | null
}

type SortDir = "asc" | "desc"

// ── EditableCell ──────────────────────────────────────────────────────────────

function EditableCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  function save() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(value) } }}
        className="w-full text-xs px-1 py-0.5 border border-blue-400 rounded bg-white focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className="text-xs text-gray-700 px-1 py-0.5 rounded hover:bg-blue-50 cursor-text min-h-[22px] truncate max-w-[160px]"
      title={value || "—"}
    >
      {value || <span className="text-gray-300">—</span>}
    </div>
  )
}

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: SortDir }) {
  if (col !== sortCol) return <ArrowUpDown className="h-3 w-3 text-gray-300 ml-1 flex-shrink-0" />
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 text-blue-600 ml-1 flex-shrink-0" />
    : <ArrowDown className="h-3 w-3 text-blue-600 ml-1 flex-shrink-0" />
}

// ── AddParticipantModal ───────────────────────────────────────────────────────

function AddParticipantModal({ eventId, onClose, onSaved }: { eventId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", jobTitle: "", status: "CONFIRMED" })
  const [saving, setSaving] = useState(false)

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.firstName || !form.lastName || !form.email) {
      toast("Nome, cognome e email sono obbligatori", { variant: "error" }); return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, eventId }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toast(err.error ?? "Errore nel salvataggio", { variant: "error" }); return
      }
      toast("Partecipante aggiunto")
      onSaved()
      onClose()
    } catch {
      toast("Errore di connessione", { variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-w-[95vw] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Aggiungi partecipante</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "firstName", label: "Nome *", placeholder: "Mario" },
              { k: "lastName", label: "Cognome *", placeholder: "Rossi" },
            ].map(({ k, label, placeholder }) => (
              <div key={k}>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{label}</label>
                <Input placeholder={placeholder} value={(form as Record<string, string>)[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Email *</label>
            <Input type="email" placeholder="mario.rossi@azienda.it" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "phone", label: "Telefono", placeholder: "+39 333 000 0000" },
              { k: "company", label: "Azienda", placeholder: "Acme SpA" },
            ].map(({ k, label, placeholder }) => (
              <div key={k}>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{label}</label>
                <Input placeholder={placeholder} value={(form as Record<string, string>)[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Ruolo</label>
              <Input placeholder="CEO" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Stato</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)]">
                <option value="CONFIRMED">Confermato</option>
                <option value="PENDING">In attesa</option>
                <option value="WAITLISTED">Waitlist</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-[var(--depth-3)]">
          <Button variant="outline" size="sm" onClick={onClose}>Annulla</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Aggiungi
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── ImportModal ───────────────────────────────────────────────────────────────

function ImportModal({ eventId, onClose, onSaved }: { eventId: string; onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  async function handleImport() {
    if (!file) { toast("Seleziona un file", { variant: "error" }); return }
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("eventId", eventId)
      const res = await fetch("/api/participants/import-file", { method: "POST", body: fd })
      const data = await res.json() as { imported: number; skipped: number; errors: string[] }
      setResult(data)
      if (data.imported > 0) { toast(`${data.imported} partecipanti importati`); onSaved() }
    } catch {
      toast("Errore durante l'importazione", { variant: "error" })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[95vw] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Importa da file</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {!result ? (
            <>
              {/* Download template */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--depth-3)] border border-[var(--border-dim)]">
                <FileSpreadsheet className="h-5 w-5 text-[var(--accent)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)]">Scarica il template Excel</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Colonne: nome*, cognome*, email*, telefono, azienda, ruolo, stato, note</p>
                </div>
                <a href="/api/participants/template" download className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap">Scarica</a>
              </div>
              {/* File drop area */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file ? "border-[var(--accent)] bg-[rgba(112,96,204,0.04)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
                onClick={() => document.getElementById("import-file-input")?.click()}
              >
                <input
                  id="import-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-[var(--accent)]" />
                    <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{(file.size / 1024).toFixed(0)} KB · clicca per cambiare</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                    <p className="text-sm font-medium text-[var(--text-primary)]">Trascina o clicca per selezionare</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Formati supportati: .xlsx, .xls, .csv</p>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                  <p className="text-xs text-green-600">Importati</p>
                </div>
                <div className="flex-1 rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                  <p className="text-xs text-yellow-600">Saltati (duplicati)</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">Errori ({result.errors.length})</p>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>· {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-[var(--depth-3)]">
          <Button variant="outline" size="sm" onClick={onClose}>{result ? "Chiudi" : "Annulla"}</Button>
          {!result && (
            <Button size="sm" onClick={handleImport} disabled={importing || !file}>
              {importing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {importing ? "Importazione..." : "Importa"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MasterlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params)

  const [viewMode, setViewMode] = useState<"guest-list" | "masterlist">("guest-list")
  const [event, setEvent] = useState<Event | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Set<string>>(new Set())

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [groupFilter, setGroupFilter] = useState("ALL")

  // Sort
  const [sortCol, setSortCol] = useState("lastName")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Column visibility
  const [showColPicker, setShowColPicker] = useState(false)
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/masterlist`)
      if (res.ok) {
        const d = await res.json()
        setEvent(d.event)
        setFormFields(d.formFields)
        setRegistrations(d.registrations)
        setGroups(d.groups)
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Save cell ──────────────────────────────────────────────────────────────

  async function saveCell(regId: string, field: string, value: string) {
    setSaving((p) => { const n = new Set(p); n.add(regId); return n })
    setRegistrations((prev) => prev.map((r) => r.id === regId ? { ...r, [field]: value } : r))
    try {
      const res = await fetch(`/api/participants/${regId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast("Errore nel salvataggio", { variant: "error" })
      fetchData()
    } finally {
      setSaving((p) => { const n = new Set(p); n.delete(regId); return n })
    }
  }

  async function saveGroup(regId: string, groupId: string) {
    const val = groupId === "" ? null : groupId
    setSaving((p) => { const n = new Set(p); n.add(regId); return n })
    setRegistrations((prev) => prev.map((r) => {
      if (r.id !== regId) return r
      const grp = groups.find((g) => g.id === groupId) ?? null
      return { ...r, groupId: val, group: grp }
    }))
    try {
      await fetch(`/api/participants/${regId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: val }),
      })
    } catch {
      toast("Errore", { variant: "error" }); fetchData()
    } finally {
      setSaving((p) => { const n = new Set(p); n.delete(regId); return n })
    }
  }

  // ── Filter + Sort ─────────────────────────────────────────────────────────

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company ?? "").toLowerCase().includes(q)
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter
    const matchGroup = groupFilter === "ALL" || (groupFilter === "NONE" ? !r.groupId : r.groupId === groupFilter)
    return matchSearch && matchStatus && matchGroup
  })

  const sorted = [...filtered].sort((a, b) => {
    let va = ""
    let vb = ""
    if (sortCol === "fullName") { va = `${a.lastName} ${a.firstName}`; vb = `${b.lastName} ${b.firstName}` }
    else if (sortCol === "group") { va = a.group?.name ?? ""; vb = b.group?.name ?? "" }
    else { va = String((a as unknown as Record<string, unknown>)[sortCol] ?? ""); vb = String((b as unknown as Record<string, unknown>)[sortCol] ?? "") }
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("asc") }
  }

  function toggleCol(id: string) {
    setHiddenCols((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  // ── Column definitions ─────────────────────────────────────────────────────

  const CORE_COLS = [
    { id: "fullName", label: "Partecipante" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Telefono" },
    { id: "company", label: "Azienda" },
    { id: "jobTitle", label: "Ruolo" },
    { id: "group", label: "Gruppo" },
    { id: "status", label: "Stato" },
    { id: "checkedInAt", label: "Check-in" },
    { id: "hotel", label: "Hotel" },
    { id: "createdAt", label: "Iscritto il" },
  ]

  const ALL_COLS = [
    ...CORE_COLS,
    ...formFields.map((f) => ({ id: `field_${f.id}`, label: f.label })),
  ]

  const visibleCols = ALL_COLS.filter((c) => !hiddenCols.has(c.id))

  function getFieldValue(reg: Registration, colId: string): string {
    if (colId === "fullName") return `${reg.firstName} ${reg.lastName}`
    if (colId === "group") return reg.group?.name ?? ""
    if (colId === "status") return getStatusLabel(reg.status)
    if (colId === "checkedInAt") return reg.checkedInAt ? "✓" : ""
    if (colId === "hotel") return reg.roomAssignments[0]?.allotment.hotel.name ?? ""
    if (colId === "createdAt") return formatDate(reg.createdAt)
    if (colId.startsWith("field_")) {
      const fieldId = colId.replace("field_", "")
      return reg.fields.find((f) => f.fieldId === fieldId)?.value ?? ""
    }
    return String((reg as unknown as Record<string, unknown>)[colId] ?? "")
  }

  const isCoreEditable = (id: string) => ["email", "phone", "company", "jobTitle"].includes(id)

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <Header
        title="Gestione Partecipanti"
        subtitle={`${sorted.length} partecipanti${event?.clientName ? ` · ${event.clientName}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setViewMode("guest-list")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "guest-list"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                Lista Ospiti
              </button>
              <button
                onClick={() => setViewMode("masterlist")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "masterlist"
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                Masterlist
              </button>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4" />Aggiungi
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4" />Importa
            </Button>
            <a href={`/api/participants/export?eventId=${eventId}`} download>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />Esporta
              </Button>
            </a>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Guest List view */}
        {viewMode === "guest-list" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Totale", value: registrations.length, color: "text-gray-900" },
                { label: "Confermati", value: registrations.filter((r) => r.status === "CONFIRMED").length, color: "text-green-600" },
                { label: "In attesa", value: registrations.filter((r) => r.status === "PENDING").length, color: "text-yellow-600" },
                { label: "Check-in", value: registrations.filter((r) => r.checkedInAt).length, color: "text-blue-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-3 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Cerca nome, email, azienda..."
                className="pl-8 h-9 text-sm max-w-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sorted.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nessun partecipante trovato</p>
                </div>
              ) : sorted.map((reg) => (
                <Card key={reg.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {reg.firstName[0]}{reg.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{reg.firstName} {reg.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{reg.email}</p>
                        {reg.company && <p className="text-xs text-gray-400 truncate">{reg.company}</p>}
                      </div>
                      <div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusColor(reg.status)}`}>
                          {getStatusLabel(reg.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                      {reg.group && (
                        <span
                          className="px-2 py-0.5 rounded-full text-white text-[10px] font-medium"
                          style={{ backgroundColor: reg.group.color || "#6B7280" }}
                        >
                          {reg.group.name}
                        </span>
                      )}
                      {reg.checkedInAt && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />Check-in
                        </span>
                      )}
                      <span className="ml-auto font-mono">{reg.registrationCode}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Masterlist view */}
        {viewMode === "masterlist" && (
        <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Totale", value: registrations.length, color: "text-gray-900" },
            { label: "Confermati", value: registrations.filter((r) => r.status === "CONFIRMED").length, color: "text-green-600" },
            { label: "Check-in", value: registrations.filter((r) => r.checkedInAt).length, color: "text-blue-600" },
            { label: "Hotel", value: registrations.filter((r) => r.roomAssignments.length > 0).length, color: "text-purple-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Cerca nome, email, azienda..."
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="ALL">Tutti gli stati</option>
            <option value="CONFIRMED">Confermati</option>
            <option value="PENDING">In attesa</option>
            <option value="WAITLISTED">Waitlist</option>
            <option value="CANCELLED">Annullati</option>
          </select>
          {groups.length > 0 && (
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ALL">Tutti i gruppi</option>
              <option value="NONE">Senza gruppo</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}

          {/* Column picker */}
          <div className="relative ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => setShowColPicker(!showColPicker)}>
              <Columns className="h-3.5 w-3.5" />Colonne ({visibleCols.length}/{ALL_COLS.length})
            </Button>
            {showColPicker && (
              <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 space-y-0.5 max-h-80 overflow-y-auto">
                {ALL_COLS.map((col) => (
                  <label key={col.id} className="flex items-center gap-2.5 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${!hiddenCols.has(col.id) ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                      onClick={() => toggleCol(col.id)}
                    >
                      {!hiddenCols.has(col.id) && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="text-xs text-gray-700 truncate">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Masterlist table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="pl-3 pr-1 py-2.5 text-xs font-semibold text-gray-400 w-8 border-r border-gray-100">#</th>
                    {visibleCols.map((col) => (
                      <th
                        key={col.id}
                        className="px-2 py-2.5 border-r border-gray-100 last:border-r-0 text-left"
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
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={visibleCols.length + 1} className="text-center py-12 text-gray-400">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nessun partecipante trovato</p>
                      </td>
                    </tr>
                  ) : sorted.map((reg, idx) => (
                    <tr
                      key={reg.id}
                      className={`hover:bg-blue-50/20 transition-colors ${saving.has(reg.id) ? "opacity-60" : ""}`}
                    >
                      <td className="pl-3 pr-1 py-1.5 text-xs text-gray-300 border-r border-gray-100 select-none">{idx + 1}</td>
                      {visibleCols.map((col) => (
                        <td key={col.id} className="px-1 py-1 border-r border-gray-100 last:border-r-0">
                          {/* Partecipante (readonly) */}
                          {col.id === "fullName" && (
                            <div className="flex items-center gap-2 px-1">
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                {reg.firstName[0]}{reg.lastName[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate max-w-[140px]">
                                  {reg.firstName} {reg.lastName}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{reg.registrationCode}</p>
                              </div>
                            </div>
                          )}

                          {/* Gruppo */}
                          {col.id === "group" && (
                            <select
                              value={reg.groupId ?? ""}
                              onChange={(e) => saveGroup(reg.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 cursor-pointer w-full max-w-[140px]"
                            >
                              <option value="">— nessun gruppo</option>
                              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          )}

                          {/* Stato */}
                          {col.id === "status" && (
                            <select
                              value={reg.status}
                              onChange={(e) => saveCell(reg.id, "status", e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer ${getStatusColor(reg.status)}`}
                            >
                              {["CONFIRMED", "PENDING", "WAITLISTED", "CANCELLED"].map((s) => (
                                <option key={s} value={s}>{getStatusLabel(s)}</option>
                              ))}
                            </select>
                          )}

                          {/* Check-in */}
                          {col.id === "checkedInAt" && (
                            <span className={`text-xs px-1 flex items-center gap-0.5 ${reg.checkedInAt ? "text-green-600" : "text-gray-300"}`}>
                              {reg.checkedInAt ? <><CheckCircle2 className="h-3 w-3" />Sì</> : <><Circle className="h-3 w-3" />No</>}
                            </span>
                          )}

                          {/* Hotel */}
                          {col.id === "hotel" && (
                            <span className="text-xs text-gray-600 px-1 truncate max-w-[120px] block" title={getFieldValue(reg, "hotel")}>
                              {getFieldValue(reg, "hotel") || <span className="text-gray-300">—</span>}
                            </span>
                          )}

                          {/* createdAt */}
                          {col.id === "createdAt" && (
                            <span className="text-xs text-gray-400 px-1">{formatDate(reg.createdAt)}</span>
                          )}

                          {/* Core editable */}
                          {isCoreEditable(col.id) && (
                            <EditableCell
                              value={String((reg as unknown as Record<string, unknown>)[col.id] ?? "")}
                              onSave={(v) => saveCell(reg.id, col.id, v)}
                            />
                          )}

                          {/* Custom form field */}
                          {col.id.startsWith("field_") && (
                            <span className="text-xs text-gray-600 px-1 truncate max-w-[160px] block" title={getFieldValue(reg, col.id)}>
                              {getFieldValue(reg, col.id) || <span className="text-gray-300">—</span>}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                <span>{sorted.length} partecipanti{filtered.length !== registrations.length ? ` (filtrati da ${registrations.length})` : ""}</span>
                <span className="text-gray-300 italic">Clicca una cella per modificarla · Enter o click fuori per salvare</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Close col picker on outside click */}
      {showColPicker && (
        <div className="fixed inset-0 z-10" onClick={() => setShowColPicker(false)} />
      )}
    </div>

    {showAddModal && (
      <AddParticipantModal
        eventId={eventId}
        onClose={() => setShowAddModal(false)}
        onSaved={fetchData}
      />
    )}
    {showImportModal && (
      <ImportModal
        eventId={eventId}
        onClose={() => setShowImportModal(false)}
        onSaved={fetchData}
      />
    )}
    </DashboardLayout>
  )
}
