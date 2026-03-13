"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus } from "lucide-react";

interface Event {
  id: string;
  title: string;
}

interface Props {
  events: Event[];
  defaultEventId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddInviteeModal({ events, defaultEventId, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    eventId: defaultEventId ?? events[0]?.id ?? "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    dietary: "",
    accessibility: "",
    companions: 0,
  });

  function set(key: string, val: string | number) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventId || !form.firstName || !form.lastName || !form.email) {
      setError("Compila i campi obbligatori: Evento, Nome, Cognome, Email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/invitees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Errore durante il salvataggio.");
        return;
      }
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Aggiungi Invitato</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Evento *</label>
            <select
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={form.eventId}
              onChange={(e) => set("eventId", e.target.value)}
              required
            >
              <option value="">Seleziona evento...</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
              <Input placeholder="Mario" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cognome *</label>
              <Input placeholder="Rossi" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
              <Input type="email" placeholder="mario.rossi@azienda.it" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Telefono</label>
              <Input type="tel" placeholder="+39 333 1234567" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Azienda</label>
              <Input placeholder="Acme S.r.l." value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ruolo</label>
              <Input placeholder="CEO" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Accompagnatori</label>
              <Input type="number" min={0} value={form.companions} onChange={(e) => set("companions", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Esigenze Alimentari</label>
              <Input placeholder="Vegetariano, gluten free..." value={form.dietary} onChange={(e) => set("dietary", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Accessibilità</label>
              <Input placeholder="Sedia a rotelle..." value={form.accessibility} onChange={(e) => set("accessibility", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Annulla</Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <UserPlus className="h-4 w-4" />}
              Aggiungi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
