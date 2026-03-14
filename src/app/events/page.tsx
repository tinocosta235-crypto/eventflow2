import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  Calendar, MapPin, Users, Plus, Globe, Mic2, Building2, Monitor,
  UtensilsCrossed, Store, Rocket, Network, Blend, Edit, BarChart3,
  Mail, Hotel, Plane, ClipboardList, FileText, TrendingUp,
  ArrowRight, Building,
} from "lucide-react";
import Link from "next/link";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { EventsFilter } from "@/components/events/EventsFilter";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const EVENT_TYPE_ICONS: Record<string, React.ElementType> = {
  CONFERENCE: Mic2, SEMINAR: Building2, WEBINAR: Monitor, WORKSHOP: Users,
  GALA_DINNER: UtensilsCrossed, TRADE_SHOW: Store, PRODUCT_LAUNCH: Rocket,
  NETWORKING: Network, HYBRID: Blend,
};
const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFERENCE: "Conferenza", SEMINAR: "Seminario", WEBINAR: "Webinar", WORKSHOP: "Workshop",
  GALA_DINNER: "Cena di Gala", TRADE_SHOW: "Fiera/Expo", PRODUCT_LAUNCH: "Lancio Prodotto",
  NETWORKING: "Networking", HYBRID: "Ibrido",
};
const PLUGIN_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  REGISTRATION: { icon: ClipboardList, color: "text-blue-600 bg-blue-50", label: "Registrazione" },
  EMAIL: { icon: Mail, color: "text-purple-600 bg-purple-50", label: "Email" },
  HOSPITALITY: { icon: Hotel, color: "text-amber-600 bg-amber-50", label: "Hospitality" },
  TRAVEL: { icon: Plane, color: "text-sky-600 bg-sky-50", label: "Travel" },
  GUEST_LISTS: { icon: FileText, color: "text-green-600 bg-green-50", label: "Liste" },
};

type SortKey = "createdAt_desc" | "startDate_asc" | "startDate_desc" | "participants_desc" | "fill_desc";
type TabKey = "all" | "upcoming" | "active" | "past" | "draft";

function buildOrderBy(sort: SortKey) {
  switch (sort) {
    case "startDate_asc": return { startDate: "asc" as const };
    case "startDate_desc": return { startDate: "desc" as const };
    default: return { createdAt: "desc" as const };
  }
}

function buildStatusFilter(tab: TabKey) {
  const now = new Date();
  switch (tab) {
    case "upcoming": return { status: "PUBLISHED", startDate: { gt: now } };
    case "active": return { status: "PUBLISHED", startDate: { lte: now }, endDate: { gte: now } };
    case "past": return { OR: [{ status: "CLOSED" }, { endDate: { lt: now }, status: "PUBLISHED" }] };
    case "draft": return { status: "DRAFT" };
    default: return {};
  }
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; type?: string; sort?: string; view?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId ?? "";
  const params = await searchParams;

  const q = params.q ?? "";
  const tab = (params.tab ?? "all") as TabKey;
  const typeFilter = params.type ?? "";
  const sort = (params.sort ?? "createdAt_desc") as SortKey;
  const view = (params.view ?? "list") as "list" | "grid";

  const where = {
    organizationId: orgId,
    ...buildStatusFilter(tab),
    ...(typeFilter ? { eventType: typeFilter } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { clientName: { contains: q, mode: "insensitive" as const } },
        { city: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  let events = await prisma.event.findMany({
    where,
    orderBy: buildOrderBy(sort),
    include: {
      _count: { select: { registrations: true, checkIns: true } },
      plugins: { where: { enabled: true }, select: { pluginType: true } },
      kpiSnapshots: { orderBy: { takenAt: "desc" }, take: 1, select: { score: true } },
      groups: { select: { name: true, color: true }, orderBy: { order: "asc" } },
    },
  });

  if (sort === "participants_desc") {
    events = events.sort((a, b) => b._count.registrations - a._count.registrations);
  }
  if (sort === "fill_desc") {
    events = events.sort((a, b) => {
      const fa = a.capacity ? a._count.registrations / a.capacity : 0;
      const fb = b.capacity ? b._count.registrations / b.capacity : 0;
      return fb - fa;
    });
  }

  // Stats globali
  const allEvents = await prisma.event.findMany({
    where: { organizationId: orgId },
    select: { status: true, startDate: true, endDate: true },
  });
  const now = new Date();
  const stats = {
    total: allEvents.length,
    published: allEvents.filter((e) => e.status === "PUBLISHED").length,
    upcoming: allEvents.filter((e) => e.status === "PUBLISHED" && e.startDate && e.startDate > now).length,
    draft: allEvents.filter((e) => e.status === "DRAFT").length,
    totalParticipants: events.reduce((s, e) => s + e._count.registrations, 0),
  };

  // Score medio org
  const snapshots = await prisma.kpiSnapshot.findMany({
    where: { event: { organizationId: orgId } },
    orderBy: { takenAt: "desc" },
    take: 1,
    select: { score: true },
  });
  const avgScore = snapshots.length > 0 ? Math.round(snapshots[0].score) : null;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "Tutti", count: stats.total },
    { key: "upcoming", label: "Prossimi", count: stats.upcoming },
    { key: "active", label: "In corso" },
    { key: "past", label: "Passati" },
    { key: "draft", label: "Bozze", count: stats.draft },
  ];

  return (
    <DashboardLayout>
      <Header
        title="Eventi"
        subtitle={`${stats.total} eventi · ${stats.published} pubblicati`}
        actions={
          <Link href="/events/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nuovo Evento
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Totale eventi", value: stats.total, color: "text-gray-900", icon: Calendar },
            { label: "Pubblicati", value: stats.published, color: "text-green-600", icon: TrendingUp },
            { label: "Bozze", value: stats.draft, color: "text-gray-400", icon: FileText },
            {
              label: avgScore !== null ? `Score medio org` : "Partecipanti (vista)",
              value: avgScore !== null ? `${avgScore}/100` : stats.totalParticipants,
              color: avgScore !== null
                ? avgScore >= 75 ? "text-green-600" : avgScore >= 50 ? "text-yellow-600" : "text-red-600"
                : "text-blue-600",
              icon: BarChart3,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={`h-5 w-5 flex-shrink-0 ${s.color}`} />
                  <div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/events?tab=${t.key}${q ? `&q=${q}` : ""}${typeFilter ? `&type=${typeFilter}` : ""}${sort !== "createdAt_desc" ? `&sort=${sort}` : ""}${view !== "list" ? `&view=${view}` : ""}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {t.count}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Filters */}
        <Suspense>
          <EventsFilter view={view} hideStatus />
        </Suspense>

        {/* Results count */}
        {(q || typeFilter) && (
          <p className="text-sm text-gray-500">
            {events.length} risultat{events.length === 1 ? "o" : "i"} trovati
            {q ? ` per "${q}"` : ""}
          </p>
        )}

        {/* Empty state */}
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {q || typeFilter ? "Nessun evento corrisponde ai filtri" : `Nessun evento in questa sezione`}
              </p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                {q || typeFilter ? "Prova a modificare i criteri" : "Crea il tuo primo evento per iniziare"}
              </p>
              {!q && !typeFilter && tab === "all" && (
                <Link href="/events/new">
                  <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Crea evento</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : view === "grid" ? (
          // ── GRID VIEW ─────────────────────────────────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.map((event) => {
              const Icon = EVENT_TYPE_ICONS[event.eventType] ?? Calendar;
              const fillPct = event.capacity
                ? Math.min(Math.round((event._count.registrations / event.capacity) * 100), 100)
                : null;
              const score = event.kpiSnapshots[0]?.score ?? null;

              return (
                <div key={event.id} className="group relative">
                  <Link href={`/events/${event.id}`}>
                    <Card className="hover:shadow-md transition-all cursor-pointer h-full border-gray-200 hover:border-blue-200">
                      <CardContent className="p-5 flex flex-col gap-3 h-full">
                        <div className="flex items-start justify-between">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex items-center gap-2">
                            {score !== null && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreColor(score)}`}>
                                {Math.round(score)}
                              </span>
                            )}
                            <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                          </div>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 leading-tight mb-0.5">{event.title}</h3>
                          {event.clientName && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                              <Building className="h-3 w-3" />{event.clientName}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</p>
                        </div>

                        <div className="space-y-1.5 text-xs text-gray-500">
                          {event.startDate && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />{formatDate(event.startDate)}
                            </span>
                          )}
                          {(event.city || event.location) && (
                            <span className="flex items-center gap-1.5">
                              {event.online ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                              {event.online ? "Online" : (event.city || event.location)}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {event._count.registrations}{event.capacity ? ` / ${event.capacity}` : ""} partecipanti
                          </span>
                        </div>

                        {fillPct !== null && (
                          <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Riempimento</span><span>{fillPct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100">
                              <div
                                className={`h-1.5 rounded-full transition-all ${fillPct > 90 ? "bg-red-500" : fillPct > 70 ? "bg-orange-500" : "bg-blue-500"}`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {event.plugins.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {event.plugins.map((p) => {
                              const meta = PLUGIN_META[p.pluginType];
                              if (!meta) return null;
                              const PIcon = meta.icon;
                              return (
                                <span key={p.pluginType} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${meta.color}`}>
                                  <PIcon className="h-3 w-3" />{meta.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>

                  {/* Quick actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/events/${event.id}/edit`} onClick={(e) => e.stopPropagation()}>
                      <button className="h-7 w-7 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Edit className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── LIST VIEW ──────────────────────────────────────────────────────
          <div className="space-y-2">
            {events.map((event) => {
              const Icon = EVENT_TYPE_ICONS[event.eventType] ?? Calendar;
              const fillPct = event.capacity
                ? Math.min(Math.round((event._count.registrations / event.capacity) * 100), 100)
                : null;
              const score = event.kpiSnapshots[0]?.score ?? null;

              return (
                <Card key={event.id} className="hover:shadow-sm transition-all border-gray-200 hover:border-blue-200 group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <Link href={`/events/${event.id}`} className="hover:text-blue-600 transition-colors">
                              <h3 className="font-semibold text-gray-900 truncate leading-tight">{event.title}</h3>
                            </Link>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {event.clientName && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Building className="h-3 w-3" />{event.clientName}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</span>
                            </div>
                          </div>

                          {/* Score + Status */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {score !== null && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreColor(score)}`}>
                                {Math.round(score)}
                              </span>
                            )}
                            <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                          {event.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />{formatDate(event.startDate)}
                            </span>
                          )}
                          {(event.city || event.location || event.online) && (
                            <span className="flex items-center gap-1">
                              {event.online ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                              {event.online ? "Online" : (event.city || event.location)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {event._count.registrations}{event.capacity ? ` / ${event.capacity}` : ""}
                            {fillPct !== null && (
                              <span className={`ml-1 font-medium ${fillPct > 90 ? "text-red-500" : fillPct > 70 ? "text-orange-500" : "text-gray-500"}`}>
                                ({fillPct}%)
                              </span>
                            )}
                          </span>

                          {/* Plugins */}
                          {event.plugins.map((p) => {
                            const meta = PLUGIN_META[p.pluginType];
                            if (!meta) return null;
                            const PIcon = meta.icon;
                            return (
                              <span key={p.pluginType} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${meta.color}`}>
                                <PIcon className="h-3 w-3" />{meta.label}
                              </span>
                            );
                          })}

                          {/* Groups */}
                          {event.groups.length > 0 && event.groups[0].name !== "Tutti i partecipanti" && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Users className="h-3 w-3" />
                              {event.groups.length} grupp{event.groups.length === 1 ? "o" : "i"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/events/${event.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/participants?event=${event.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/events/${event.id}?tab=analytics`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/events/${event.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg text-xs gap-1">
                            Apri <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
