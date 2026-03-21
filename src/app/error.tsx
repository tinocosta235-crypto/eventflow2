"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

function PhormaMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="11" fill="url(#err-grad)" />
      <circle cx="18" cy="18" r="10" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" fill="none" strokeDasharray="18 8" />
      <circle cx="18" cy="18" r="4.5" fill="rgba(255,255,255,0.95)" />
      <circle cx="18" cy="8"  r="2"   fill="rgba(255,255,255,0.55)" />
      <defs>
        <linearGradient id="err-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7060CC" />
          <stop offset="100%" stopColor="#5A4AB0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
      style={{
        background: "linear-gradient(160deg, #0D0522 0%, #1A0A3D 55%, #0D0522 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(112,96,204,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 mb-12">
          <PhormaMark size={32} />
          <span
            className="text-xl font-semibold tracking-tight text-white"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Phorma
          </span>
        </div>

        {/* Error icon */}
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
          style={{ background: "rgba(112,96,204,0.15)", border: "1px solid rgba(112,96,204,0.3)" }}
        >
          <AlertTriangle className="w-9 h-9 text-[#9D8DF5]" />
        </div>

        {/* Heading */}
        <h1
          className="text-3xl font-bold text-white mb-3"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          Qualcosa è andato storto
        </h1>

        <p className="text-gray-400 text-base leading-relaxed mb-10">
          Si è verificato un errore imprevisto.<br />
          Il team è stato notificato.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl font-medium text-sm text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #7060CC, #5A4AB0)",
              boxShadow: "0 4px 20px rgba(112,96,204,0.35)",
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Riprova
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl font-medium text-sm text-gray-300 transition-all hover:text-white"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Home className="w-4 h-4" />
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
