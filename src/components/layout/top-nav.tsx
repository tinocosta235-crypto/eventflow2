"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Building2, Calendar, LogOut, Settings, UserCircle2, Workflow } from "lucide-react";

const sections = [
  {
    label: "Events",
    href: "/events",
    icon: Calendar,
    match: (p: string) =>
      p.startsWith("/events") || p.startsWith("/participants") || p.startsWith("/emails") || p.startsWith("/analytics"),
  },
  {
    label: "Organization",
    href: "/organization",
    icon: Building2,
    match: (p: string) => p.startsWith("/organization"),
  },
  {
    label: "AI & Integrations",
    href: "/ai-integrations",
    icon: Workflow,
    match: (p: string) => p.startsWith("/ai-integrations") || p.startsWith("/phorma"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    match: (p: string) => p.startsWith("/settings"),
  },
  {
    label: "Account",
    href: "/account",
    icon: UserCircle2,
    match: (p: string) => p.startsWith("/account"),
  },
];

/* Phorma geometric mark — a stylized flow node */
function PhormaMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="26" height="26" rx="8" fill="url(#logo-grad)" />
      {/* Outer ring arc */}
      <circle cx="13" cy="13" r="7.5" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" strokeDasharray="14 6" />
      {/* Center node */}
      <circle cx="13" cy="13" r="3.5" fill="rgba(255,255,255,0.95)" />
      {/* Flow dot */}
      <circle cx="13" cy="5.5" r="1.5" fill="rgba(255,255,255,0.60)" />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c72f5" />
          <stop offset="100%" stopColor="#5548d9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "Utente";
  const orgName  = session?.user?.orgName ?? "";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-5 gap-6 border-b"
      style={{
        height: "var(--nav-height)",
        background:   "rgba(6, 8, 15, 0.82)",
        backdropFilter: "blur(16px)",
        borderColor: "rgba(109, 98, 243, 0.14)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <PhormaMark />
        <div className="leading-none">
          <span
            className="font-semibold text-sm tracking-wide"
            style={{ color: "#edeef6", letterSpacing: "0.02em" }}
          >
            Phorma
          </span>
          {orgName && (
            <p
              className="text-[10px] truncate max-w-[110px] mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {orgName}
            </p>
          )}
        </div>
      </Link>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
        {sections.map(({ label, href, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link key={href} href={href}>
              <span
                className="px-3 py-1.5 rounded-[9px] text-[13px] inline-flex items-center gap-1.5 cursor-pointer border whitespace-nowrap transition-all duration-150"
                style={
                  active
                    ? {
                        fontWeight: 550,
                        color: "#c4beff",
                        background: "rgba(109, 98, 243, 0.16)",
                        borderColor: "rgba(139, 128, 255, 0.28)",
                        boxShadow: "0 0 14px rgba(109, 98, 243, 0.12)",
                      }
                    : {
                        fontWeight: 400,
                        color: "rgba(237, 238, 246, 0.60)",
                        background: "transparent",
                        borderColor: "transparent",
                      }
                }
              >
                <Icon
                  className="h-3.5 w-3.5 flex-shrink-0"
                  strokeWidth={active ? 2.2 : 1.7}
                  style={{ opacity: active ? 1 : 0.7 }}
                />
                {label}
                {active && (
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: "rgba(139, 128, 255, 0.9)" }}
                  />
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── User ─────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 border"
            style={{
              background: "linear-gradient(135deg, #6d62f3, #9b8af5)",
              borderColor: "rgba(139, 128, 255, 0.35)",
              color: "#ffffff",
              letterSpacing: "0.04em",
            }}
          >
            {initials}
          </div>
          <span
            className="text-sm hidden md:block"
            style={{ color: "var(--text-primary)", fontWeight: 450 }}
          >
            {userName}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          title="Esci"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
