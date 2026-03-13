"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, ArrowRight, Users, Calendar, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Email o password non validi");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
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
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestisci i tuoi eventi<br />con intelligenza artificiale
          </h1>
          <p className="text-blue-200 text-lg mb-10">La piattaforma SaaS italiana per organizzatori di eventi professionali.</p>
          <div className="space-y-4">
            {[
              { icon: Calendar, text: "Crea e pubblica eventi in pochi minuti" },
              { icon: Users, text: "Gestisci iscrizioni e partecipanti" },
              { icon: BarChart3, text: "Analytics in tempo reale" },
              { icon: Zap, text: "Landing page con AI generativa" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-blue-100">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-blue-300" />
                </div>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Accedi al tuo account</h2>
          <p className="text-gray-500 mb-8">Inserisci le tue credenziali per continuare</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="demo@phorma.it" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••" required />
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
              {loading ? "Accesso in corso..." : (<>Accedi <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Non hai un account?{" "}
            <Link href="/auth/register" className="text-blue-600 font-medium hover:underline">
              Registra la tua organizzazione
            </Link>
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Account demo</p>
            <p className="text-xs text-gray-600">Email: <span className="font-mono">demo@phorma.it</span></p>
            <p className="text-xs text-gray-600">Password: <span className="font-mono">demo1234</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
