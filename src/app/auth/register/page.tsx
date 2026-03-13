"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle2, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", orgName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore durante la registrazione"); setLoading(false); return; }
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">Phorma</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">Inizia gratis,<br />scala quando vuoi</h1>
          <p className="text-blue-200 text-lg mb-10">Unisciti a centinaia di organizzatori che gestiscono i loro eventi con Phorma.</p>
          <div className="space-y-3">
            {["Nessuna carta di credito richiesta","Piano gratuito per sempre disponibile","Setup in meno di 2 minuti","Supporto italiano dedicato","GDPR compliant"].map(text => (
              <div key={text} className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-400 text-sm">© 2025 Phorma. Tutti i diritti riservati.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl">Phorma</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Crea il tuo account</h2>
          <p className="text-gray-500 mb-8">Registra la tua organizzazione in pochi secondi</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                <input type="text" value={form.firstName} onChange={e => update("firstName", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mario" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cognome</label>
                <input type="text" value={form.lastName} onChange={e => update("lastName", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rossi" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome organizzazione</label>
              <input type="text" value={form.orgName} onChange={e => update("orgName", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Azienda Srl" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="mario@azienda.it" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => update("password", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimo 8 caratteri" minLength={8} required />
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
              {loading ? "Creazione account..." : (<>Crea account gratuito <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Hai già un account?{" "}
            <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
