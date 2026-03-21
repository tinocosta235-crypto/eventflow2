"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Building2, Mail, User, UserCog } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { href: "/settings/profile", label: "Profilo", icon: User },
  { href: "/settings/org", label: "Organizzazione", icon: Building2 },
  { href: "/settings/team", label: "Team", icon: UserCog },
  { href: "/settings/email", label: "Email mittente", icon: Mail },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardLayout>
      <Header
        title="Impostazioni"
        subtitle="Configura account, organizzazione, team e preferenze piattaforma"
        actions={
          <Link href="/">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(109,98,243,0.14)] bg-white/90 px-3 py-1.5 text-sm text-slate-700 shadow-[0_10px_24px_rgba(109,98,243,0.08)] hover:bg-[rgba(109,98,243,0.06)] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Indietro
            </button>
          </Link>
        }
      />

      <div className="px-8 py-6 space-y-5">
        <nav className="flex flex-wrap gap-2">
          {SETTINGS_TABS.map((tab) => {
            const active = pathname === tab.href || (tab.href === "/settings/profile" && pathname === "/settings");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-[rgba(109,98,243,0.22)] bg-[rgba(109,98,243,0.10)] text-[var(--accent)]"
                    : "border-[rgba(109,98,243,0.12)] bg-white/88 text-slate-600 hover:bg-[rgba(109,98,243,0.05)] hover:text-slate-900"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <section className="rounded-2xl border border-[rgba(109,98,243,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,255,0.95))] p-5 shadow-[0_18px_42px_rgba(109,98,243,0.08)]">
          {children}
        </section>
      </div>
    </DashboardLayout>
  );
}
