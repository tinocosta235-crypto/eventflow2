"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, ArrowRight, Check, Sparkles, Copy, Loader2,
  Mic2, Building2, Monitor, Users, UtensilsCrossed, Store,
  Rocket, Network, Blend, MapPin, Plane, Hotel, Mail,
  ClipboardList, FileText, Globe, Plus, X, Wand2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/toaster"
import type { GeneratedEvent } from "@/app/api/events/ai-generate/route"

const DRAFT_KEY = "phorma_wizard_draft_v2"

// ── Tipi ─────────────────────────────────────────────────────────────────────

type CreationMode = "scratch" | "ai" | "duplicate"

type Plugin = {
  id: string
  label: string
  description: string
  detail: string
  icon: React.ElementType
  color: string
}

type Group = { name: string; color: string }

type WizardData = {
  // Step 1
  title: string
  clientName: string
  // Step 2
  organizerName: string
  organizerEmail: string
  // Step 3
  startDate: string
  endDate: string
  timezone: string
  // Step 4
  online: boolean
  location: string
  city: string
  country: string
  onlineUrl: string
  // Step 5
  eventType: string
  capacity: string
  // Step 6
  groups: Group[]
  // Step 7
  plugins: string[]
  // Step 8
  customFields: string[]
  // Extra
  description: string
  visibility: string
}

const INIT: WizardData = {
  title: "", clientName: "",
  organizerName: "", organizerEmail: "",
  startDate: "", endDate: "", timezone: "Europe/Rome",
  online: false, location: "", city: "", country: "IT", onlineUrl: "",
  eventType: "CONFERENCE", capacity: "",
  groups: [{ name: "Tutti i partecipanti", color: "blue" }],
  plugins: [],
  customFields: ["firstName", "lastName", "email"],
  description: "", visibility: "PUBLIC",
}

// ── Costanti ──────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "CONFERENCE", label: "Conferenza", icon: Mic2, color: "bg-blue-50 border-blue-300 text-blue-700" },
  { value: "SEMINAR", label: "Seminario", icon: Building2, color: "bg-indigo-50 border-indigo-300 text-indigo-700" },
  { value: "WEBINAR", label: "Webinar", icon: Monitor, color: "bg-cyan-50 border-cyan-300 text-cyan-700" },
  { value: "WORKSHOP", label: "Workshop", icon: Users, color: "bg-teal-50 border-teal-300 text-teal-700" },
  { value: "GALA_DINNER", label: "Cena di Gala", icon: UtensilsCrossed, color: "bg-amber-50 border-amber-300 text-amber-700" },
  { value: "TRADE_SHOW", label: "Fiera / Expo", icon: Store, color: "bg-orange-50 border-orange-300 text-orange-700" },
  { value: "PRODUCT_LAUNCH", label: "Lancio Prodotto", icon: Rocket, color: "bg-red-50 border-red-300 text-red-700" },
  { value: "NETWORKING", label: "Networking", icon: Network, color: "bg-purple-50 border-purple-300 text-purple-700" },
  { value: "HYBRID", label: "Ibrido", icon: Blend, color: "bg-green-50 border-green-300 text-green-700" },
]

const PLUGINS: Plugin[] = [
  {
    id: "REGISTRATION",
    label: "Registrazione online",
    description: "Form di registrazione personalizzabile con campi custom",
    detail: "I partecipanti si iscrivono da una pagina pubblica. Puoi creare form diversi per ogni gruppo.",
    icon: ClipboardList,
    color: "blue",
  },
  {
    id: "EMAIL",
    label: "Email & Comunicazioni",
    description: "Invio automatico di conferme, reminder e comunicazioni",
    detail: "Email di conferma automatica, sequenze di reminder, comunicazioni personalizzate per gruppo.",
    icon: Mail,
    color: "purple",
  },
  {
    id: "HOSPITALITY",
    label: "Hospitality",
    description: "Gestione hotel, pernottamenti e assegnazione stanze",
    detail: "Carica hotel dalla libreria, assegna stanze per tipo, permetti la scelta nel form di registrazione.",
    icon: Hotel,
    color: "amber",
  },
  {
    id: "TRAVEL",
    label: "Travel & Trasporti",
    description: "Percorsi di trasporto, transfer e logistica viaggi",
    detail: "Crea percorsi riutilizzabili, assegna transfer da backend o dai libertà di scelta all'invitato.",
    icon: Plane,
    color: "sky",
  },
  {
    id: "GUEST_LISTS",
    label: "Liste invitati",
    description: "Gestione inviti per tipologia con link personalizzati",
    detail: "Crea liste distinte per ogni gruppo, traccia chi ha aperto l'invito e chi si è registrato.",
    icon: FileText,
    color: "green",
  },
]

const COMMON_FIELDS = [
  { id: "firstName", label: "Nome", mandatory: true },
  { id: "lastName", label: "Cognome", mandatory: true },
  { id: "email", label: "Email", mandatory: true },
  { id: "phone", label: "Telefono" },
  { id: "company", label: "Azienda" },
  { id: "jobTitle", label: "Ruolo / Qualifica" },
  { id: "dietary", label: "Esigenze alimentari" },
  { id: "badgeName", label: "Nome badge" },
  { id: "arrivalDate", label: "Data arrivo" },
  { id: "departureDate", label: "Data partenza" },
  { id: "roomPreference", label: "Preferenza stanza" },
  { id: "tshirtSize", label: "Taglia t-shirt" },
]

const GROUP_COLORS = ["blue", "green", "purple", "orange", "red", "indigo", "teal", "amber"]
const COLOR_DOT: Record<string, string> = {
  blue: "bg-blue-500", green: "bg-green-500", purple: "bg-purple-500",
  orange: "bg-orange-500", red: "bg-red-500", indigo: "bg-indigo-500",
  teal: "bg-teal-500", amber: "bg-amber-500",
}

const TOTAL_STEPS = 9 // 1-indexed: 1=basics 2=organizer 3=date 4=luogo 5=tipo+capacità 6=gruppi 7=plugin 8=campi 9=riepilogo

// ── Helper components ─────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center py-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === step ? "w-6 h-2 bg-blue-600" :
            i + 1 < step ? "w-2 h-2 bg-blue-300" :
            "w-2 h-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  )
}

function Question({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{children}</h2>
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 mb-6">{children}</p>
}

function PluginCard({ plugin, active, onToggle }: { plugin: Plugin; active: boolean; onToggle: () => void }) {
  const Icon = plugin.icon
  const colorMap: Record<string, string> = {
    blue: "border-blue-400 bg-blue-50",
    purple: "border-purple-400 bg-purple-50",
    amber: "border-amber-400 bg-amber-50",
    sky: "border-sky-400 bg-sky-50",
    green: "border-green-400 bg-green-50",
  }
  const iconMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-100",
    purple: "text-purple-600 bg-purple-100",
    amber: "text-amber-600 bg-amber-100",
    sky: "text-sky-600 bg-sky-100",
    green: "text-green-600 bg-green-100",
  }

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        active ? colorMap[plugin.color] : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${active ? iconMap[plugin.color] : "bg-gray-100 text-gray-400"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm text-gray-900">{plugin.label}</p>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              active ? "bg-blue-600 border-blue-600" : "border-gray-300"
            }`}>
              {active && <Check className="h-3 w-3 text-white" />}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{plugin.description}</p>
          {active && <p className="text-xs text-gray-600 mt-2 leading-relaxed border-t border-gray-200 pt-2">{plugin.detail}</p>}
        </div>
      </div>
    </button>
  )
}

// ── Entry mode ────────────────────────────────────────────────────────────────

function EntryMode({ onSelect }: { onSelect: (mode: CreationMode) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Crea un nuovo evento</h1>
        <p className="text-gray-500">Come vuoi procedere?</p>
      </div>
      <div className="max-w-lg w-full space-y-3">
        <button
          onClick={() => onSelect("scratch")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all group text-left"
        >
          <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Guidami passo passo</p>
            <p className="text-sm text-gray-500 mt-0.5">Rispondo a poche domande e creo l'evento in 2 minuti</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 ml-auto transition-colors" />
        </button>

        <button
          onClick={() => onSelect("ai")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 transition-all group text-left"
        >
          <div className="p-3 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Genera con AI</p>
            <p className="text-sm text-gray-500 mt-0.5">Descrivo l'evento in una frase e l'AI compila tutto</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 ml-auto transition-colors" />
        </button>

        <button
          onClick={() => onSelect("duplicate")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 transition-all group text-left"
        >
          <div className="p-3 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
            <Copy className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Duplica evento passato</p>
            <p className="text-sm text-gray-500 mt-0.5">Parto da un evento esistente e lo modifico</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 ml-auto transition-colors" />
        </button>
      </div>
    </div>
  )
}

// ── AI mode ───────────────────────────────────────────────────────────────────

function AIMode({ onGenerated, onBack }: { onGenerated: (data: WizardData) => void; onBack: () => void }) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  async function generate() {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/events/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error()
      const { event }: { event: GeneratedEvent } = await res.json()
      onGenerated({
        ...INIT,
        title: event.title || "",
        clientName: event.clientName || "",
        organizerName: event.organizerName || "",
        description: event.description || "",
        eventType: event.eventType || "CONFERENCE",
        startDate: event.startDate || "",
        endDate: event.endDate || "",
        location: event.location || "",
        city: event.city || "",
        online: event.online || false,
        capacity: event.capacity ? String(event.capacity) : "",
        plugins: event.plugins || [],
        groups: event.groups?.length ? event.groups : [{ name: "Tutti i partecipanti", color: "blue" }],
        customFields: event.suggestedFields?.length
          ? ["firstName", "lastName", "email", ...event.suggestedFields.filter((f) => !["firstName", "lastName", "email"].includes(f))]
          : ["firstName", "lastName", "email"],
      })
    } catch {
      toast("Errore nella generazione", { variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const EXAMPLES = [
    "Conferenza tech a Milano il 15 aprile per 200 persone con hotel e transfer",
    "Webinar formativo online il prossimo martedì per il team commerciale",
    "Cena di gala aziendale a Roma a fine giugno, 80 ospiti VIP",
    "Workshop di design thinking a Torino, 2 giorni, 30 partecipanti",
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Torna indietro
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-purple-100">
            <Wand2 className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Descrivi il tuo evento</h2>
        </div>
        <p className="text-gray-500 mb-8">L'AI genera tutti i dettagli. Potrai modificarli nel wizard prima di creare l'evento.</p>

        <div className="relative">
          <Textarea
            ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate() }}
            placeholder="Es: Conferenza annuale per 300 persone a Milano il 20 maggio, con hotel e gestione travel..."
            rows={4}
            className="text-base resize-none pr-4 rounded-xl border-2 border-gray-200 focus:border-purple-400"
          />
          <p className="text-xs text-gray-400 mt-1.5 text-right">Cmd+Enter per generare</p>
        </div>

        <Button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="w-full mt-4 h-12 text-base gap-2 bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <><Loader2 className="h-5 w-5 animate-spin" />Generazione in corso...</>
          ) : (
            <><Sparkles className="h-5 w-5" />Genera con AI</>
          )}
        </Button>

        <div className="mt-8">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">Esempi</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="w-full text-left text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 transition-colors"
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Duplicate mode ────────────────────────────────────────────────────────────

function DuplicateMode({ onDuplicated, onBack }: { onDuplicated: (data: WizardData) => void; onBack: () => void }) {
  const [events, setEvents] = useState<{ id: string; title: string; startDate: string | null; eventType: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.slice(0, 20)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function duplicate(eventId: string) {
    const res = await fetch(`/api/events/${eventId}`)
    if (!res.ok) return
    const ev = await res.json()
    onDuplicated({
      ...INIT,
      title: `${ev.title} (copia)`,
      clientName: ev.clientName || "",
      organizerName: ev.organizerName || "",
      organizerEmail: ev.organizerEmail || "",
      description: ev.description || "",
      eventType: ev.eventType || "CONFERENCE",
      location: ev.location || "",
      city: ev.city || "",
      country: ev.country || "IT",
      online: ev.online || false,
      onlineUrl: ev.onlineUrl || "",
      capacity: ev.capacity ? String(ev.capacity) : "",
      visibility: ev.visibility || "PUBLIC",
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Torna indietro
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Duplica un evento passato</h2>
        <p className="text-gray-500 mb-6">Scegli l'evento da cui partire. Potrai modificare tutti i dettagli nel wizard.</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nessun evento disponibile</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => duplicate(ev.id)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 transition-all text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ev.startDate ? new Date(ev.startDate).toLocaleDateString("it-IT") : "Data non impostata"}
                    {" · "}{ev.eventType}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function NewEventPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"entry" | "ai" | "duplicate" | "wizard">("entry")
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(INIT)
  const [saving, setSaving] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  // Draft autosave
  const saveDraft = useCallback(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step })) } catch {}
  }, [data, step])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.data?.title) { setData(parsed.data); setStep(parsed.step ?? 1); setMode("wizard") }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (mode === "wizard") { const t = setTimeout(saveDraft, 1500); return () => clearTimeout(t) }
  }, [saveDraft, mode])

  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) =>
    setData((d) => ({ ...d, [k]: v }))

  function togglePlugin(id: string) {
    set("plugins", data.plugins.includes(id)
      ? data.plugins.filter((p) => p !== id)
      : [...data.plugins, id])
  }

  function toggleField(id: string) {
    if (["firstName", "lastName", "email"].includes(id)) return
    set("customFields", data.customFields.includes(id)
      ? data.customFields.filter((f) => f !== id)
      : [...data.customFields, id])
  }

  function addGroup() {
    if (!newGroupName.trim()) return
    const color = GROUP_COLORS[data.groups.length % GROUP_COLORS.length]
    set("groups", [...data.groups, { name: newGroupName.trim(), color }])
    setNewGroupName("")
  }

  function removeGroup(i: number) {
    if (data.groups.length <= 1) return
    set("groups", data.groups.filter((_, idx) => idx !== i))
  }

  function canNext(): boolean {
    switch (step) {
      case 1: return data.title.trim().length >= 3 && data.clientName.trim().length >= 2
      case 2: return data.organizerName.trim().length >= 2
      case 3: return !!data.startDate
      case 4: return data.online ? !!data.onlineUrl.trim() : (!!data.city.trim() || !!data.location.trim())
      default: return true
    }
  }

  async function submit(status: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          status,
          capacity: data.capacity || null,
          tags: null,
          groups: data.groups,
          plugins: data.plugins,
        }),
      })
      if (!res.ok) throw new Error()
      const event = await res.json()
      localStorage.removeItem(DRAFT_KEY)
      toast(status === "PUBLISHED" ? "Evento pubblicato!" : "Bozza salvata", { variant: "success" })
      router.push(`/events/${event.id}`)
    } catch {
      toast("Errore nella creazione", { variant: "error" })
      setSaving(false)
    }
  }

  // ── Entry / AI / Duplicate modes ───────────────────────────────────────────

  if (mode === "entry") {
    return (
      <DashboardLayout>
        <div className="relative">
          <div className="absolute top-4 left-4">
            <Link href="/events">
              <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
                <ArrowLeft className="h-4 w-4" /> Indietro
              </Button>
            </Link>
          </div>
          <EntryMode onSelect={(m) => {
            if (m === "scratch") { setMode("wizard"); setStep(1) }
            else setMode(m)
          }} />
        </div>
      </DashboardLayout>
    )
  }

  if (mode === "ai") {
    return (
      <DashboardLayout>
        <AIMode
          onBack={() => setMode("entry")}
          onGenerated={(d) => { setData(d); setMode("wizard"); setStep(1) }}
        />
      </DashboardLayout>
    )
  }

  if (mode === "duplicate") {
    return (
      <DashboardLayout>
        <DuplicateMode
          onBack={() => setMode("entry")}
          onDuplicated={(d) => { setData(d); setMode("wizard"); setStep(1) }}
        />
      </DashboardLayout>
    )
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (step === 1) setMode("entry"); else setStep((s) => s - 1) }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 1 ? "Indietro" : "Passo precedente"}
            </button>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-gray-700">Nuovo Evento</span>
          </div>
          <span className="text-xs text-gray-400">{step} di {TOTAL_STEPS}</span>
        </div>

        {/* Progress dots */}
        <ProgressDots step={step} total={TOTAL_STEPS} />

        {/* Content */}
        <div className="max-w-xl mx-auto px-6 pb-24">

          {/* ── STEP 1: Nome + Cliente ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Question>Come si chiama il tuo evento?</Question>
                <Hint>Scegli un titolo chiaro. Lo vedranno i partecipanti.</Hint>
                <Input
                  autoFocus
                  placeholder="Es. Forum Nazionale Innovazione 2026"
                  value={data.title}
                  onChange={(e) => set("title", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canNext() && setStep(2)}
                  className="text-base h-12 rounded-xl border-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chi è il cliente? <span className="text-red-500">*</span>
                </label>
                <Hint>Il nome dell'azienda o persona per cui organizzi l'evento.</Hint>
                <Input
                  placeholder="Es. Acme S.p.A."
                  value={data.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canNext() && setStep(2)}
                  className="h-11 rounded-xl border-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione (opzionale)</label>
                <Textarea
                  placeholder="Breve descrizione dell'evento, obiettivi, pubblico..."
                  value={data.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className="rounded-xl border-2 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Organizzatore ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Question>Chi organizza l'evento?</Question>
                <Hint>Il referente principale della segreteria organizzativa.</Hint>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome responsabile <span className="text-red-500">*</span>
                </label>
                <Input
                  autoFocus
                  placeholder="Es. Marco Rossi"
                  value={data.organizerName}
                  onChange={(e) => set("organizerName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canNext() && setStep(3)}
                  className="h-11 rounded-xl border-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email di riferimento</label>
                <Input
                  type="email"
                  placeholder="marco@azienda.it"
                  value={data.organizerEmail}
                  onChange={(e) => set("organizerEmail", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canNext() && setStep(3)}
                  className="h-11 rounded-xl border-2"
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Date ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Question>Quando si tiene?</Question>
                <Hint>Imposta data e ora di inizio. La data di fine è opzionale.</Hint>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data e ora di inizio <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={data.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data e ora di fine</label>
                  <Input
                    type="datetime-local"
                    value={data.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fuso orario</label>
                  <select
                    value={data.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {["Europe/Rome", "Europe/London", "Europe/Paris", "Europe/Berlin", "UTC", "America/New_York"].map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Luogo ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <Question>Dove si tiene?</Question>
                <Hint>Indica il luogo fisico o il link per gli eventi online.</Hint>
              </div>

              {/* Online toggle */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => set("online", false)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${!data.online ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  <MapPin className="h-4 w-4 inline mr-1.5" />
                  In presenza
                </button>
                <button
                  onClick={() => set("online", true)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${data.online ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  <Globe className="h-4 w-4 inline mr-1.5" />
                  Online
                </button>
              </div>

              {data.online ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL piattaforma <span className="text-red-500">*</span></label>
                  <Input
                    autoFocus
                    placeholder="https://zoom.us/j/..."
                    value={data.onlineUrl}
                    onChange={(e) => set("onlineUrl", e.target.value)}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome venue / location</label>
                    <Input
                      autoFocus
                      placeholder="Es. MiCo Convention Center"
                      value={data.location}
                      onChange={(e) => set("location", e.target.value)}
                      className="h-11 rounded-xl border-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Città <span className="text-red-500">*</span></label>
                      <Input placeholder="Milano" value={data.city} onChange={(e) => set("city", e.target.value)} className="h-11 rounded-xl border-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Paese</label>
                      <Input placeholder="IT" value={data.country} onChange={(e) => set("country", e.target.value)} className="h-11 rounded-xl border-2" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 5: Tipo + Capacità ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <Question>Che tipo di evento stai organizzando?</Question>
                <Hint>La tipologia non limita le funzionalità — è solo per classificazione.</Hint>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_TYPES.map((t) => {
                  const Icon = t.icon
                  const active = data.eventType === t.value
                  return (
                    <button
                      key={t.value}
                      onClick={() => set("eventType", t.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${active ? t.color : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <Icon className={`h-5 w-5 mb-1.5 ${active ? "" : "text-gray-400"}`} />
                      <p className="text-xs font-semibold leading-tight">{t.label}</p>
                    </button>
                  )
                })}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quante persone ti aspetti?</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Es. 200 (lascia vuoto per illimitata)"
                  value={data.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  className="h-11 rounded-xl border-2"
                />
              </div>
            </div>
          )}

          {/* ── STEP 6: Gruppi ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <Question>Hai gruppi diversi di partecipanti?</Question>
                <Hint>
                  Ogni gruppo può avere form, email, hotel e travel separati.
                  Se hai tutti sullo stesso percorso, lascia il gruppo di default.
                </Hint>
              </div>

              <div className="space-y-2">
                {data.groups.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_DOT[g.color] ?? "bg-gray-400"}`} />
                    <span className="flex-1 text-sm font-medium text-gray-800">{g.name}</span>
                    {data.groups.length > 1 && (
                      <button onClick={() => removeGroup(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Es. VIP, Speaker, Sponsor..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGroup()}
                  className="h-10 rounded-xl border-2 flex-1"
                />
                <Button onClick={addGroup} disabled={!newGroupName.trim()} size="sm" variant="outline" className="gap-1.5 rounded-xl">
                  <Plus className="h-4 w-4" /> Aggiungi
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Puoi aggiungere altri gruppi anche dopo aver creato l'evento.
              </p>
            </div>
          )}

          {/* ── STEP 7: Plugin ── */}
          {step === 7 && (
            <div className="space-y-4">
              <div>
                <Question>Quali funzionalità ti servono?</Question>
                <Hint>Attiva solo ciò che ti serve. Puoi cambiare in qualsiasi momento.</Hint>
              </div>
              {PLUGINS.map((p) => (
                <PluginCard
                  key={p.id}
                  plugin={p}
                  active={data.plugins.includes(p.id)}
                  onToggle={() => togglePlugin(p.id)}
                />
              ))}
              {data.plugins.length === 0 && (
                <p className="text-xs text-center text-gray-400 py-2">
                  Puoi anche non attivare nulla ora e farlo dopo dalla sezione Funzionalità dell'evento.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 8: Campi ── */}
          {step === 8 && (
            <div className="space-y-5">
              <div>
                <Question>Cosa vuoi sapere dai partecipanti?</Question>
                <Hint>Seleziona i campi da raccogliere nel form di registrazione. Nome, cognome ed email sono sempre inclusi.</Hint>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_FIELDS.map((f) => {
                  const active = data.customFields.includes(f.id)
                  const mandatory = f.mandatory
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleField(f.id)}
                      disabled={mandatory}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                        active ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                      } ${mandatory ? "opacity-70 cursor-default" : ""}`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                        active ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      }`}>
                        {active && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="text-sm text-gray-800">{f.label}</span>
                      {mandatory && <span className="text-[10px] text-gray-400 ml-auto">obbligatorio</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 9: Riepilogo ── */}
          {step === 9 && (
            <div className="space-y-5">
              <div>
                <Question>Tutto pronto!</Question>
                <Hint>Controlla i dettagli e crea il tuo evento.</Hint>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                {[
                  { label: "Evento", value: data.title },
                  { label: "Cliente", value: data.clientName },
                  { label: "Organizzatore", value: data.organizerName + (data.organizerEmail ? ` · ${data.organizerEmail}` : "") },
                  { label: "Quando", value: data.startDate ? new Date(data.startDate).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" }) : "—" },
                  { label: "Dove", value: data.online ? `Online${data.onlineUrl ? ` · ${data.onlineUrl}` : ""}` : [data.location, data.city].filter(Boolean).join(", ") || "—" },
                  { label: "Tipo", value: EVENT_TYPES.find((t) => t.value === data.eventType)?.label ?? data.eventType },
                  { label: "Capienza", value: data.capacity ? `${data.capacity} persone` : "Illimitata" },
                  { label: "Gruppi", value: data.groups.map((g) => g.name).join(", ") },
                  { label: "Funzionalità", value: data.plugins.length > 0 ? data.plugins.map((p) => PLUGINS.find((pl) => pl.id === p)?.label ?? p).join(", ") : "Nessuna attivata" },
                  { label: "Campi form", value: data.customFields.map((f) => COMMON_FIELDS.find((cf) => cf.id === f)?.label ?? f).join(", ") },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3 px-4 py-3">
                    <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-gray-900 font-medium">{value || "—"}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => submit("DRAFT")}
                  disabled={saving}
                  className="flex-1 gap-2 h-11 rounded-xl"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salva come bozza
                </Button>
                <Button
                  onClick={() => submit("PUBLISHED")}
                  disabled={saving}
                  className="flex-1 gap-2 h-11 rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Pubblica evento
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < TOTAL_STEPS && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4">
              <div className="max-w-xl mx-auto">
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                  className="w-full h-12 text-base gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
                >
                  {step === TOTAL_STEPS - 1 ? "Vai al riepilogo" : "Continua"}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
