"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Check, Mic2, Building2, Monitor, Users,
  UtensilsCrossed, Store, Rocket, Network, Blend, MapPin, Plane, Car, Loader2,
  AlertCircle, Save,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";

const DRAFT_KEY = "eventflow_new_event_draft";

const EVENT_TYPES = [
  { value: "CONFERENCE", label: "Conferenza", desc: "Multi-sessione, networking, speaker", icon: Mic2, color: "blue" },
  { value: "SEMINAR", label: "Seminario", desc: "Formazione approfondita interattiva", icon: Building2, color: "indigo" },
  { value: "WEBINAR", label: "Webinar", desc: "Evento online con Q&A e sondaggi", icon: Monitor, color: "cyan" },
  { value: "WORKSHOP", label: "Workshop", desc: "Laboratorio pratico a piccoli gruppi", icon: Users, color: "teal" },
  { value: "GALA_DINNER", label: "Cena di Gala", desc: "Evento formale con catering", icon: UtensilsCrossed, color: "amber" },
  { value: "TRADE_SHOW", label: "Fiera / Expo", desc: "Espositori e visitatori B2B/B2C", icon: Store, color: "orange" },
  { value: "PRODUCT_LAUNCH", label: "Lancio Prodotto", desc: "Presentazione nuovo prodotto", icon: Rocket, color: "red" },
  { value: "NETWORKING", label: "Networking", desc: "Connessioni professionali", icon: Network, color: "purple" },
  { value: "HYBRID", label: "Ibrido", desc: "In presenza + virtuale simultaneo", icon: Blend, color: "green" },
];

const VENUE_SETUPS = ["Theater", "Classroom", "Banquet", "U-Shape", "Cocktail", "Cabaret", "Custom"];
const TIMEZONES = ["Europe/Rome", "Europe/London", "Europe/Paris", "Europe/Berlin", "UTC", "America/New_York"];
const STEPS = ["Tipo", "Dettagli", "Luogo", "Partecipanti", "Alloggio", "Viaggio", "Organizzazione", "Riepilogo"];

const COLOR_MAP: Record<string, string> = {
  blue: "border-blue-500 bg-blue-50 text-blue-700",
  indigo: "border-indigo-500 bg-indigo-50 text-indigo-700",
  cyan: "border-cyan-500 bg-cyan-50 text-cyan-700",
  teal: "border-teal-500 bg-teal-50 text-teal-700",
  amber: "border-amber-500 bg-amber-50 text-amber-700",
  orange: "border-orange-500 bg-orange-50 text-orange-700",
  red: "border-red-500 bg-red-50 text-red-700",
  purple: "border-purple-500 bg-purple-50 text-purple-700",
  green: "border-green-500 bg-green-50 text-green-700",
};

type Form = {
  eventType: string; title: string; description: string; status: string;
  startDate: string; endDate: string; timezone: string;
  location: string; city: string; country: string; online: boolean; onlineUrl: string;
  venueSetup: string; venueNotes: string;
  capacity: string; visibility: string; tags: string; website: string;
  accommodationNeeded: boolean; hotelName: string; hotelAddress: string;
  hotelCheckIn: string; hotelCheckOut: string; roomBlockSize: string;
  roomBlockDeadline: string; accommodationNotes: string;
  travelNeeded: boolean; airportTransfer: boolean; shuttleService: boolean;
  parkingAvailable: boolean; travelNotes: string;
  organizerName: string; organizerEmail: string; organizerPhone: string;
  secretariatNotes: string; budgetEstimated: string;
};

const INIT: Form = {
  eventType: "", title: "", description: "", status: "DRAFT",
  startDate: "", endDate: "", timezone: "Europe/Rome",
  location: "", city: "", country: "IT", online: false, onlineUrl: "",
  venueSetup: "", venueNotes: "",
  capacity: "", visibility: "PUBLIC", tags: "", website: "",
  accommodationNeeded: false, hotelName: "", hotelAddress: "",
  hotelCheckIn: "", hotelCheckOut: "", roomBlockSize: "",
  roomBlockDeadline: "", accommodationNotes: "",
  travelNeeded: false, airportTransfer: false, shuttleService: false,
  parkingAvailable: false, travelNotes: "",
  organizerName: "", organizerEmail: "", organizerPhone: "",
  secretariatNotes: "", budgetEstimated: "",
};

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${checked ? "bg-blue-600" : "bg-gray-200"}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function validateStep(step: number, form: Form): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0 && !form.eventType) errors.eventType = "Seleziona un tipo di evento";
  if (step === 1) {
    if (!form.title.trim()) errors.title = "Il titolo è obbligatorio";
    if (form.title.trim().length < 5) errors.title = "Il titolo deve avere almeno 5 caratteri";
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      errors.endDate = "La data di fine deve essere successiva all'inizio";
    }
    if (form.startDate && new Date(form.startDate) < new Date()) {
      // just a warning, not blocking
    }
  }
  if (step === 2) {
    if (form.online && !form.onlineUrl.trim()) errors.onlineUrl = "Inserisci l'URL della piattaforma";
    if (!form.online && !form.city.trim() && !form.location.trim()) {
      errors.city = "Inserisci almeno città o nome venue";
    }
  }
  if (step === 3) {
    if (form.capacity && parseInt(form.capacity) < 1) errors.capacity = "La capienza deve essere almeno 1";
  }
  return errors;
}

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const { form: savedForm, step: savedStep } = JSON.parse(raw);
        if (savedForm?.title || savedForm?.eventType) {
          setHasDraft(true);
          setForm(savedForm);
          setStep(savedStep ?? 0);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Autosave every 30s and on form change (debounced)
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }));
      setLastSaved(new Date());
    } catch {
      // ignore
    }
  }, [form, step]);

  useEffect(() => {
    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const set = (k: keyof Form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function tryNext() {
    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      setStep((s) => s + 1);
    }
  }

  const selectedType = EVENT_TYPES.find((t) => t.value === form.eventType);

  async function submit(status: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status,
          capacity: form.capacity || null,
          roomBlockSize: form.roomBlockSize || null,
          budgetEstimated: form.budgetEstimated || null,
          tags: form.tags ? JSON.stringify(form.tags.split(",").map((t) => t.trim()).filter(Boolean)) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const event = await res.json();
      clearDraft();
      toast(
        status === "PUBLISHED" ? "Evento pubblicato!" : "Bozza salvata",
        { variant: "success", description: event.title }
      );
      router.push(`/events/${event.id}`);
    } catch {
      toast("Errore nella creazione dell'evento", { variant: "error", description: "Controlla i dati e riprova." });
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/events">
              <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
                <ArrowLeft className="h-4 w-4" /> Indietro
              </Button>
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">Nuovo Evento</h1>
            {hasDraft && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Bozza ripristinata
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Save className="h-3 w-3" />
                Salvato {lastSaved.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <span className="text-sm text-gray-400">Step {step + 1} di {STEPS.length}</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <button
                  onClick={() => { if (i < step) { setErrors({}); setStep(i); } }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    i === step ? "bg-blue-600 text-white" :
                    i < step ? "bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100" :
                    "text-gray-400"
                  }`}
                >
                  {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {s}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-4 h-px ${i < step ? "bg-blue-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* Step 0 — Tipo */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Che tipo di evento stai organizzando?</h2>
              <p className="text-gray-500 text-sm mb-6">La tipologia determina le funzionalità disponibili</p>
              {errors.eventType && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{errors.eventType}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {EVENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const active = form.eventType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => { set("eventType", type.value); setErrors({}); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${active ? COLOR_MAP[type.color] : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <Icon className={`h-6 w-6 mb-2 ${active ? "" : "text-gray-400"}`} />
                      <p className="font-semibold text-sm">{type.label}</p>
                      <p className={`text-xs mt-0.5 ${active ? "opacity-80" : "text-gray-400"}`}>{type.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1 — Dettagli */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Informazioni generali</h2>
              <Field label="Titolo *" error={errors.title}>
                <Input
                  placeholder="Es. Forum Nazionale Innovazione 2025"
                  value={form.title}
                  onChange={(e) => { set("title", e.target.value); if (errors.title) setErrors((er) => ({ ...er, title: "" })); }}
                  className={errors.title ? "border-red-300 focus:ring-red-500" : ""}
                />
              </Field>
              <Field label="Descrizione">
                <Textarea
                  rows={4}
                  placeholder="Descrivi obiettivi, programma e pubblico target..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Data e ora inizio">
                  <Input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </Field>
                <Field label="Data e ora fine" error={errors.endDate}>
                  <Input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => { set("endDate", e.target.value); if (errors.endDate) setErrors((er) => ({ ...er, endDate: "" })); }}
                    className={errors.endDate ? "border-red-300" : ""}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fuso orario">
                  <select
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                  >
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </Field>
                <Field label="Sito web evento">
                  <Input placeholder="https://tuoevento.it" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2 — Luogo */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Luogo e venue</h2>
              <Toggle checked={form.online} onChange={(v) => { set("online", v); setErrors({}); }} label="Evento online / virtuale" />
              {form.online ? (
                <Field label="URL piattaforma streaming" error={errors.onlineUrl}>
                  <Input
                    placeholder="https://zoom.us/j/..."
                    value={form.onlineUrl}
                    onChange={(e) => { set("onlineUrl", e.target.value); if (errors.onlineUrl) setErrors((er) => ({ ...er, onlineUrl: "" })); }}
                    className={errors.onlineUrl ? "border-red-300" : ""}
                  />
                </Field>
              ) : (
                <>
                  <Field label="Nome venue / location">
                    <Input placeholder="Es. MiCo Convention Center" value={form.location} onChange={(e) => set("location", e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Città" error={errors.city}>
                      <Input
                        placeholder="Milano"
                        value={form.city}
                        onChange={(e) => { set("city", e.target.value); if (errors.city) setErrors((er) => ({ ...er, city: "" })); }}
                        className={errors.city ? "border-red-300" : ""}
                      />
                    </Field>
                    <Field label="Paese">
                      <Input placeholder="IT" value={form.country} onChange={(e) => set("country", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Configurazione sala">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {VENUE_SETUPS.map((s) => (
                        <button
                          key={s}
                          onClick={() => set("venueSetup", form.venueSetup === s ? "" : s)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${form.venueSetup === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Note venue">
                    <Textarea rows={3} placeholder="Requisiti tecnici, accesso disabili, parcheggio..." value={form.venueNotes} onChange={(e) => set("venueNotes", e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          )}

          {/* Step 3 — Partecipanti */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Partecipanti e visibilità</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Capienza massima" error={errors.capacity}>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Es. 500 (lascia vuoto per illimitata)"
                    value={form.capacity}
                    onChange={(e) => set("capacity", e.target.value)}
                  />
                </Field>
                <Field label="Visibilità">
                  <select
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.visibility}
                    onChange={(e) => set("visibility", e.target.value)}
                  >
                    <option value="PUBLIC">Pubblico</option>
                    <option value="PRIVATE">Privato</option>
                    <option value="INVITE_ONLY">Solo su invito</option>
                  </select>
                </Field>
              </div>
              <Field label="Tag (separati da virgola)">
                <Input placeholder="Es. tecnologia, innovazione, AI" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
              </Field>
            </div>
          )}

          {/* Step 4 — Alloggio */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Alloggio e pernottamento</h2>
              <Toggle checked={form.accommodationNeeded} onChange={(v) => set("accommodationNeeded", v)} label="Gestire alloggio per i partecipanti" />
              {form.accommodationNeeded && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nome hotel"><Input placeholder="Hotel Excelsior" value={form.hotelName} onChange={(e) => set("hotelName", e.target.value)} /></Field>
                    <Field label="Indirizzo"><Input placeholder="Via Roma 1, Milano" value={form.hotelAddress} onChange={(e) => set("hotelAddress", e.target.value)} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Check-in hotel"><Input type="date" value={form.hotelCheckIn} onChange={(e) => set("hotelCheckIn", e.target.value)} /></Field>
                    <Field label="Check-out hotel"><Input type="date" value={form.hotelCheckOut} onChange={(e) => set("hotelCheckOut", e.target.value)} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Camere riservate (room block)"><Input type="number" placeholder="Es. 50" value={form.roomBlockSize} onChange={(e) => set("roomBlockSize", e.target.value)} /></Field>
                    <Field label="Scadenza prenotazione"><Input type="date" value={form.roomBlockDeadline} onChange={(e) => set("roomBlockDeadline", e.target.value)} /></Field>
                  </div>
                  <Field label="Note alloggio"><Textarea rows={3} placeholder="Tariffe speciali, codice prenotazione..." value={form.accommodationNotes} onChange={(e) => set("accommodationNotes", e.target.value)} /></Field>
                </>
              )}
            </div>
          )}

          {/* Step 5 — Viaggio */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Viaggio e trasporti</h2>
              <Toggle checked={form.travelNeeded} onChange={(v) => set("travelNeeded", v)} label="Gestire logistica viaggi e trasporti" />
              {form.travelNeeded && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: "airportTransfer" as keyof Form, icon: Plane, label: "Transfer aeroporto", desc: "Navetta da/per aeroporto" },
                      { key: "shuttleService" as keyof Form, icon: Car, label: "Shuttle evento", desc: "Bus navetta partecipanti" },
                      { key: "parkingAvailable" as keyof Form, icon: MapPin, label: "Parcheggio", desc: "Area parcheggio disponibile" },
                    ].map(({ key, icon: Icon, label, desc }) => (
                      <button
                        key={key}
                        onClick={() => set(key, !form[key])}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${form[key] ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      >
                        <Icon className={`h-5 w-5 mb-1.5 ${form[key] ? "text-blue-600" : "text-gray-400"}`} />
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </button>
                    ))}
                  </div>
                  <Field label="Note logistica">
                    <Textarea rows={3} placeholder="Orari navette, punti di raccolta, istruzioni..." value={form.travelNotes} onChange={(e) => set("travelNotes", e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          )}

          {/* Step 6 — Organizzazione */}
          {step === 6 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Segreteria organizzativa e budget</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Responsabile evento"><Input placeholder="Mario Rossi" value={form.organizerName} onChange={(e) => set("organizerName", e.target.value)} /></Field>
                <Field label="Email"><Input type="email" placeholder="mario@azienda.it" value={form.organizerEmail} onChange={(e) => set("organizerEmail", e.target.value)} /></Field>
                <Field label="Telefono"><Input placeholder="+39 02 1234567" value={form.organizerPhone} onChange={(e) => set("organizerPhone", e.target.value)} /></Field>
              </div>
              <Field label="Note segreteria">
                <Textarea rows={3} placeholder="Catering, AV, fornitori, task..." value={form.secretariatNotes} onChange={(e) => set("secretariatNotes", e.target.value)} />
              </Field>
              <Field label="Budget stimato (€)">
                <Input type="number" placeholder="Es. 15000" value={form.budgetEstimated} onChange={(e) => set("budgetEstimated", e.target.value)} />
              </Field>
            </div>
          )}

          {/* Step 7 — Riepilogo */}
          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Riepilogo evento</h2>
              <Card>
                <CardContent className="p-5 space-y-3">
                  {selectedType && (
                    <div className="flex items-center gap-2 mb-3">
                      <selectedType.icon className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-600">{selectedType.label}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Titolo:</span> <span className="font-medium">{form.title || "—"}</span></div>
                    <div><span className="text-gray-500">Inizio:</span> <span className="font-medium">{form.startDate ? new Date(form.startDate).toLocaleString("it-IT") : "—"}</span></div>
                    <div><span className="text-gray-500">Fine:</span> <span className="font-medium">{form.endDate ? new Date(form.endDate).toLocaleString("it-IT") : "—"}</span></div>
                    <div><span className="text-gray-500">Luogo:</span> <span className="font-medium">{form.online ? "Online" : [form.location, form.city].filter(Boolean).join(", ") || "—"}</span></div>
                    <div><span className="text-gray-500">Capienza:</span> <span className="font-medium">{form.capacity || "Illimitata"}</span></div>
                    <div><span className="text-gray-500">Visibilità:</span> <span className="font-medium">{form.visibility}</span></div>
                    {form.accommodationNeeded && <div><span className="text-gray-500">🏨 Hotel:</span> <span className="font-medium">{form.hotelName || "Da definire"}</span></div>}
                    {form.travelNeeded && <div><span className="text-gray-500">✈️ Trasporti:</span> <span className="font-medium">Attivi</span></div>}
                    {form.budgetEstimated && <div><span className="text-gray-500">Budget:</span> <span className="font-medium">€ {parseFloat(form.budgetEstimated).toLocaleString("it-IT")}</span></div>}
                    {form.organizerName && <div><span className="text-gray-500">Responsabile:</span> <span className="font-medium">{form.organizerName}</span></div>}
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => submit("DRAFT")} variant="outline" disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salva come bozza
                </Button>
                <Button onClick={() => submit("PUBLISHED")} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Pubblica evento
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => { setErrors({}); setStep((s) => s - 1); }}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Indietro
            </Button>
            {step < 7 && (
              <Button onClick={tryNext} className="gap-2">
                Avanti <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
