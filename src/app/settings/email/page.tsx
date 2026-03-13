"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Mail, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

export default function EmailSettingsPage() {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/org/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.skipped) {
        toast("RESEND_API_KEY non configurata — email non inviata", { variant: "warning" });
      } else if (res.ok) {
        toast("Email di test inviata!", { variant: "success" });
      } else {
        toast(data.error ?? "Errore invio", { variant: "error" });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900 text-sm">Configurazione richiesta</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Per inviare email aggiungi <code className="font-mono bg-amber-100 px-1 rounded">RESEND_API_KEY</code> al file <code className="font-mono bg-amber-100 px-1 rounded">.env</code>.
                Ottieni una chiave gratuita su <strong>resend.com</strong>.
              </p>
              <p className="text-amber-700 text-sm mt-1">
                Facoltativo: <code className="font-mono bg-amber-100 px-1 rounded">EMAIL_FROM</code> per personalizzare il mittente (default: <em>noreply@eventflow.app</em>).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email features overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            Email automatiche attive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Conferma registrazione", desc: "Inviata al momento dell'iscrizione pubblica", active: true },
            { label: "Lista d'attesa", desc: "Inviata quando l'evento è al completo", active: true },
            { label: "Promozione da waitlist", desc: "Inviata quando un posto si libera", active: true },
            { label: "Promemoria evento", desc: "Inviabile manualmente dalla pagina Email dell'evento", active: true },
          ].map(({ label, desc, active }) => (
            <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className={`mt-0.5 shrink-0 ${active ? "text-green-500" : "text-gray-300"}`}>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Test send */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-500" />
            Email di test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendTest} className="flex gap-3">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tua@email.com"
              required
              className="flex-1"
            />
            <Button type="submit" disabled={sending} className="gap-2 shrink-0">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Invia test
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-2">Invia un&apos;email di esempio per verificare la configurazione.</p>
        </CardContent>
      </Card>
    </div>
  );
}
