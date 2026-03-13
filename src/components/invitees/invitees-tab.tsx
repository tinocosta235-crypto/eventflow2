"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Upload, Plus, CheckCircle2, Clock, XCircle,
  Loader2, RefreshCw, HelpCircle, Send, Mail, MailOpen,
  MousePointerClick, Plane, ChevronRight, Trash2, Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { InviteeDetailModal } from "./invitee-detail-modal";
import { AddInviteeModal } from "./add-invitee-modal";

interface Invitee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  status: string;
  invitesSent: number;
  lastInviteSentAt?: string;
  emailOpenedAt?: string;
  emailClickedAt?: string;
  convertedToRegistration: boolean;
  travelPlan?: { transportType?: string } | null;
  event: { id: string; title: string };
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "In Attesa", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3.5 w-3.5" /> },
  CONFIRMED: { label: "Confermato", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  DECLINED: { label: "Rifiutato", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3.5 w-3.5" /> },
  NO_RESPONSE: { label: "Nessuna Risposta", color: "bg-gray-100 text-gray-700", icon: <HelpCircle className="h-3.5 w-3.5" /> },
};

interface Props {
  events: Event[];
}

export function InviteesTab({ events }: Props) {
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventFilter !== "ALL") params.set("eventId", eventFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/invitees?${params}`);
      setInvitees(await res.json());
    } finally {
      setLoading(false);
    }
  }, [eventFilter, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo invitato?")) return;
    await fetch(`/api/invitees/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleSendInvite(id: string) {
    await fetch(`/api/invitees/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchData();
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (eventFilter === "ALL") {
      alert("Seleziona un evento specifico prima di importare.");
      return;
    }
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("eventId", eventFilter);
    try {
      const res = await fetch("/api/invitees/import", { method: "POST", body: fd });
      const result = await res.json();
      setImportResult(result);
      fetchData();
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const counts = {
    ALL: invitees.length,
    CONFIRMED: invitees.filter((i) => i.status === "CONFIRMED").length,
    PENDING: invitees.filter((i) => i.status === "PENDING").length,
    DECLINED: invitees.filter((i) => i.status === "DECLINED").length,
    NO_RESPONSE: invitees.filter((i) => i.status === "NO_RESPONSE").length,
    CONVERTED: invitees.filter((i) => i.convertedToRegistration).length,
  };

  const filtered = invitees.filter((inv) => {
    const q = search.toLowerCase();
    return !q || [inv.firstName, inv.lastName, inv.email, inv.company ?? ""].some((v) =>
      v.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {importResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
          <p className="text-sm text-green-700 font-medium">
            Importazione completata: {importResult.created} aggiunti, {importResult.skipped} saltati
          </p>
          <button onClick={() => setImportResult(null)} className="text-green-500 hover:text-green-700 text-xs">✕</button>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <span>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importa Excel
              </span>
            </Button>
          </label>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Aggiungi Invitato
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          {counts.CONVERTED} di {counts.ALL} convertiti a iscrizione
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: "ALL", label: "Totale", color: "text-gray-600 bg-gray-50", Icon: Users },
          { key: "CONFIRMED", label: "Confermati", color: "text-green-600 bg-green-50", Icon: CheckCircle2 },
          { key: "PENDING", label: "In Attesa", color: "text-yellow-600 bg-yellow-50", Icon: Clock },
          { key: "DECLINED", label: "Rifiutati", color: "text-red-600 bg-red-50", Icon: XCircle },
          { key: "NO_RESPONSE", label: "N/R", color: "text-gray-500 bg-gray-50", Icon: HelpCircle },
        ].map(({ key, label, color, Icon }) => (
          <Card
            key={key}
            className={`cursor-pointer hover:shadow-sm transition-shadow ${statusFilter === key ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setStatusFilter(key === statusFilter ? "ALL" : key)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`h-7 w-7 rounded-lg ${color.split(" ")[1]} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${color.split(" ")[0]}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-base font-bold text-gray-900">{counts[key as keyof typeof counts]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca per nome, email, azienda..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="ALL">Tutti gli eventi</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Invitato", "Evento", "Stato", "Invii", "Tracking", "Piano Viaggio", "Convertito", ""].map((h) => (
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
                    <p>Nessun invitato trovato</p>
                    <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowAddModal(true)}>
                      <Plus className="h-3.5 w-3.5" /> Aggiungi primo invitato
                    </Button>
                  </td></tr>
                ) : (
                  filtered.map((inv) => {
                    const st = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDING;
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedId(inv.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {inv.firstName[0]}{inv.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{inv.firstName} {inv.lastName}</p>
                              <p className="text-xs text-gray-400">{inv.email}</p>
                              {inv.company && <p className="text-xs text-gray-400">{inv.company}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{inv.event.title}</td>
                        <td className="px-4 py-3">
                          <Badge className={`${st.color} flex items-center gap-1 w-fit`}>
                            {st.icon}{st.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-center">
                            <span className="text-sm font-semibold text-gray-700">{inv.invitesSent}</span>
                            {inv.lastInviteSentAt && (
                              <p className="text-xs text-gray-400">{formatDate(inv.lastInviteSentAt)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {inv.emailOpenedAt
                              ? <MailOpen className="h-4 w-4 text-green-500" aria-label="Email aperta" />
                              : <Mail className="h-4 w-4 text-gray-300" aria-label="Non aperta" />}
                            {inv.emailClickedAt
                              ? <MousePointerClick className="h-4 w-4 text-blue-500" aria-label="Link cliccato" />
                              : <ChevronRight className="h-4 w-4 text-gray-300" aria-label="Non cliccato" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {inv.travelPlan?.transportType
                            ? <Plane className="h-4 w-4 text-blue-500" aria-label="Piano viaggio presente" />
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {inv.convertedToRegistration
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Iscritto all'evento" />
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              title="Invia Invito"
                              onClick={() => handleSendInvite(inv.id)}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              title="Elimina"
                              onClick={() => handleDelete(inv.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              {filtered.length} invitati
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <InviteeDetailModal
          inviteeId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={fetchData}
        />
      )}

      {showAddModal && (
        <AddInviteeModal
          events={events}
          defaultEventId={eventFilter !== "ALL" ? eventFilter : undefined}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
