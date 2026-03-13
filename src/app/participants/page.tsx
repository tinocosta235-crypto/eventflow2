"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Search, Download, Upload, Plus, CheckCircle2,
  Clock, XCircle, Loader2, RefreshCw, FileSpreadsheet,
  Trash2, ChevronDown, Filter, MoreHorizontal,
} from "lucide-react";
import { getStatusColor, getStatusLabel, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { ParticipantModal } from "@/components/participants/ParticipantModal";
import { AddParticipantModal } from "@/components/participants/AddParticipantModal";
import { ImportPreviewModal } from "@/components/participants/ImportPreviewModal";

interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  notes?: string;
  status: string;
  paymentStatus: string;
  ticketPrice?: number;
  checkedInAt?: string;
  createdAt: string;
  registrationCode: string;
  event: { id: string; title: string };
}

interface Event {
  id: string;
  title: string;
  capacity?: number;
  currentCount?: number;
}

export default function ParticipantsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [checkinFilter, setCheckinFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, evRes] = await Promise.all([
        fetch("/api/participants"),
        fetch("/api/events"),
      ]);
      if (regRes.ok) setRegistrations(await regRes.json());
      if (evRes.ok) setEvents(await evRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Read eventId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eid = params.get("eventId");
    if (eid) setEventFilter(eid);
  }, []);

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company ?? "").toLowerCase().includes(q) ||
      r.registrationCode.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchPayment = paymentFilter === "ALL" || r.paymentStatus === paymentFilter;
    const matchCheckin = checkinFilter === "ALL" ||
      (checkinFilter === "YES" ? !!r.checkedInAt : !r.checkedInAt);
    const matchEvent = eventFilter === "ALL" || r.event.id === eventFilter;
    return matchSearch && matchStatus && matchPayment && matchCheckin && matchEvent;
  });

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: string) {
    if (!selected.size) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/participants/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          action,
          eventId: eventFilter !== "ALL" ? eventFilter : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      const count = result.updated ?? result.deleted ?? selected.size;
      toast(`${count} partecipanti aggiornati`, { variant: "success" });
      setSelected(new Set());
      fetchData();
    } catch {
      toast("Errore nell'azione bulk", { variant: "error" });
    } finally {
      setBulkLoading(false);
    }
  }

  const statusCounts = {
    CONFIRMED: registrations.filter((r) => r.status === "CONFIRMED").length,
    PENDING: registrations.filter((r) => r.status === "PENDING").length,
    WAITLIST: registrations.filter((r) => r.status === "WAITLIST").length,
    CANCELLED: registrations.filter((r) => r.status === "CANCELLED").length,
  };

  return (
    <DashboardLayout>
      <Header
        title="Partecipanti"
        subtitle={`${registrations.length} iscrizioni totali`}
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
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (eventFilter === "ALL") {
                    toast("Seleziona prima un evento per importare", { variant: "warning" });
                    return;
                  }
                  setImportFile(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span><Upload className="h-4 w-4" />Importa Excel</span>
              </Button>
            </label>
            <a href={`/api/participants/export${eventFilter !== "ALL" ? `?eventId=${eventFilter}` : ""}${statusFilter !== "ALL" ? `${eventFilter !== "ALL" ? "&" : "?"}status=${statusFilter}` : ""}`} download>
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
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "CONFIRMED", label: "Confermati", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { key: "PENDING", label: "In Attesa", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { key: "WAITLIST", label: "Lista Attesa", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
            { key: "CANCELLED", label: "Annullati", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          ].map(({ key, label, icon: Icon, color, bg }) => (
            <Card
              key={key}
              className={`cursor-pointer hover:shadow-sm transition-all ${statusFilter === key ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setStatusFilter(statusFilter === key ? "ALL" : key)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Cerca nome, email, azienda, codice..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <option value="WAITLIST">Lista attesa</option>
            <option value="CANCELLED">Annullati</option>
          </select>
          <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="ALL">Tutti i pagamenti</option>
            <option value="FREE">Gratuiti</option>
            <option value="PAID">Pagati</option>
            <option value="PENDING">Da pagare</option>
            <option value="REFUNDED">Rimborsati</option>
          </select>
          <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={checkinFilter} onChange={(e) => setCheckinFilter(e.target.value)}>
            <option value="ALL">Tutti check-in</option>
            <option value="YES">Già in sede</option>
            <option value="NO">Non arrivati</option>
          </select>
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {/* Bulk actions bar */}
        {someSelected && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-blue-700">{selected.size} selezionati</span>
            <div className="flex gap-2 ml-2">
              <Button size="sm" variant="outline" onClick={() => bulkAction("confirm")} disabled={bulkLoading} className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50">
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Conferma
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
              Deseleziona tutto
            </Button>
          </div>
        )}

        {/* Results */}
        {(search || statusFilter !== "ALL" || paymentFilter !== "ALL" || checkinFilter !== "ALL" || eventFilter !== "ALL") && (
          <p className="text-sm text-gray-500">{filtered.length} risultat{filtered.length === 1 ? "o" : "i"} trovati</p>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="pl-4 pr-2 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    {["Partecipante", "Evento", "Stato", "Pagamento", "Check-in", "Iscritto il", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    </td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nessun partecipante trovato</p>
                    </td></tr>
                  ) : (
                    filtered.map((reg) => (
                      <tr
                        key={reg.id}
                        className={`hover:bg-gray-50 transition-colors ${selected.has(reg.id) ? "bg-blue-50/50" : ""}`}
                      >
                        <td className="pl-4 pr-2 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(reg.id)}
                            onChange={() => toggleOne(reg.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedReg(reg)}>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {reg.firstName[0]}{reg.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 hover:text-blue-600">{reg.firstName} {reg.lastName}</p>
                              <p className="text-xs text-gray-400">{reg.email}</p>
                              {reg.company && <p className="text-xs text-gray-400">{reg.company}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{reg.event.title}</td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(reg.status)}>{getStatusLabel(reg.status)}</Badge>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>Mostrati {filtered.length} di {registrations.length} partecipanti</span>
                {someSelected && (
                  <span className="text-blue-600 font-medium">{selected.size} selezionati</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {selectedReg && (
        <ParticipantModal
          registration={selectedReg}
          onClose={() => setSelectedReg(null)}
          onUpdate={() => { fetchData(); setSelectedReg(null); }}
        />
      )}
      {showAdd && (
        <AddParticipantModal
          events={events}
          defaultEventId={eventFilter !== "ALL" ? eventFilter : undefined}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { fetchData(); setShowAdd(false); }}
        />
      )}
      {importFile && (
        <ImportPreviewModal
          file={importFile}
          eventId={eventFilter !== "ALL" ? eventFilter : ""}
          onClose={() => setImportFile(null)}
          onSuccess={() => { fetchData(); setImportFile(null); }}
        />
      )}
    </DashboardLayout>
  );
}
