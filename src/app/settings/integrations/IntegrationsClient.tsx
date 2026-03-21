"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, XCircle, AlertCircle, ExternalLink, Loader2,
  Chrome, Laptop, Hotel, MessageCircle, Send, Plug, Key, Trash2
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ── Types ──────────────────────────────────────────────────
type IntegrationStatus = "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "EXPIRED" | "REVOKED" | "ERROR";

interface Integration {
  id?: string;
  provider: string;
  status: IntegrationStatus;
  scopes?: string;     // JSON string[]
  consentGivenAt?: string;
  meta?: string;       // JSON { email, name }
}

// ── Provider config ────────────────────────────────────────
const PROVIDERS = [
  {
    id: "GOOGLE",
    name: "Google Workspace",
    description: "Drive, Gmail, Google Calendar — sincronizza eventi e invia email dal tuo account Google.",
    icon: Chrome,
    color: "#4285F4",
    bg: "#EFF6FF",
    type: "oauth",
    services: ["Google Drive", "Gmail", "Google Calendar"],
    gdpr: "I token vengono cifrati AES-256 e mai condivisi. Puoi revocare in qualsiasi momento.",
  },
  {
    id: "MICROSOFT",
    name: "Microsoft 365",
    description: "OneDrive, Outlook, Teams e Calendario Microsoft — integrazione completa per ambienti enterprise.",
    icon: Laptop,
    color: "#0078D4",
    bg: "#EFF6FF",
    type: "oauth",
    services: ["OneDrive", "Outlook", "Microsoft Teams", "Calendario"],
    gdpr: "I token vengono cifrati AES-256 e mai condivisi. Puoi revocare in qualsiasi momento.",
  },
  {
    id: "AMADEUS",
    name: "Amadeus Travel",
    description: "API travel Amadeus — ricerca voli, hotel e disponibilità in tempo reale.",
    icon: Hotel,
    color: "#FF6900",
    bg: "#FFF7ED",
    type: "apikey",
    keyLabel: "Client ID (API Key)",
    secretLabel: "Client Secret",
    hasSecret: true,
    gdpr: "Le credenziali vengono cifrate AES-256 a riposo.",
  },
  {
    id: "BOOKING",
    name: "Booking.com",
    description: "API Booking.com — ricerca strutture ricettive per la tua agenzia.",
    icon: Hotel,
    color: "#003580",
    bg: "#EFF6FF",
    type: "apikey",
    keyLabel: "API Key",
    hasSecret: false,
    gdpr: "Le credenziali vengono cifrate AES-256 a riposo.",
  },
  {
    id: "WHATSAPP",
    name: "WhatsApp Business",
    description: "WhatsApp Business API — invia notifiche e comunicazioni ai partecipanti via WhatsApp.",
    icon: MessageCircle,
    color: "#25D366",
    bg: "#F0FDF7",
    type: "apikey",
    keyLabel: "Access Token",
    hasSecret: false,
    gdpr: "Il token viene cifrato AES-256. I messaggi sono soggetti alle norme GDPR per le comunicazioni.",
  },
  {
    id: "TELEGRAM",
    name: "Telegram Bot",
    description: "Bot Telegram — invia aggiornamenti automatici ai canali o gruppi Telegram del tuo evento.",
    icon: Send,
    color: "#26A5E4",
    bg: "#EFF6FF",
    type: "apikey",
    keyLabel: "Bot Token",
    hasSecret: false,
    gdpr: "Il bot token viene cifrato AES-256 a riposo.",
  },
] as const;

// ── Status badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: IntegrationStatus }) {
  if (status === "CONNECTED")
    return <Badge className="bg-green-50 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Connesso</Badge>;
  if (status === "EXPIRED")
    return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"><AlertCircle className="h-3 w-3" />Scaduto</Badge>;
  if (status === "REVOKED" || status === "NOT_CONNECTED")
    return <Badge className="bg-gray-100 text-gray-500 border-gray-200 gap-1"><XCircle className="h-3 w-3" />Non connesso</Badge>;
  if (status === "ERROR")
    return <Badge className="bg-red-50 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Errore</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 border-gray-200">—</Badge>;
}

// ── ApiKey form ─────────────────────────────────────────────
function ApiKeyForm({
  provider,
  keyLabel,
  secretLabel,
  hasSecret,
  onSaved,
}: {
  provider: string;
  keyLabel: string;
  secretLabel?: string;
  hasSecret: boolean;
  onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!apiKey.trim()) { toast("Inserisci l'API key", { variant: "error" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, apiSecret: hasSecret ? apiSecret : undefined }),
      });
      if (!res.ok) throw new Error();
      toast("Integrazione salvata");
      onSaved();
    } catch {
      toast("Errore nel salvataggio", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div>
        <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{keyLabel}</label>
        <Input
          type="password"
          placeholder="••••••••••••••••"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
      </div>
      {hasSecret && (
        <div>
          <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{secretLabel}</label>
          <Input
            type="password"
            placeholder="••••••••••••••••"
            value={apiSecret}
            onChange={e => setApiSecret(e.target.value)}
          />
        </div>
      )}
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
        Salva
      </Button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
export function IntegrationsClient() {
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [apiKeyOpen, setApiKeyOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (!res.ok) return;
      const data = await res.json() as Integration[];
      const map: Record<string, Integration> = {};
      for (const i of data) map[i.provider] = i;
      setIntegrations(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Check URL params for success/error feedback
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) {
      const name = PROVIDERS.find(p => p.id === success.toUpperCase())?.name ?? success;
      toast(`${name} connesso con successo`);
      window.history.replaceState({}, "", "/settings/integrations");
    }
    if (error) {
      toast("Connessione annullata o fallita", { variant: "error" });
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, [load]);

  async function handleRevoke(provider: string, oauthProvider?: boolean) {
    setRevoking(provider);
    try {
      const url = oauthProvider
        ? `/api/integrations/${provider.toLowerCase()}`
        : `/api/integrations/apikey?provider=${provider}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Integrazione revocata");
      await load();
    } catch {
      toast("Errore nella revoca", { variant: "error" });
    } finally {
      setRevoking(null);
    }
  }

  const getMeta = (provider: string) => {
    try { return JSON.parse(integrations[provider]?.meta ?? "{}") as Record<string, string>; }
    catch { return {}; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PROVIDERS.map(p => {
        const integration = integrations[p.id];
        const status: IntegrationStatus = integration?.status ?? "NOT_CONNECTED";
        const connected = status === "CONNECTED";
        const meta = getMeta(p.id);
        const isOAuth = p.type === "oauth";
        const isApiKeyOpen = apiKeyOpen === p.id;

        return (
          <div
            key={p.id}
            className="rounded-xl border border-[rgba(109,98,243,0.12)] bg-white p-5 shadow-[0_2px_8px_rgba(109,98,243,0.06)]"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: p.bg }}
              >
                <p.icon className="h-5 w-5" style={{ color: p.color }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">{p.name}</h3>
                  <StatusBadge status={status} />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{p.description}</p>

                {/* Connected account info */}
                {connected && meta.email && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span>{meta.email}</span>
                  </div>
                )}

                {/* Services chips */}
                {"services" in p && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {p.services.map(s => (
                      <span key={s} className="rounded-full bg-[var(--depth-3)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* GDPR note */}
                <p className="mt-2.5 text-[10px] text-[var(--text-tertiary)] flex items-start gap-1">
                  <Key className="h-3 w-3 shrink-0 mt-0.5" />
                  {p.gdpr}
                </p>

                {/* API key form */}
                {!isOAuth && isApiKeyOpen && !connected && (
                  <ApiKeyForm
                    provider={p.id}
                    keyLabel={p.keyLabel}
                    secretLabel={"secretLabel" in p ? p.secretLabel : undefined}
                    hasSecret={"hasSecret" in p ? p.hasSecret : false}
                    onSaved={() => { setApiKeyOpen(null); load(); }}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleRevoke(p.id, isOAuth)}
                    disabled={revoking === p.id}
                  >
                    {revoking === p.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><Trash2 className="h-3.5 w-3.5 mr-1" />Disconnetti</>
                    }
                  </Button>
                ) : isOAuth ? (
                  <a href={`/api/integrations/${p.id.toLowerCase()}/connect`}>
                    <Button size="sm">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Connetti
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant={isApiKeyOpen ? "outline" : "default"}
                    onClick={() => setApiKeyOpen(isApiKeyOpen ? null : p.id)}
                  >
                    <Plug className="h-3.5 w-3.5 mr-1.5" />
                    {isApiKeyOpen ? "Annulla" : "Configura"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* GDPR info box */}
      <div className="rounded-xl border border-[rgba(109,98,243,0.12)] bg-[var(--depth-3)] p-4">
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          <strong className="text-[var(--text-secondary)]">Nota GDPR:</strong>{" "}
          Tutte le credenziali e i token OAuth sono cifrati con AES-256-GCM prima di essere salvati nel database.
          I dati non vengono mai condivisi con terze parti. Puoi revocare qualsiasi integrazione in qualsiasi momento —
          i token vengono cancellati immediatamente. Il log di tutte le connessioni e revoche è disponibile nella sezione Audit.
        </p>
      </div>
    </div>
  );
}
