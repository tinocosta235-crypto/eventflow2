"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface Event {
  id: string;
  title: string;
  capacity?: number;
  currentCount?: number;
}

interface Props {
  events: Event[];
  defaultEventId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddParticipantModal({ events, defaultEventId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    eventId: defaultEventId ?? (events[0]?.id ?? ""),
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    notes: "",
    status: "CONFIRMED",
    paymentStatus: "FREE",
    ticketPrice: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedEvent = events.find((e) => e.id === form.eventId);
  const isFull = selectedEvent?.capacity != null &&
    selectedEvent.currentCount != null &&
    selectedEvent.currentCount >= selectedEvent.capacity;

  async function submit() {
    if (!form.eventId || !form.firstName || !form.lastName || !form.email) {
      setError("Nome, cognome, email ed evento sono obbligatori");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore nella creazione");
        return;
      }
      if (data.autoWaitlist) {
        toast("Partecipante aggiunto in lista d'attesa", {
          variant: "warning",
          description: "L'evento ha raggiunto la capienza massima.",
        });
      } else {
        toast("Partecipante aggiunto", { variant: "success" });
      }
      onSuccess();
    } catch {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Aggiungi partecipante</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Evento *</label>
            <select
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.eventId}
              onChange={(e) => set("eventId", e.target.value)}
            >
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
            {isFull && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Evento al completo — il partecipante sarà aggiunto in lista d&apos;attesa
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Mario" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cognome *</label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Rossi" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="mario.rossi@azienda.it" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefono</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+39 02..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Azienda</label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Opzionale" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ruolo</label>
            <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Opzionale" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stato</label>
              <select className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="CONFIRMED">Confermato</option>
                <option value="PENDING">In attesa</option>
                <option value="WAITLIST">Lista attesa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pagamento</label>
              <select className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
                <option value="FREE">Gratuito</option>
                <option value="PENDING">Da pagare</option>
                <option value="PAID">Pagato</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Importo €</label>
              <Input type="number" step="0.01" value={form.ticketPrice} onChange={(e) => set("ticketPrice", e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Opzionale..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Aggiungi partecipante
          </Button>
        </div>
      </div>
    </div>
  );
}
