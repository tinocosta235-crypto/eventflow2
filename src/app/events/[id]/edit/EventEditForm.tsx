"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import Link from "next/link";
import type { Event } from "@prisma/client";

const VENUE_SETUPS = ["Theater", "Classroom", "Banquet", "U-Shape", "Cocktail", "Cabaret", "Custom"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>{children}</div>;
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)} className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${checked ? "bg-blue-600" : "bg-gray-200"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
function toDatetimeLocal(d: Date | null) { return d ? new Date(d).toISOString().slice(0, 16) : ""; }
function toDateLocal(d: Date | null) { return d ? new Date(d).toISOString().slice(0, 10) : ""; }

export default function EventEditForm({ event }: { event: Event }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: event.title, description: event.description ?? "", eventType: event.eventType,
    status: event.status, startDate: toDatetimeLocal(event.startDate), endDate: toDatetimeLocal(event.endDate),
    timezone: event.timezone ?? "Europe/Rome", location: event.location ?? "", city: event.city ?? "",
    country: event.country ?? "IT", online: event.online, onlineUrl: event.onlineUrl ?? "",
    capacity: event.capacity?.toString() ?? "", visibility: event.visibility,
    tags: event.tags ? (JSON.parse(event.tags) as string[]).join(", ") : "",
    website: event.website ?? "", venueSetup: event.venueSetup ?? "", venueNotes: event.venueNotes ?? "",
    accommodationNeeded: event.accommodationNeeded, hotelName: event.hotelName ?? "",
    hotelAddress: event.hotelAddress ?? "", hotelCheckIn: toDateLocal(event.hotelCheckIn),
    hotelCheckOut: toDateLocal(event.hotelCheckOut), roomBlockSize: event.roomBlockSize?.toString() ?? "",
    roomBlockDeadline: toDateLocal(event.roomBlockDeadline), accommodationNotes: event.accommodationNotes ?? "",
    travelNeeded: event.travelNeeded, airportTransfer: event.airportTransfer,
    shuttleService: event.shuttleService, parkingAvailable: event.parkingAvailable,
    travelNotes: event.travelNotes ?? "", organizerName: event.organizerName ?? "",
    organizerEmail: event.organizerEmail ?? "", organizerPhone: event.organizerPhone ?? "",
    secretariatNotes: event.secretariatNotes ?? "",
    budgetEstimated: event.budgetEstimated?.toString() ?? "", budgetActual: event.budgetActual?.toString() ?? "",
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? JSON.stringify(form.tags.split(",").map((t) => t.trim()).filter(Boolean)) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast("Evento salvato con successo", { variant: "success" });
      router.push(`/events/${event.id}`);
      router.refresh();
    } catch {
      toast("Errore nel salvataggio", { variant: "error", description: "Controlla i dati e riprova." });
    }
    finally { setSaving(false); }
  }

  return (
    <DashboardLayout>
      <Header title="Modifica Evento" subtitle={event.title}
        actions={
          <div className="flex gap-2">
            <Link href={`/events/${event.id}`}><Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Annulla</Button></Link>
            <Button size="sm" onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva
            </Button>
          </div>
        }
      />
      <div className="p-6 max-w-3xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informazioni generali</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Titolo *"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Descrizione"><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo evento">
                <select className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.eventType} onChange={(e) => set("eventType", e.target.value)}>
                  {["CONFERENCE","SEMINAR","WEBINAR","WORKSHOP","GALA_DINNER","TRADE_SHOW","PRODUCT_LAUNCH","NETWORKING","HYBRID"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Stato">
                <select className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="DRAFT">Bozza</option><option value="PUBLISHED">Pubblicato</option>
                  <option value="CLOSED">Chiuso</option><option value="CANCELLED">Annullato</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data inizio"><Input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
              <Field label="Data fine"><Input type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sito web"><Input placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
              <Field label="Tag (virgola)"><Input value={form.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Luogo e venue</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Toggle checked={form.online} onChange={(v) => set("online", v)} label="Evento online" />
            {form.online ? (
              <Field label="URL streaming"><Input value={form.onlineUrl} onChange={(e) => set("onlineUrl", e.target.value)} /></Field>
            ) : (
              <>
                <Field label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Città"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
                  <Field label="Paese"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
                </div>
                <Field label="Configurazione sala">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {VENUE_SETUPS.map((s) => (
                      <button key={s} onClick={() => set("venueSetup", form.venueSetup === s ? "" : s)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${form.venueSetup === s ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Note venue"><Textarea rows={2} value={form.venueNotes} onChange={(e) => set("venueNotes", e.target.value)} /></Field>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Partecipanti</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Capienza"><Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
              <Field label="Visibilità">
                <select className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.visibility} onChange={(e) => set("visibility", e.target.value)}>
                  <option value="PUBLIC">Pubblico</option><option value="PRIVATE">Privato</option><option value="INVITE_ONLY">Solo su invito</option>
                </select>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Alloggio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Toggle checked={form.accommodationNeeded} onChange={(v) => set("accommodationNeeded", v)} label="Gestione alloggio attiva" />
            {form.accommodationNeeded && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Hotel"><Input value={form.hotelName} onChange={(e) => set("hotelName", e.target.value)} /></Field>
                  <Field label="Indirizzo"><Input value={form.hotelAddress} onChange={(e) => set("hotelAddress", e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Check-in"><Input type="date" value={form.hotelCheckIn} onChange={(e) => set("hotelCheckIn", e.target.value)} /></Field>
                  <Field label="Check-out"><Input type="date" value={form.hotelCheckOut} onChange={(e) => set("hotelCheckOut", e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Camere riservate"><Input type="number" value={form.roomBlockSize} onChange={(e) => set("roomBlockSize", e.target.value)} /></Field>
                  <Field label="Scadenza prenotazione"><Input type="date" value={form.roomBlockDeadline} onChange={(e) => set("roomBlockDeadline", e.target.value)} /></Field>
                </div>
                <Field label="Note"><Textarea rows={2} value={form.accommodationNotes} onChange={(e) => set("accommodationNotes", e.target.value)} /></Field>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Viaggio e trasporti</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Toggle checked={form.travelNeeded} onChange={(v) => set("travelNeeded", v)} label="Gestione viaggi attiva" />
            {form.travelNeeded && (
              <>
                <div className="flex flex-wrap gap-4">
                  <Toggle checked={form.airportTransfer} onChange={(v) => set("airportTransfer", v)} label="Transfer aeroporto" />
                  <Toggle checked={form.shuttleService} onChange={(v) => set("shuttleService", v)} label="Shuttle navetta" />
                  <Toggle checked={form.parkingAvailable} onChange={(v) => set("parkingAvailable", v)} label="Parcheggio" />
                </div>
                <Field label="Note logistica"><Textarea rows={2} value={form.travelNotes} onChange={(e) => set("travelNotes", e.target.value)} /></Field>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Segreteria e budget</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Responsabile"><Input value={form.organizerName} onChange={(e) => set("organizerName", e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.organizerEmail} onChange={(e) => set("organizerEmail", e.target.value)} /></Field>
              <Field label="Telefono"><Input value={form.organizerPhone} onChange={(e) => set("organizerPhone", e.target.value)} /></Field>
            </div>
            <Field label="Note segreteria"><Textarea rows={2} value={form.secretariatNotes} onChange={(e) => set("secretariatNotes", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Budget stimato (€)"><Input type="number" value={form.budgetEstimated} onChange={(e) => set("budgetEstimated", e.target.value)} /></Field>
              <Field label="Budget effettivo (€)"><Input type="number" value={form.budgetActual} onChange={(e) => set("budgetActual", e.target.value)} /></Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-8">
          <Link href={`/events/${event.id}`}><Button variant="outline">Annulla</Button></Link>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva modifiche
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
