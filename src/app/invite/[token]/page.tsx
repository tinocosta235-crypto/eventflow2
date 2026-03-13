"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, Users } from "lucide-react";

type InviteInfo = {
  email: string;
  role: string;
  orgName: string;
  userExists: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Proprietario",
  MEMBER: "Membro",
  VIEWER: "Visualizzatore",
};

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invite?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInvite(data);
      })
      .catch(() => setError("Errore di connessione"))
      .finally(() => setLoading(false));
  }, [token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite?.userExists && (!name || !password)) {
      setError("Nome e password sono obbligatori per creare il tuo account");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Errore"); return; }
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-2 border-green-200">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Benvenuto in {invite?.orgName}!</h2>
            <p className="text-gray-500 text-sm">Stai per essere reindirizzato al login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EventFlow</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-500" />
              Invito al team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && !invite && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}

            {invite && (
              <>
                <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1">
                  <p className="text-gray-500">Sei stato invitato a unirti a</p>
                  <p className="font-bold text-gray-900 text-base">{invite.orgName}</p>
                  <p className="text-gray-500">come <span className="font-medium text-blue-600">{ROLE_LABELS[invite.role] ?? invite.role}</span></p>
                  <p className="text-gray-400 text-xs mt-2">Email: {invite.email}</p>
                </div>

                <form onSubmit={accept} className="space-y-3">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                    </div>
                  )}

                  {!invite.userExists && (
                    <>
                      <p className="text-sm text-gray-500">Non hai ancora un account. Crea le tue credenziali per accedere.</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Mario Rossi"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Almeno 8 caratteri"
                          required
                          minLength={8}
                        />
                      </div>
                    </>
                  )}

                  {invite.userExists && (
                    <p className="text-sm text-gray-500">
                      Il tuo account esiste già. Clicca per unirti all&apos;organizzazione.
                    </p>
                  )}

                  <Button type="submit" className="w-full gap-2" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Accetta invito
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
