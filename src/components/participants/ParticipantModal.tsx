"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  X, Save, Loader2, Mail, Phone, Building2, Briefcase,
  Calendar, Hash, CheckCircle2, QrCode, Trash2,
} from "lucide-react";
import { getStatusColor, getStatusLabel, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface Reg {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
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

interface Props {
  registration: Reg;
  onClose: () => void;
  onUpdate: () => void;
}

export function ParticipantModal({ registration, onClose, onUpdate }: Props) {
  const [form, setForm] = useState({
    firstName: registration.firstName,
    lastName: registration.lastName,
    email: registration.email,
    phone: registration.phone ?? "",
    company: registration.company ?? "",
    jobTitle: registration.jobTitle ?? "",
    notes: registration.notes ?? "",
    status: registration.status,
    paymentStatus: registration.paymentStatus,
    ticketPrice: registration.ticketPrice?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/participants/${registration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast("Partecipante aggiornato", { variant: "success" });
      onUpdate();
    } catch {
      toast("Errore nel salvataggio", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/participants/${registration.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Partecipante eliminato", { variant: "success" });
      onUpdate();
    } catch {
      toast("Errore nell'eliminazione", { variant: "error" });
      setDeleting(false);
    }
  }

  async function checkIn() {
    setCheckingIn(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: registration.id, eventId: registration.event.id }),
      });
      const data = await res.json();
      if (data.alreadyCheckedIn) {
        toast("Già registrato al check-in", { variant: "warning" });
      } else if (!res.ok) {
        throw new Error(data.error);
      } else {
        toast("Check-in effettuato!", { variant: "success" });
        onUpdate();
      }
    } catch (e: unknown) {
      toast((e as Error).message || "Errore check-in", { variant: "error" });
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {form.firstName[0]}{form.lastName[0]}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{form.firstName} {form.lastName}</h2>
              <p className="text-xs text-gray-400">{registration.event.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(form.status)}>{getStatusLabel(form.status)}</Badge>
            <button onClick={onClose} className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Hash className="h-4 w-4 text-gray-400" />
              <span className="font-mono text-xs">{registration.registrationCode}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs">{formatDate(registration.createdAt)}</span>
            </div>
            {registration.checkedInAt && (
              <div className="flex items-center gap-2 text-green-600 col-span-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Check-in: {formatDateTime(registration.checkedInAt)}</span>
              </div>
            )}
          </div>

          {/* Anagrafica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cognome</label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />Email
            </label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />Telefono
              </label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Opzionale" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />Azienda
              </label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Opzionale" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />Ruolo/Posizione
            </label>
            <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Opzionale" />
          </div>

          {/* Stato e pagamento */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stato iscrizione</label>
              <select className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="PENDING">In attesa</option>
                <option value="CONFIRMED">Confermato</option>
                <option value="WAITLIST">Lista attesa</option>
                <option value="CANCELLED">Annullato</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pagamento</label>
              <select className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
                <option value="FREE">Gratuito</option>
                <option value="PENDING">Da pagare</option>
                <option value="PAID">Pagato</option>
                <option value="REFUNDED">Rimborsato</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Importo (€)</label>
              <Input type="number" step="0.01" value={form.ticketPrice} onChange={(e) => set("ticketPrice", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Note visibili solo all'organizzazione..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 gap-3">
          <div className="flex gap-2">
            {!registration.checkedInAt && (
              <Button variant="outline" size="sm" onClick={checkIn} disabled={checkingIn} className="gap-2 text-blue-600 hover:border-blue-200">
                {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Check-in
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="gap-2 text-red-600 hover:border-red-200">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Elimina
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
