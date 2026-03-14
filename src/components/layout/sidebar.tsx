"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Calendar, Users, Mail, BarChart3,
  Settings, Zap, ChevronRight, PlusCircle, LogOut, Hotel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Eventi", icon: Calendar },
  { href: "/participants", label: "Partecipanti", icon: Users },
  { href: "/emails", label: "Email", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/phorma", label: "Phorma AI", icon: Zap, highlight: true },
  { href: "/settings/hotels", label: "Hotel", icon: Hotel },
  { href: "/settings/profile", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "Utente";
  const userEmail = session?.user?.email ?? "";
  const orgName = session?.user?.orgName ?? "";
  const role = session?.user?.role ?? "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-950 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight">EventFlow</span>
          {orgName && <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{orgName}</p>}
        </div>
      </div>

      {/* Quick action — hidden for VIEWERs */}
      {role !== "VIEWER" && (
        <div className="px-4 py-3">
          <Link href="/events/new">
            <button className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors">
              <PlusCircle className="h-4 w-4" />
              Crea Evento
            </button>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, highlight }) => {
          const settingsHref = href === "/settings/profile" ? "/settings" : null;
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href)) ||
            (settingsHref !== null && pathname.startsWith(settingsHref));
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white",
                highlight && !active && "text-blue-400 hover:text-blue-300"
              )}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {highlight && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-semibold">AI</span>
                )}
                {active && <ChevronRight className="h-3 w-3 opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer — user info */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            {role && (
              <p className="text-[10px] text-gray-600 capitalize">{role.toLowerCase()}</p>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            title="Esci"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
