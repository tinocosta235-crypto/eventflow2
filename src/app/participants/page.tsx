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
  Send,
} from "lucide-react";
import { getStatusColor, getStatusLabel, formatDate } from "@/lib/utils";
import { InviteesTab } from "@/components/invitees/invitees-tab";

interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  status: string;
  paymentStatus: string;
  checkedInAt?: string;
  createdAt: string;
  event: { id: string; title: string };
}

interface Event {
  id: string;
  title: string;
}

type Tab = "iscritti" | "invitati";

export default function ParticipantsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("iscritti");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, evRes] = await Promise.all([
        fetch("/api/participants"),
        fetch("/api/events"),
      ]);
      setRegistrations(await regRes.json());
      setEvents(await evRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchEvent = eventFilter === "ALL" || r.event.id === eventFilter;
    return matchSearch && matchStatus && matchEvent;
  });

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || eventFilter === "ALL") {
      alert("Seleziona prima un evento per importare i partecipanti.");
      return;
    }
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("eventId", eventFilter);
    try {
      const res = await fetch("/api/participants/import-file", { method: "POST", body: fd });
      const result = await res.json();
      setImportResult(result);
      fetchData();
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const statusCounts = {
    ALL: registrations.length,
    CONFIRMED: registrations.filter((r) => r.status === "CONFIRMED").length,
    PENDING: registrations.filter((r) => r.status === "PENDING").length,
    WAITLIST: registrations.filter((r) => r.status === "WAITLIST").length,
    CANCELLED: registrations.filter((r) => r.status === "CANCELLED").length,
  };

  return (
    <DashboardLayout>
      <Header
        title="Partecipanti"
        subtitle={`${registrations.length} iscrizioni · ${activeTab === "invitati" ? "gestione lista invitati" : "gestione iscritti"}`}
        actions={
          activeTab === "iscritti" ? (
            <div className="flex items-center gap-2">
              <a href="/api/participants/template" download>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Template
                </Button>
              </a>
              <label className="cursor-pointer">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <span>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Importa Excel
                  </span>
                </Button>
              </label>
              <a href={`/api/participants/export${eventFilter !== "ALL" ? `?eventId=${eventFilter}` : ""}`} download>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Esporta
                </Button>
              </a>
            </div>
          ) : null
        }
      />

      <div className="p-6 space-y-4">

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("iscritti")}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "iscritti"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="h-4 w-4" />
            Iscritti
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "iscritti" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {registrations.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("invitati")}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "invitati"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Send className="h-4 w-4" />
            Lista Invitati
          </button>
        </div>

        {/* ISCRITTI TAB */}
        {activeTab === "iscritti" && (
          <>
            {importResult && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
                <p className="text-sm text-green-700 font-medium">
                  Importazione completata: {importResult.imported} importati, {importResult.skipped} saltati
                </p>
                <button onClick={() => setImportResult(null)} className="text-green-500 hover:text-green-700 text-xs">✕</button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "CONFIRMED", label: "Confermati", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
                { key: "PENDING", label: "In Attesa", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
                { key: "WAITLIST", label: "Lista Attesa", icon: Users, color: "text-purple-600 bg-purple-50" },
                { key: "CANCELLED", label: "Annullati", icon: XCircle, color: "text-red-600 bg-red-50" },
              ].map(({ key, label, icon: Icon, color }) => (
                <Card key={key} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setStatusFilter(key === statusFilter ? "ALL" : key)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg ${color.split(" ")[1]} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${color.split(" ")[0]}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-lg font-bold text-gray-900">{statusCounts[key as keyof typeof statusCounts]}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
              <select
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tutti gli stati ({statusCounts.ALL})</option>
                <option value="CONFIRMED">Confermati ({statusCounts.CONFIRMED})</option>
                <option value="PENDING">In attesa ({statusCounts.PENDING})</option>
                <option value="WAITLIST">Lista attesa ({statusCounts.WAITLIST})</option>
                <option value="CANCELLED">Annullati ({statusCounts.CANCELLED})</option>
              </select>
              <Button variant="ghost" size="sm" onClick={fetchData} className="gap-2">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Partecipante", "Evento", "Stato", "Pagamento", "Check-in", "Iscritto il"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loading ? (
                        <tr><td colSpan={6} className="text-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        </td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                          <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>Nessun partecipante trovato</p>
                        </td></tr>
                      ) : (
                        filtered.map((reg) => (
                          <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {reg.firstName[0]}{reg.lastName[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{reg.firstName} {reg.lastName}</p>
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
                                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(reg.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && filtered.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                    Mostrati {filtered.length} di {registrations.length} partecipanti
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* INVITATI TAB */}
        {activeTab === "invitati" && (
          <InviteesTab events={events} />
        )}
      </div>
    </DashboardLayout>
  );
}
