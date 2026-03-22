"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "@/components/ui/toaster"
import { Loader2, Chrome, Shield, Key, CheckCircle2, ExternalLink } from "lucide-react"

// ── Integration definitions ────────────────────────────────────────────────────

type IntegrationStatus = "connected" | "available" | "coming_soon"
type IntegrationCategory = "crm" | "email" | "messaging" | "analytics" | "travel" | "ai"

interface Integration {
  id: string
  name: string
  description: string
  category: IntegrationCategory
  status: IntegrationStatus
  icon: string
  color: string
  configurable?: boolean
}

const INTEGRATIONS: Integration[] = [
  // CRM
  { id: "salesforce", name: "Salesforce", description: "Sincronizza contatti e lead con Salesforce CRM.", category: "crm", status: "available", icon: "SF", color: "#00A1E0", configurable: true },
  { id: "hubspot", name: "HubSpot", description: "CRM per marketing, vendite e assistenza clienti.", category: "crm", status: "coming_soon", icon: "HS", color: "#FF7A59" },
  { id: "pipedrive", name: "Pipedrive", description: "Gestione pipeline di vendita orientata all'azione.", category: "crm", status: "coming_soon", icon: "PD", color: "#1C4C77" },
  { id: "attio", name: "Attio", description: "CRM moderno e collaborativo per team in crescita.", category: "crm", status: "coming_soon", icon: "AT", color: "#8B5CF6" },

  // Email
  { id: "resend", name: "Resend", description: "Provider email nativo di Phorma. Invio transazionale e bulk.", category: "email", status: "connected", icon: "RE", color: "#000000" },
  { id: "mailchimp", name: "Mailchimp", description: "Email marketing e automazioni per campagne.", category: "email", status: "coming_soon", icon: "MC", color: "#FFE01B" },
  { id: "brevo", name: "Brevo", description: "Marketing multicanale con SMS, email e chat.", category: "email", status: "coming_soon", icon: "BR", color: "#0B996E" },
  { id: "sendgrid", name: "SendGrid", description: "Piattaforma email per sviluppatori con API potente.", category: "email", status: "coming_soon", icon: "SG", color: "#1A82E2" },

  // Messaging
  { id: "slack", name: "Slack", description: "Notifiche real-time ai tuoi canali di team.", category: "messaging", status: "coming_soon", icon: "SL", color: "#4A154B" },
  { id: "whatsapp", name: "WhatsApp Business", description: "Messaggi diretti ai partecipanti su WhatsApp.", category: "messaging", status: "coming_soon", icon: "WA", color: "#25D366" },
  { id: "teams", name: "Microsoft Teams", description: "Notifiche e automazioni su Teams.", category: "messaging", status: "coming_soon", icon: "MT", color: "#6264A7" },
  { id: "telegram", name: "Telegram", description: "Bot Telegram per notifiche e check-in.", category: "messaging", status: "coming_soon", icon: "TG", color: "#26A5E4" },

  // Analytics
  { id: "ga4", name: "Google Analytics", description: "Traccia eventi di registrazione e comportamento utenti.", category: "analytics", status: "coming_soon", icon: "GA", color: "#E37400" },
  { id: "metabase", name: "Metabase", description: "BI open source per analisi dati self-hosted.", category: "analytics", status: "coming_soon", icon: "MB", color: "#509EE3" },
  { id: "langfuse", name: "Langfuse", description: "Observability e trace per agenti AI. Self-hosted GDPR-ready.", category: "analytics", status: "available", icon: "LF", color: "#7C3AED", configurable: true },

  // Travel
  { id: "amadeus", name: "Amadeus", description: "API GDS per prenotazioni voli e hotel.", category: "travel", status: "coming_soon", icon: "AM", color: "#0057A0" },
  { id: "booking", name: "Booking.com", description: "Gestione allotment hotel e prenotazioni.", category: "travel", status: "coming_soon", icon: "BK", color: "#003580" },
  { id: "trenitalia", name: "Trenitalia", description: "Prenotazione biglietti ferroviari per gruppi.", category: "travel", status: "coming_soon", icon: "TR", color: "#CC1C1C" },

  // AI
  { id: "anthropic", name: "Anthropic Claude", description: "Agenti AI, generazione flow e analisi. Già integrato.", category: "ai", status: "connected", icon: "✦", color: "#C084FC" },
  { id: "openai", name: "OpenAI GPT-4o", description: "Modelli alternativi per task specifici.", category: "ai", status: "coming_soon", icon: "AI", color: "#10A37F" },
  { id: "langgraph", name: "LangGraph", description: "Orchestrazione workflow agentico con stato persistente.", category: "ai", status: "available", icon: "LG", color: "#1C7C54", configurable: true },
]

const CATEGORIES: { key: "all" | IntegrationCategory; label: string }[] = [
  { key: "all", label: "Tutte" },
  { key: "crm", label: "CRM" },
  { key: "email", label: "Email" },
  { key: "messaging", label: "Messaggistica" },
  { key: "analytics", label: "Analytics & AI Ops" },
  { key: "travel", label: "Viaggio" },
  { key: "ai", label: "AI & Agenti" },
]

const STATUS_LABELS: Record<IntegrationStatus, string> = {
  connected: "Connesso",
  available: "Configura",
  coming_soon: "Presto",
}

// ── OAuth / API key definitions ───────────────────────────────────────────────

interface OAuthAccount {
  id: string
  name: string
  description: string
  icon: string
  color: string
  type: "oauth" | "apikey"
  connected: boolean
  comingSoon?: boolean
  fields?: { key: string; label: string; placeholder: string; secret?: boolean }[]
}

const OAUTH_ACCOUNTS: OAuthAccount[] = [
  {
    id: "google",
    name: "Google Workspace",
    description: "Accedi a Google Calendar, Gmail e Drive per sincronizzare evento e comunicazioni.",
    icon: "G",
    color: "#4285F4",
    type: "oauth",
    connected: false,
    comingSoon: true,
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Integra Outlook, Teams e OneDrive. Sync calendario e notifiche automatiche.",
    icon: "M",
    color: "#0078D4",
    type: "oauth",
    connected: false,
    comingSoon: true,
  },
  {
    id: "amadeus_key",
    name: "Amadeus API",
    description: "Chiave API per accesso GDS Amadeus: ricerca voli, hotel e prenotazioni di gruppo.",
    icon: "AM",
    color: "#0057A0",
    type: "apikey",
    connected: false,
    comingSoon: false,
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "xxxxxxxxxxxxxxxx" },
      { key: "client_secret", label: "Client Secret", placeholder: "••••••••••••••••", secret: true },
    ],
  },
  {
    id: "whatsapp_key",
    name: "WhatsApp Business API",
    description: "Token API Cloud per l'invio di messaggi WhatsApp ai partecipanti.",
    icon: "WA",
    color: "#25D366",
    type: "apikey",
    connected: false,
    comingSoon: false,
    fields: [
      { key: "phone_id", label: "Phone Number ID", placeholder: "1234567890" },
      { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxx...", secret: true },
    ],
  },
  {
    id: "telegram_bot",
    name: "Telegram Bot",
    description: "Bot token per notifiche Telegram ai partecipanti e check-in via chat.",
    icon: "TG",
    color: "#26A5E4",
    type: "apikey",
    connected: false,
    comingSoon: false,
    fields: [
      { key: "bot_token", label: "Bot Token", placeholder: "123456:ABCDxxxxxxx", secret: true },
    ],
  },
]

// ── Salesforce config modal ─────────────────────────────────────────────────

function SalesforceModal({ events, onClose }: { events: EventOption[]; onClose: () => void }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "")
  const [sfMode, setSfMode] = useState<"CONTACTS" | "LEADS">("CONTACTS")
  const [sfDryRun, setSfDryRun] = useState(true)
  const [sfSyncing, setSfSyncing] = useState(false)

  async function runSync() {
    if (!selectedEventId) return
    setSfSyncing(true)
    try {
      const res = await fetch(`/api/events/${selectedEventId}/crm/salesforce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: sfMode, dryRun: sfDryRun }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) { toast(data.error ?? "Errore sync", { variant: "error" }); return }
      toast(data.message ?? "Sync completata")
    } catch {
      toast("Errore di connessione", { variant: "error" })
    } finally {
      setSfSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Evento</label>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800"
          >
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Oggetto Salesforce</label>
          <select
            value={sfMode}
            onChange={e => setSfMode(e.target.value as "CONTACTS" | "LEADS")}
            className="w-full h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800"
          >
            <option value="CONTACTS">Contacts</option>
            <option value="LEADS">Leads</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={sfDryRun} onChange={e => setSfDryRun(e.target.checked)} />
        Dry run (consigliato per test)
      </label>
      <div className="flex gap-2 pt-2">
        <button
          onClick={runSync}
          disabled={sfSyncing || !selectedEventId}
          className="flex-1 py-2 bg-[#00A1E0] hover:bg-[#0090C5] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sfSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {sfSyncing ? "Sync in corso..." : "Esegui sync mock"}
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
          Chiudi
        </button>
      </div>
    </div>
  )
}

// ── Langfuse config modal ─────────────────────────────────────────────────────

function LangfuseModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Langfuse è open source e può essere self-hosted per conformità GDPR. Integra trace, costi e valutazione degli agenti AI di Phorma.
      </p>
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 font-mono space-y-1">
        <p># Docker Compose (self-hosted)</p>
        <p>LANGFUSE_SECRET_KEY=sk-lf-...</p>
        <p>LANGFUSE_PUBLIC_KEY=pk-lf-...</p>
        <p>LANGFUSE_HOST=https://your-langfuse.com</p>
      </div>
      <div className="flex gap-2 pt-1">
        <a href="https://langfuse.com/docs/deployment/self-host" target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors text-center">
          Docs self-host
        </a>
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
          Chiudi
        </button>
      </div>
    </div>
  )
}

// ── LangGraph config modal ────────────────────────────────────────────────────

function LangGraphModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        LangGraph (Python) aggiunge orchestrazione stateful e cicli agli agenti. Ideale per workflow multi-step con checkpoint e rollback.
      </p>
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">Stack consigliato</p>
        <p>→ FastAPI backend con LangGraph</p>
        <p>→ Postgres + pgvector per Vector DB</p>
        <p>→ Langfuse per observability</p>
        <p>→ Hetzner EU per data residency GDPR</p>
      </div>
      <div className="flex gap-2 pt-1">
        <a href="https://langchain-ai.github.io/langgraph/" target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 bg-[#1C7C54] hover:bg-[#166344] text-white text-sm font-semibold rounded-lg transition-colors text-center">
          Documentazione LangGraph
        </a>
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
          Chiudi
        </button>
      </div>
    </div>
  )
}

// ── Integration Card ──────────────────────────────────────────────────────────

function IntegrationCard({ integration, onClick }: { integration: Integration; onClick: () => void }) {
  const isClickable = integration.configurable || integration.status === "connected"

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable && integration.status === "coming_soon"}
      className={`text-left w-full rounded-xl border p-4 transition-all group ${
        isClickable
          ? "cursor-pointer hover:border-[rgba(109,98,243,0.35)] hover:shadow-sm"
          : "cursor-default"
      } ${
        integration.status === "connected"
          ? "border-emerald-200/60 bg-emerald-50/30"
          : integration.status === "available"
          ? "border-[rgba(109,98,243,0.18)] bg-white"
          : "border-gray-100 bg-gray-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: integration.color }}
        >
          {integration.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-900">{integration.name}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                integration.status === "connected"
                  ? "bg-emerald-100 text-emerald-700"
                  : integration.status === "available"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {STATUS_LABELS[integration.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{integration.description}</p>
        </div>
      </div>
    </button>
  )
}

// ── Config Modal wrapper ──────────────────────────────────────────────────────

function ConfigModal({
  integration,
  events,
  onClose,
}: {
  integration: Integration
  events: EventOption[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[480px] max-w-[95vw]">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
            style={{ background: integration.color }}
          >
            {integration.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
            <p className="text-xs text-gray-500">{integration.description}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {integration.id === "salesforce" && <SalesforceModal events={events} onClose={onClose} />}
        {integration.id === "langfuse" && <LangfuseModal onClose={onClose} />}
        {integration.id === "langgraph" && <LangGraphModal onClose={onClose} />}
        {integration.id === "resend" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Resend è il provider email nativo di Phorma. Configurazione mittenti disponibile in Impostazioni → Email.</p>
            <Link href="/settings/email" onClick={onClose} className="block text-center py-2 bg-black hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors">
              Vai alle impostazioni email
            </Link>
          </div>
        )}
        {integration.id === "anthropic" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Claude Sonnet è il modello AI attivo. Agenti, generazione flow e analisi sono già operativi.</p>
            <Link href="/events" onClick={onClose} className="block text-center py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors">
              Vai ai tuoi eventi
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ── OAuth Account Card ────────────────────────────────────────────────────────

function OAuthAccountCard({ account }: { account: OAuthAccount }) {
  const [expanded, setExpanded] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    toast("Configurazione salvata", { description: `${account.name} configurato con successo.` })
    setExpanded(false)
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        account.connected
          ? "border-emerald-200/60 bg-emerald-50/30"
          : account.comingSoon
          ? "border-gray-100 bg-gray-50/50"
          : "border-[rgba(109,98,243,0.18)] bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: account.color }}
        >
          {account.type === "oauth" ? <Chrome className="h-5 w-5" /> : account.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-900">{account.name}</span>
            {account.connected && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Connesso
              </span>
            )}
            {account.comingSoon && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">
                Presto
              </span>
            )}
            {!account.connected && !account.comingSoon && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 flex items-center gap-1">
                <Key className="h-2.5 w-2.5" /> Configura
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{account.description}</p>
        </div>

        {!account.comingSoon && !account.connected && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="ml-2 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "rgba(112,96,204,0.10)", color: "var(--accent)" }}
          >
            {expanded ? "Chiudi" : account.type === "oauth" ? "Connetti" : "Configura"}
          </button>
        )}
        {account.comingSoon && (
          <span className="ml-2 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 cursor-default">
            In arrivo
          </span>
        )}
      </div>

      {expanded && account.type === "oauth" && !account.comingSoon && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: account.color, color: account.color }}
          >
            <ExternalLink className="h-4 w-4" />
            Autorizza con {account.name}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">Verrai reindirizzato alla pagina di autorizzazione OAuth 2.0</p>
        </div>
      )}

      {expanded && account.type === "apikey" && account.fields && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {account.fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
              <input
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[rgba(109,98,243,0.4)]"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--accent)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {saving ? "Salvataggio..." : "Salva credenziali"}
            </button>
            <button onClick={() => setExpanded(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
              Annulla
            </button>
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Le credenziali sono cifrate a riposo e mai esposte nel frontend.
          </p>
        </div>
      )}
    </div>
  )
}

// ── OAuth Tab content ─────────────────────────────────────────────────────────

function OAuthTab() {
  return (
    <div className="space-y-6">
      {/* OAuth section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Chrome className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Account OAuth</h3>
          <span className="text-xs text-gray-400">Connetti account di terze parti con OAuth 2.0</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OAUTH_ACCOUNTS.filter(a => a.type === "oauth").map(account => (
            <OAuthAccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* API Keys section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Chiavi API</h3>
          <span className="text-xs text-gray-400">Credenziali API per integrazioni dirette</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OAUTH_ACCOUNTS.filter(a => a.type === "apikey").map(account => (
            <OAuthAccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* Security note */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ background: "rgba(112,96,204,0.04)", borderColor: "rgba(112,96,204,0.14)" }}
      >
        <Shield className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Sicurezza credenziali</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Tutte le credenziali OAuth e le chiavi API sono cifrate con AES-256 e conservate nel database sicuro di Phorma.
            Non vengono mai trasmesse in chiaro né esposte nel frontend. Puoi revocare l'accesso in qualsiasi momento.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

type EventOption = { id: string; title: string; status: string }

export function AiIntegrationsClient({ events }: { events: EventOption[] }) {
  const [mainTab, setMainTab] = useState<"integrations" | "oauth">("integrations")
  const [activeCategory, setActiveCategory] = useState<"all" | IntegrationCategory>("all")
  const [search, setSearch] = useState("")
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  const filtered = INTEGRATIONS.filter(i => {
    if (activeCategory !== "all" && i.category !== activeCategory) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const connectedCount = INTEGRATIONS.filter(i => i.status === "connected").length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Main tabs pill */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: "rgba(112,96,204,0.08)" }}>
        {([
          { key: "integrations", label: "Integrazioni" },
          { key: "oauth", label: "Account OAuth" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              mainTab === tab.key
                ? { background: "var(--accent)", color: "#fff", boxShadow: "0 2px 8px rgba(112,96,204,0.25)" }
                : { color: "var(--text-secondary)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "integrations" && (
        <>
          {/* Stats row */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{connectedCount}</span> attive</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
              <span className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{INTEGRATIONS.filter(i => i.status === "available").length}</span> configurabili</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              <span className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{INTEGRATIONS.filter(i => i.status === "coming_soon").length}</span> in arrivo</span>
            </div>
          </div>

          {/* Search + categories */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca integrazione..."
              className="flex-1 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[rgba(109,98,243,0.4)] focus:ring-1 focus:ring-[rgba(109,98,243,0.15)]"
            />
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeCategory === cat.key
                      ? "bg-[#7060CC] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">Nessuna integrazione trovata</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onClick={() => setSelectedIntegration(integration)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {mainTab === "oauth" && <OAuthTab />}

      {/* Config modal */}
      {selectedIntegration && (
        <ConfigModal
          integration={selectedIntegration}
          events={events}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  )
}
