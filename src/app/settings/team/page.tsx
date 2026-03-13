"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, UserPlus, Copy, Check, Trash2, ChevronDown, Clock, Mail,
} from "lucide-react";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string; image: string | null };
};
type Invite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

const ROLES = ["OWNER", "MEMBER", "VIEWER"] as const;
const ROLE_LABELS: Record<string, string> = { OWNER: "Proprietario", MEMBER: "Membro", VIEWER: "Visualizzatore" };
const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  MEMBER: "bg-blue-100 text-blue-700",
  VIEWER: "bg-gray-100 text-gray-600",
};

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return email[0].toUpperCase();
}

export default function TeamPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";
  const currentUserId = session?.user?.id;

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MEMBER" | "VIEWER">("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  async function load() {
    const res = await fetch("/api/org/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setInvites(data.invites);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast("Errore", { description: data.error, variant: "error" }); return; }
      setInviteLink(data.inviteUrl);
      toast("Invito creato", { variant: "success" });
      load();
    } finally {
      setInviting(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch("/api/org/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    if (res.ok) { toast("Invito revocato", { variant: "success" }); load(); }
    else toast("Errore", { variant: "error" });
  }

  async function updateRole(userId: string, role: string) {
    const res = await fetch("/api/org/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) { toast("Ruolo aggiornato", { variant: "success" }); load(); }
    else toast("Errore", { description: (await res.json()).error, variant: "error" });
  }

  async function removeMember() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/org/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: removeTarget.user.id }),
      });
      if (res.ok) {
        toast(`${removeTarget.user.name ?? removeTarget.user.email} rimosso`, { variant: "success" });
        setRemoveTarget(null);
        load();
      } else {
        toast("Errore", { description: (await res.json()).error, variant: "error" });
      }
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Team</h2>
          <p className="text-sm text-gray-500">{members.length} membro{members.length !== 1 ? "i" : ""}</p>
        </div>
        {isOwner && (
          <Button onClick={() => { setShowInvite(true); setInviteLink(""); setInviteEmail(""); }} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invita membro
          </Button>
        )}
      </div>

      {/* Members list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500 font-medium uppercase tracking-wide">Membri attivi</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {initials(m.user.name, m.user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{m.user.name ?? "—"}</p>
                <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && m.user.id !== currentUserId ? (
                  <div className="relative">
                    <select
                      value={m.role}
                      onChange={(e) => updateRole(m.user.id, e.target.value)}
                      className="appearance-none text-xs font-medium px-2.5 py-1 pr-6 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ background: "transparent" }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                    <span className={`absolute inset-0 rounded-full -z-10 ${ROLE_COLORS[m.role]}`} />
                  </div>
                ) : (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[m.role]}`}>
                    {ROLE_LABELS[m.role]}
                  </span>
                )}
                {isOwner && m.user.id !== currentUserId && (
                  <button
                    onClick={() => setRemoveTarget(m)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {m.user.id === currentUserId && (
                  <span className="text-xs text-gray-400">(tu)</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium uppercase tracking-wide flex items-center gap-2">
              <Clock className="h-4 w-4" /> Inviti in attesa
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-gray-100">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 py-3">
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    Scade: {new Date(inv.expiresAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[inv.role]}`}>
                  {ROLE_LABELS[inv.role]}
                </span>
                {isOwner && (
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite modal */}
      <Dialog open={showInvite} onOpenChange={(o) => { setShowInvite(o); if (!o) setInviteLink(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invita un membro</DialogTitle>
          </DialogHeader>

          {!inviteLink ? (
            <form onSubmit={sendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="mario@azienda.it"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ruolo</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {inviteRole === "OWNER" && "Accesso completo inclusa gestione team e impostazioni"}
                  {inviteRole === "MEMBER" && "Può gestire eventi e partecipanti, non le impostazioni org"}
                  {inviteRole === "VIEWER" && "Accesso in sola lettura"}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Annulla</Button>
                <Button type="submit" disabled={inviting} className="gap-2">
                  {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crea invito
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Invito creato! Copia il link e invialo a <strong>{inviteEmail}</strong>.
                Scade tra 7 giorni.
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                <code className="text-xs text-gray-700 flex-1 min-w-0 break-all">{inviteLink}</code>
                <button
                  onClick={copyLink}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-300 transition-colors shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
                </button>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowInvite(false)}>Chiudi</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirm dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rimuovi membro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Sei sicuro di voler rimuovere <strong>{removeTarget?.user.name ?? removeTarget?.user.email}</strong> dal team?
            Perderà l&apos;accesso all&apos;organizzazione.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Annulla</Button>
            <Button variant="destructive" onClick={removeMember} disabled={removing} className="gap-2">
              {removing && <Loader2 className="h-4 w-4 animate-spin" />}
              Rimuovi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
