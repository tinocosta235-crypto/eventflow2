"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { Loader2, Building2, Lock } from "lucide-react";

type OrgData = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo: string | null;
  plan: string;
  createdAt: string;
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export default function OrgSettingsPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  const [org, setOrg] = useState<OrgData | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/org/settings")
      .then((r) => r.json())
      .then((data) => {
        setOrg(data);
        setName(data.name ?? "");
        setWebsite(data.website ?? "");
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
            {!isOwner && <Lock className="h-4 w-4 text-gray-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isOwner && (
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
                disabled={!isOwner}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sito web</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                type="url"
                disabled={!isOwner}
              />
            </div>
            {isOwner && (
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
    </div>
  );
}
