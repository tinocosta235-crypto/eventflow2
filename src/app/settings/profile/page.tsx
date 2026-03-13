"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { Loader2, User } from "lucide-react";

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) toast("Nome aggiornato", { variant: "success" });
      else toast("Errore", { description: (await res.json()).error, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast("La nuova password deve avere almeno 8 caratteri", { variant: "error" });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast("Password aggiornata", { variant: "success" });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        toast("Errore", { description: (await res.json()).error, variant: "error" });
      }
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar / info */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">
          {name ? name[0].toUpperCase() : <User className="h-7 w-7" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{name || "—"}</p>
          <p className="text-sm text-gray-500">{session?.user?.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Ruolo: <span className="font-medium capitalize">{session?.user?.role?.toLowerCase()}</span>
            {session?.user?.orgName && ` · ${session.user.orgName}`}
          </p>
        </div>
      </div>

      {/* Name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nome</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="flex gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Il tuo nome"
              className="flex-1"
            />
            <Button type="submit" disabled={saving} className="gap-2 shrink-0">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cambia password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password attuale</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuova password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Almeno 8 caratteri"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={savingPw} className="gap-2">
              {savingPw && <Loader2 className="h-4 w-4 animate-spin" />}
              Aggiorna password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
