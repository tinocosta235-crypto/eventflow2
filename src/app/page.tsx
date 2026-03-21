import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Calendar, Users, TrendingUp, Euro, ArrowUpRight, Plus, CheckCircle2, Clock, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const PILOT_MOCK_EVENTS = [
  { id: "mock-pirelli", title: "Evento Pirelli", status: "PUBLISHED", startDate: new Date("2026-05-08T09:00:00.000Z"), _count: { registrations: 180 }, capacity: 260 },
  { id: "mock-kfc", title: "KFC RGM Meeting 2026", status: "DRAFT", startDate: new Date("2026-06-16T08:00:00.000Z"), _count: { registrations: 95 }, capacity: 180 },
  { id: "mock-wurth", title: "Wurth Kick-Off", status: "PUBLISHED", startDate: new Date("2026-04-22T08:00:00.000Z"), _count: { registrations: 240 }, capacity: 300 },
] as const;

export default async function DashboardPage() {
  const session = await auth();
  const orgId = session?.user?.organizationId ?? "";

  const [events, totalRegistrations, upcomingEventsDb, recentRegistrations] = await Promise.all([
    prisma.event.findMany({ where: { organizationId: orgId }, include: { _count: { select: { registrations: true } } } }),
    prisma.registration.count({ where: { event: { organizationId: orgId } } }),
    prisma.event.findMany({
      where: { organizationId: orgId, status: "PUBLISHED", startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 5,
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.registration.findMany({
      where: { event: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { event: { select: { title: true } } },
    }),
  ]);

  const [revenue, emailLogs] = await Promise.all([
    prisma.registration.aggregate({
      _sum: { ticketPrice: true },
      where: { paymentStatus: "PAID", event: { organizationId: orgId } },
    }),
    prisma.emailSendLog.findMany({
      where: { event: { organizationId: orgId } },
      select: { openedAt: true },
      take: 500,
      orderBy: { sentAt: "desc" },
    }),
  ]);

  const totalEvents = events.length;
  const pilotMockMode = totalEvents === 0;
  const upcomingEvents = pilotMockMode ? PILOT_MOCK_EVENTS : upcomingEventsDb;
  const eventsForStats = pilotMockMode ? PILOT_MOCK_EVENTS : events;

  const eventsByStatus = eventsForStats.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});
  const publishedEvents = eventsByStatus.PUBLISHED ?? 0;
  const draftEvents = eventsByStatus.DRAFT ?? 0;

  const registrationsForRate = eventsForStats.reduce((sum, e) => sum + e._count.registrations, 0);
  const capacityForRate = eventsForStats.reduce((sum, e) => sum + (e.capacity ?? 0), 0);
  const registrationRate = capacityForRate > 0 ? Math.round((registrationsForRate / capacityForRate) * 100) : 0;
  const openRate = emailLogs.length > 0 ? Math.round((emailLogs.filter((l) => !!l.openedAt).length / emailLogs.length) * 100) : 0;

  const kpis = [
    { label: "Eventi Totali", value: totalEvents, icon: Calendar, color: "#0071E3", bg: "rgba(0,113,227,0.08)" },
    { label: "Eventi per status", value: `${publishedEvents}/${draftEvents}`, icon: CheckCircle2, color: "#34C759", bg: "rgba(52,199,89,0.08)" },
    { label: "Entrate", value: formatCurrency(revenue._sum.ticketPrice ?? 0), icon: Euro, color: "#AF52DE", bg: "rgba(175,82,222,0.08)" },
    { label: "Partecipanti gestiti", value: totalRegistrations, icon: Users, color: "#6366F1", bg: "rgba(99,102,241,0.1)" },
    { label: "Open rate medio", value: `${openRate}%`, icon: TrendingUp, color: "#0EA5E9", bg: "rgba(14,165,233,0.1)" },
    { label: "Registration rate", value: `${registrationRate}%`, icon: ArrowUpRight, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  ];

  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const dateStr = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <DashboardLayout>
      <Header
        title={`Buongiorno, ${firstName}`}
        subtitle={dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
        actions={
          <Link href="/events/new">
            <Button size="sm" className="gap-2 rounded-lg text-sm font-medium">
              <Plus className="h-3.5 w-3.5" />
              Nuovo evento
            </Button>
          </Link>
        }
      />

      <div className="p-8 space-y-6">
        {/* KPI Grid */}
        {pilotMockMode && (
          <div
            className="rounded-xl border px-4 py-2 text-sm"
            style={{ background: "rgba(29,158,117,0.08)", borderColor: "rgba(29,158,117,0.24)", color: "#1D9E75" }}
          >
            KPI shell attiva in modalità mockup per i pilot: Evento Pirelli, KFC RGM Meeting 2026, Wurth Kick-Off.
          </div>
        )}
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-5"
              style={{
                background: "var(--depth-1)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 3px rgba(26,10,61,0.06), 0 1px 2px rgba(26,10,61,0.04)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                  <kpi.icon className="h-[18px] w-[18px]" style={{ color: kpi.color }} />
                </div>
                <ArrowUpRight className="h-4 w-4" style={{ color: "var(--ph-teal)" }} />
              </div>
              <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>{kpi.value}</p>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Upcoming events */}
          <div
            className="xl:col-span-3 rounded-2xl overflow-hidden"
            style={{
              background: "var(--depth-1)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 3px rgba(26,10,61,0.06)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Prossimi eventi</p>
              <Link href="/events">
                <span className="text-[13px] flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "var(--accent)" }}>
                  Vedi tutti <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Nessun evento in programma</p>
                <Link href="/events/new">
                  <button className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: "var(--accent)", color: "#fff" }}>
                    Crea il primo evento
                  </button>
                </Link>
              </div>
            ) : (
              <div>
                {upcomingEvents.map((event, i) => {
                  const fill = event.capacity ? Math.min(Math.round((event._count.registrations / event.capacity) * 100), 100) : 0;
                  return (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <div
                        className="px-5 py-3.5 transition-colors cursor-pointer hover:bg-[#F4F2FF]"
                        style={{
                          borderBottom: i < upcomingEvents.length - 1 ? "1px solid var(--border-dim)" : "none",
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[14px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{event.title}</p>
                          <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{formatDate(event.startDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />{event._count.registrations}{event.capacity ? ` / ${event.capacity}` : ""}
                          </span>
                        </div>
                        {event.capacity && (
                          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--border-dim)" }}>
                            <div
                              className="h-1 rounded-full transition-all"
                              style={{
                                width: `${fill}%`,
                                background: fill > 90 ? "var(--fault)" : fill > 70 ? "var(--heat)" : "var(--vital)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent registrations */}
          <div
            className="xl:col-span-2 rounded-2xl overflow-hidden"
            style={{
              background: "var(--depth-1)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 3px rgba(26,10,61,0.06)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Iscrizioni recenti</p>
              <Link href="/participants">
                <span className="text-[13px] flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "var(--accent)" }}>
                  Tutte <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            {recentRegistrations.length === 0 ? (
              <p className="text-center py-10 text-[13px]" style={{ color: "var(--text-tertiary)" }}>Nessuna iscrizione</p>
            ) : (
              <div>
                {recentRegistrations.map((reg, i) => (
                  <div
                    key={reg.id}
                    className="px-5 py-3 flex items-center gap-3"
                    style={{ borderBottom: i < recentRegistrations.length - 1 ? "1px solid var(--border-dim)" : "none" }}
                  >
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #7060CC, #AFA9EC)" }}
                    >
                      {reg.firstName[0]}{reg.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{reg.firstName} {reg.lastName}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>{reg.event.title}</p>
                    </div>
                    {reg.status === "CONFIRMED"
                      ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "var(--vital)" }} />
                      : <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "var(--heat)" }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Phorma AI banner */}
        <div
          className="rounded-2xl p-6 flex items-center justify-between overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #3D2F8A 0%, #7060CC 55%, #AFA9EC 100%)",
          }}
        >
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
            <Zap className="h-24 w-24 text-white" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-white/90" strokeWidth={2.5} />
              <span className="text-white font-semibold text-[15px]">Phorma AI</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>BETA</span>
            </div>
            <p className="text-[13px] leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.8)" }}>
              Crea landing page e moduli di iscrizione professionali in pochi secondi con l&apos;intelligenza artificiale.
            </p>
          </div>
          <Link href="/phorma" className="relative flex-shrink-0">
            <button
              className="px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              style={{ background: "rgba(255,255,255,0.95)", color: "#0071E3" }}
            >
              Prova Phorma <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
