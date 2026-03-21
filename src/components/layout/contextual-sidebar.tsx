"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart2,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  FormInput,
  Hotel,
  Mail,
  Plane,
  Plug,
  QrCode,
  Settings,
  Tag,
  User,
  UserCog,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  tab?: string | null;
  exact?: boolean;
  badge?: string;
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <div className={`ef-nav-link ${active ? "is-active" : ""}`}>
        <Icon
          className="h-[15px] w-[15px] flex-shrink-0"
          strokeWidth={active ? 2.2 : 1.8}
        />
        <span className="flex-1 truncate text-[13px]" style={{ fontWeight: active ? 520 : 400 }}>
          {label}
        </span>
        {badge && (
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
            style={{
              background: "rgba(112, 96, 204, 0.10)",
              color: "var(--genesis)",
              borderColor: "rgba(112, 96, 204, 0.22)",
            }}
          >
            {badge}
          </span>
        )}
        {active && (
          <ChevronRight
            className="h-3 w-3 flex-shrink-0"
            style={{ opacity: 0.5, color: "var(--accent)" }}
          />
        )}
      </div>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.20em] select-none"
      style={{ color: "var(--text-tertiary)" }}
    >
      {label}
    </p>
  );
}

function EventSection({
  label,
  items,
  isActive,
}: {
  label: string;
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
}) {
  return (
    <div className="space-y-0.5">
      <SectionLabel label={label} />
      {items.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          active={isActive(item)}
        />
      ))}
    </div>
  );
}

function getEventSections(eventId: string, pendingProposals = 0): { label: string; items: NavItem[] }[] {
  return [
    {
      label: "Event Setup",
      items: [
        { href: `/events/${eventId}`,               label: "Panoramica",      icon: Wrench,    tab: null,      exact: true },
        { href: `/events/${eventId}?tab=settings`,  label: "Impostazioni",    icon: Settings,  tab: "settings" },
      ],
    },
    {
      label: "Event Flow",
      items: [
        { href: `/events/${eventId}/flow`,           label: "Flow Builder",    icon: Workflow },
      ],
    },
    {
      label: "Registrazione",
      items: [
        { href: `/events/${eventId}?tab=groups`,     label: "Categorie Ospiti",       icon: Tag,       tab: "groups" },
        { href: `/events/${eventId}/form`,           label: "Form di registrazione",  icon: FormInput },
        { href: `/events/${eventId}/emails`,         label: "Comunicazioni email",    icon: Mail },
      ],
    },
    {
      label: "Partecipanti",
      items: [
        { href: `/events/${eventId}/masterlist`,     label: "Gestione Partecipanti",  icon: Users },
      ],
    },
    {
      label: "Logistica",
      items: [
        { href: `/events/${eventId}?tab=logistics`,  label: "Hotel",          icon: Hotel,     tab: "logistics" },
        { href: `/events/${eventId}?tab=travel`,     label: "Viaggi",         icon: Plane,     tab: "travel" },
      ],
    },
    {
      label: "Check-in",
      items: [
        { href: `/events/${eventId}/checkin`,        label: "Check-in",       icon: QrCode },
      ],
    },
    {
      label: "Dati & AI",
      items: [
        {
          href: `/events/${eventId}?tab=analytics`,
          label: "Analytics",
          icon: BarChart2,
          tab: "analytics",
        },
        {
          href: `/events/${eventId}/agents`,
          label: "Agenti AI",
          icon: Workflow,
          badge: pendingProposals > 0 ? String(pendingProposals) : undefined,
        },
      ],
    },
  ];
}

export function ContextualSidebar() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";

  const eventMatch       = pathname.match(/^\/events\/([^/]+)/);
  const rawEventId       = eventMatch ? eventMatch[1] : null;
  const isInSpecificEvent = !!rawEventId && rawEventId !== "new";
  const eventId          = isInSpecificEvent ? rawEventId : null;

  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [pendingProposals, setPendingProposals] = useState<number>(0);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetch(`/api/events/${eventId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setEventTitle(d?.title ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetch(`/api/events/${eventId}/ai/proposals/count`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.count) setPendingProposals(d.count); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId]);

  const currentTab      = searchParams.get("tab");
  const inEvents        = pathname.startsWith("/events") || pathname.startsWith("/participants") || pathname.startsWith("/emails") || pathname.startsWith("/analytics");
  const inOrganization  = pathname.startsWith("/organization") || pathname.startsWith("/hotels");
  const inAi            = pathname.startsWith("/ai-integrations") || pathname.startsWith("/phorma") || pathname.startsWith("/hospitality/integrations");
  const inSettings      = pathname.startsWith("/settings");
  const inAccount       = pathname.startsWith("/account");

  function isEventItemActive(item: NavItem) {
    if (!eventId) return false;
    if (item.tab)   return pathname === `/events/${eventId}` && currentTab === item.tab;
    if (item.exact) return pathname === `/events/${eventId}` && !currentTab;
    return pathname.startsWith(item.href.split("?")[0]);
  }

  function sidebarContent() {
    if (isInSpecificEvent && eventId) {
      return (
        <>
          <Link href="/events">
            <div className="ef-back-link">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              <span>Tutti gli eventi</span>
            </div>
          </Link>

          {eventTitle && (
            <div
              className="mx-1 px-3 py-2.5 rounded-xl border mt-1"
              style={{
                background:  "linear-gradient(135deg, rgba(112,96,204,0.10), rgba(112,96,204,0.05))",
                borderColor: "rgba(112, 96, 204, 0.20)",
              }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-[0.20em] mb-1"
                style={{ color: "rgba(175, 169, 236, 0.65)" }}
              >
                Evento
              </p>
              <p
                className="text-[13px] truncate leading-snug"
                style={{ color: "var(--text-primary)", fontWeight: 560 }}
              >
                {eventTitle}
              </p>
            </div>
          )}

          {getEventSections(eventId, pendingProposals).map((section) => (
            <EventSection
              key={section.label}
              label={section.label}
              items={section.items}
              isActive={isEventItemActive}
            />
          ))}
        </>
      );
    }

    if (inEvents) {
      return (
        <>
          <SectionLabel label="Eventi" />
          {role !== "VIEWER" && (
            <NavLink href="/events/new"  label="Crea nuovo evento"      icon={Calendar}  active={pathname === "/events/new"} />
          )}
          <NavLink href="/events"        label="Tutti gli eventi"        icon={Calendar}  active={pathname === "/events"} />
          <NavLink href="/analytics"     label="Analisi Portfolio"       icon={Activity}  active={pathname.startsWith("/analytics")} />
        </>
      );
    }

    if (inOrganization) {
      return (
        <>
          <SectionLabel label="Organizzazione" />
          <NavLink href="/organization"    label="Panoramica"            icon={Building2} active={pathname === "/organization"} />
          <NavLink href="/settings/org"    label="Brand e stile"         icon={Building2} active={pathname.startsWith("/settings/org")} />
          <NavLink href="/settings/team"   label="Utenti e ruoli"        icon={Users}     active={pathname.startsWith("/settings/team")} />
          <NavLink href="/hotels"          label="Strutture ricettive"   icon={Hotel}     active={pathname.startsWith("/hotels")} />
        </>
      );
    }

    if (inAi) {
      return (
        <>
          <SectionLabel label="AI & Integrazioni" />
          <NavLink href="/ai-integrations"             label="Panoramica"    icon={Workflow} active={pathname === "/ai-integrations"} />
          <NavLink href="/phorma"                      label="AI Agents"     icon={Workflow} active={pathname.startsWith("/phorma")} badge="AI" />
          <NavLink href="/hospitality/integrations"    label="Integrazioni"  icon={Plug}     active={pathname.startsWith("/hospitality/integrations")} />
        </>
      );
    }

    if (inSettings) {
      return (
        <>
          <SectionLabel label="Impostazioni" />
          <NavLink href="/settings/profile"         label="Preferenze"              icon={Settings}  active={pathname.startsWith("/settings/profile") || pathname === "/settings"} />
          <NavLink href="/settings/org"             label="Impostazioni org."        icon={Building2} active={pathname.startsWith("/settings/org")} />
          <NavLink href="/settings/team"            label="Accesso team"             icon={UserCog}   active={pathname.startsWith("/settings/team")} />
          <NavLink href="/settings/email-templates" label="Template email"           icon={Mail}      active={pathname.startsWith("/settings/email-templates")} />
          <NavLink href="/settings/email"          label="Mittenti email"           icon={Mail}      active={pathname.startsWith("/settings/email")} />
          <NavLink href="/settings/integrations"   label="Integrazioni"             icon={Plug}      active={pathname.startsWith("/settings/integrations")} />
        </>
      );
    }

    if (inAccount) {
      return (
        <>
          <SectionLabel label="Account" />
          <NavLink href="/account"           label="Il mio profilo"          icon={User}      active={pathname === "/account"} />
          <NavLink href="/settings/profile"  label="Sicurezza e preferenze"  icon={Settings}  active={pathname.startsWith("/settings/profile")} />
        </>
      );
    }

    return (
      <>
        <SectionLabel label="Accesso rapido" />
        <NavLink href="/events"          label="Eventi"                   icon={Calendar}  active={false} />
        <NavLink href="/organization"    label="Organizzazione"           icon={Building2} active={false} />
        <NavLink href="/ai-integrations" label="AI Agents & Integrazioni" icon={Workflow}  active={false} />
      </>
    );
  }

  return (
    <aside
      className="fixed left-0 overflow-y-auto border-r"
      style={{
        top:    "var(--nav-height)",
        width:  "var(--sidebar-width)",
        height: "calc(100vh - var(--nav-height))",
        background:  "linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 245, 255, 0.94))",
        backdropFilter: "blur(16px)",
        borderColor: "rgba(112, 96, 204, 0.12)",
        boxShadow: "8px 0 28px rgba(26, 10, 61, 0.06)",
      }}
    >
      <div className="p-2 pb-6">{sidebarContent()}</div>
    </aside>
  );
}
