"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { Loader2, Building2, Lock, ShieldCheck, Download, Trash2 } from "lucide-react";
import { hasMinRole } from "@/lib/rbac";

type OrgData = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo: string | null;
  plan: string;
  createdAt: string;
};

type GdprData = {
  retentionDays: number;
  lawfulBasis: string;
  dpaSigned: boolean;
  exportedAt: string | null;
  deletionPolicy: string;
  footprint: { events: number; registrations: number; templates: number; users: number };
};

type AuditEntry = {
  at: string;
  action: string;
  actorId: string;
  metadata?: Record<string, unknown>;
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export default function OrgSettingsPage() {
  const { data: session } = useSession();
  const canManageOrg = hasMinRole(session?.user?.role, "ADMIN");

  const [org, setOrg] = useState<OrgData | null>(null);
  const [gdpr, setGdpr] = useState<GdprData | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [gdprBusy, setGdprBusy] = useState<"EXPORT" | "DELETE_REQUEST" | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/org/settings"), fetch("/api/org/gdpr"), fetch("/api/org/audit")])
      .then(async ([orgRes, gdprRes, auditRes]) => {
        const orgData = await orgRes.json();
        setOrg(orgData);
        setName(orgData.name ?? "");
        setWebsite(orgData.website ?? "");
        if (gdprRes.ok) {
          const gdprData = await gdprRes.json();
          setGdpr(gdprData);
        }
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setAuditEntries(auditData.entries ?? []);
        }
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/org/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, website }),
      });
      if (res.ok) toast("Organizzazione aggiornata", { variant: "success" });
      else toast("Errore", { description: (await res.json()).error, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function triggerGdpr(action: "EXPORT" | "DELETE_REQUEST") {
    setGdprBusy(action);
    try {
      const res = await fetch("/api/org/gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("Errore", { description: data.error ?? "Richiesta non riuscita", variant: "error" });
        return;
      }
      toast(data.message, { variant: "success" });
    } finally {
      setGdprBusy(null);
    }
  }

  if (!org) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">{org.name}</p>
          <p className="text-sm text-gray-500">/{org.slug}</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-1">
            {PLAN_LABELS[org.plan] ?? org.plan}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Dettagli organizzazione
            {!canManageOrg && <Lock className="h-4 w-4 text-gray-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canManageOrg && (
            <p className="text-sm text-gray-500 mb-4">Solo i proprietari possono modificare le impostazioni dell&apos;organizzazione.</p>
          )}
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome organizzazione</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                required
                disabled={!canManageOrg}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sito web</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                type="url"
                disabled={!canManageOrg}
              />
            </div>
            {canManageOrg && (
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salva modifiche
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Piano attivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{PLAN_LABELS[org.plan] ?? org.plan}</p>
              <p className="text-sm text-gray-500">
                {org.plan === "FREE" ? "Funzionalità base incluse" : "Tutte le funzionalità attive"}
              </p>
            </div>
            {org.plan === "FREE" && (
              <Button variant="outline" size="sm" disabled className="text-gray-400">
                Upgrade (coming soon)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            GDPR Baseline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gdpr ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Eventi</p>
                  <p className="text-lg font-semibold">{gdpr.footprint.events}</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Partecipanti</p>
                  <p className="text-lg font-semibold">{gdpr.footprint.registrations}</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Template email</p>
                  <p className="text-lg font-semibold">{gdpr.footprint.templates}</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Utenti team</p>
                  <p className="text-lg font-semibold">{gdpr.footprint.users}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Retention: {gdpr.retentionDays} giorni · Base giuridica: {gdpr.lawfulBasis}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Caricamento baseline GDPR...</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => triggerGdpr("EXPORT")}
              disabled={!canManageOrg || gdprBusy !== null}
              className="gap-2"
            >
              {gdprBusy === "EXPORT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Richiedi export dati
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => triggerGdpr("DELETE_REQUEST")}
              disabled={!canManageOrg || gdprBusy !== null}
              className="gap-2"
            >
              {gdprBusy === "DELETE_REQUEST" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Richiedi cancellazione
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          {auditEntries.length === 0 ? (
            <p className="text-sm text-gray-500">Nessuna azione tracciata al momento.</p>
          ) : (
            <div className="space-y-2">
              {auditEntries.map((entry, idx) => (
                <div key={`${entry.at}-${idx}`} className="rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.at).toLocaleString("it-IT")} · actor {entry.actorId}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
