import Link from "next/link";
import { Home } from "lucide-react";

function PhormaMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="11" fill="url(#nf-grad)" />
      <circle cx="18" cy="18" r="10" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" fill="none" strokeDasharray="18 8" />
      <circle cx="18" cy="18" r="4.5" fill="rgba(255,255,255,0.95)" />
      <circle cx="18" cy="8"  r="2"   fill="rgba(255,255,255,0.55)" />
      <defs>
        <linearGradient id="nf-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7060CC" />
          <stop offset="100%" stopColor="#5A4AB0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: "linear-gradient(160deg, #0D0522 0%, #1A0A3D 55%, #0D0522 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(112,96,204,0.15) 0%, transparent 70%)",
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

        {/* 404 number */}
        <div
          className="text-[9rem] font-black leading-none mb-4 select-none"
          style={{
            background: "linear-gradient(135deg, rgba(112,96,204,0.6) 0%, rgba(157,141,245,0.4) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </div>

        {/* Heading */}
        <h1
          className="text-3xl font-bold text-white mb-3"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          Pagina non trovata
        </h1>

        <p className="text-gray-400 text-base leading-relaxed mb-10">
          La pagina che cerchi non esiste o è stata spostata.
        </p>

        {/* Action */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl font-medium text-sm text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #7060CC, #5A4AB0)",
            boxShadow: "0 4px 20px rgba(112,96,204,0.35)",
          }}
        >
          <Home className="w-4 h-4" />
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
