"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

function PhormaMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="11" fill="url(#lm-grad)" />
      <circle cx="18" cy="18" r="10" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" fill="none" strokeDasharray="18 8" />
      <circle cx="18" cy="18" r="4.5" fill="rgba(255,255,255,0.95)" />
      <circle cx="18" cy="8"  r="2"   fill="rgba(255,255,255,0.55)" />
      <defs>
        <linearGradient id="lm-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7060CC" />
          <stop offset="100%" stopColor="#5A4AB0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LoginPage() {
  const router   = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

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
    <div
      className="min-h-screen flex"
      style={{ background: "var(--background)" }}
    >
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0D0522 0%, #1A0A3D 55%, #0D0522 100%)",
          borderRight: "1px solid rgba(112, 96, 204, 0.16)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 20% 10%, rgba(112,96,204,0.22) 0%, transparent 60%), " +
              "radial-gradient(ellipse 50% 40% at 80% 90%, rgba(175,169,236,0.12) 0%, transparent 55%)",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(112,96,204,0.16) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 80% 60% at 40% 30%, black 0%, transparent 85%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <PhormaMark size={36} />
          <span className="font-bold text-xl tracking-tight" style={{ color: "#edeef6" }}>Phorma</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-8">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.22em] mb-5"
              style={{ color: "rgba(139,128,255,0.65)" }}
            >
              AI-Powered Event Platform
            </p>
            <h1
              className="text-[2.6rem] font-bold leading-[1.12] mb-5"
              style={{
                color: "#F7F5FF",
                fontFamily: "var(--font-dm-serif, 'DM Serif Display'), Georgia, serif",
                fontStyle: "italic",
              }}
            >
              Dove ogni evento<br />prende forma.
            </h1>
            <p className="text-base leading-relaxed max-w-sm" style={{ color: "rgba(237,238,246,0.55)" }}>
              Orchestrazione intelligente di eventi, agenti AI, flussi automatizzati e logistica — tutto in un&apos;unica piattaforma.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2.5">
            {["Flow Builder", "AI Agents", "Smart Analytics", "Hospitality"].map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1.5 rounded-full border"
                style={{
                  background: "rgba(112,96,204,0.12)",
                  borderColor: "rgba(112,96,204,0.26)",
                  color: "#AFA9EC",
                  fontWeight: 500,
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-xs" style={{ color: "rgba(237,238,246,0.28)" }}>
          © 2025 Phorma. Tutti i diritti riservati.
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: "var(--background)" }}
      >
        <div className="w-full max-w-sm ef-appear">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <PhormaMark size={30} />
            <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Phorma</span>
          </div>

          <div className="mb-8">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
            >
              Accedi al tuo account
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Inserisci le tue credenziali per continuare
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.14em] mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@phorma.it"
                  required
                  className="w-full pl-9 pr-4 h-10 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background:   "#ffffff",
                    border:       "1px solid rgba(112,96,204,0.22)",
                    color:        "var(--text-primary)",
                    fontFamily:   "inherit",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(112,96,204,0.55)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(112,96,204,0.22)")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.14em] mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-4 h-10 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: "#ffffff",
                    border:     "1px solid rgba(112,96,204,0.22)",
                    color:      "var(--text-primary)",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(112,96,204,0.55)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(112,96,204,0.22)")}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm px-4 py-3 rounded-lg border"
                style={{
                  background:  "rgba(244,63,94,0.10)",
                  borderColor: "rgba(244,63,94,0.25)",
                  color:       "var(--fault)",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background:   "#7060CC",
                color:        "#ffffff",
                border:       "1px solid rgba(112,96,204,0.28)",
                boxShadow:    "0 0 20px rgba(112,96,204,0.25)",
                fontFamily:   "inherit",
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Accedi <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
            Non hai un account?{" "}
            <Link
              href="/auth/register"
              className="font-medium hover:underline"
              style={{ color: "var(--accent-light)" }}
            >
              Registra la tua organizzazione
            </Link>
          </p>

          {/* Demo credentials */}
          <div
            className="mt-6 p-4 rounded-xl border"
            style={{
              background:  "var(--depth-3)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Account demo
            </p>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
              Email: <span className="font-mono" style={{ color: "var(--text-primary)" }}>demo@phorma.it</span>
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Password: <span className="font-mono" style={{ color: "var(--text-primary)" }}>demo1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
