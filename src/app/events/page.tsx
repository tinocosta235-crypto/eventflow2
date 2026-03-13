import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  Calendar, MapPin, Users, Plus, Globe, Mic2, Building2, Monitor,
  UtensilsCrossed, Store, Rocket, Network, Blend,
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

type SortKey = "createdAt_desc" | "startDate_asc" | "startDate_desc" | "participants_desc" | "fill_desc";

function buildOrderBy(sort: SortKey) {
  switch (sort) {
    case "startDate_asc": return { startDate: "asc" as const };
    case "startDate_desc": return { startDate: "desc" as const };
    default: return { createdAt: "desc" as const };
  }
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; sort?: string; view?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId ?? "";
  const params = await searchParams;

  const q = params.q ?? "";
  const statusFilter = params.status ?? "";
  const typeFilter = params.type ?? "";
  const sort = (params.sort ?? "createdAt_desc") as SortKey;
  const view = (params.view ?? "list") as "list" | "grid";

  const where = {
    organizationId: orgId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { eventType: typeFilter } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  let events = await prisma.event.findMany({
    where,
    orderBy: buildOrderBy(sort),
    include: { _count: { select: { registrations: true, checkIns: true } } },
  });

  // Client-side sorts that need computed fields
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

  const allEvents = await prisma.event.findMany({
    where: { organizationId: orgId },
    select: { status: true },
  });

  const stats = {
    total: allEvents.length,
    published: allEvents.filter((e) => e.status === "PUBLISHED").length,
    draft: allEvents.filter((e) => e.status === "DRAFT").length,
    totalParticipants: events.reduce((s, e) => s + e._count.registrations, 0),
  };

  return (
    <DashboardLayout>
      <Header
        title="Eventi"
        subtitle={`${stats.total} eventi totali · ${stats.published} pubblicati`}
        actions={
          <Link href="/events/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Evento
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Totale", value: stats.total, color: "text-gray-900" },
            { label: "Pubblicati", value: stats.published, color: "text-green-600" },
            { label: "Bozze", value: stats.draft, color: "text-gray-500" },
            { label: "Partecipanti (filtrati)", value: stats.totalParticipants, color: "text-blue-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Suspense>
          <EventsFilter view={view} />
        </Suspense>

        {/* Results count */}
        {(q || statusFilter || typeFilter) && (
          <p className="text-sm text-gray-500">
            {events.length} risultat{events.length === 1 ? "o" : "i"} trovati
            {q ? ` per "${q}"` : ""}
          </p>
        )}

        {/* Events */}
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {q || statusFilter || typeFilter ? "Nessun evento corrisponde ai filtri" : "Nessun evento ancora"}
              </p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                {q || statusFilter || typeFilter ? "Prova a modificare i criteri di ricerca" : "Crea il tuo primo evento per iniziare"}
              </p>
              {!q && !statusFilter && !typeFilter && (
                <Link href="/events/new">
                  <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Crea evento</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.map((event) => {
              const Icon = EVENT_TYPE_ICONS[event.eventType] ?? Calendar;
              const fillPct = event.capacity
                ? Math.min(Math.round((event._count.registrations / event.capacity) * 100), 100)
                : null;
              const tags = event.tags ? (JSON.parse(event.tags) as string[]) : [];

              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                    <CardContent className="p-5 flex flex-col gap-3 h-full">
                      <div className="flex items-start justify-between">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 leading-tight mb-1">{event.title}</h3>
                        <p className="text-xs text-gray-400 mb-2">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</p>
                        {event.description && (
                          <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      <div className="space-y-2 text-xs text-gray-500">
                        {event.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />{formatDate(event.startDate)}
                          </span>
                        )}
                        {(event.city || event.location) && (
                          <span className="flex items-center gap-1">
                            {event.online ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                            {event.online ? "Online" : (event.city || event.location)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
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
                              className={`h-1.5 rounded-full ${fillPct > 90 ? "bg-red-500" : fillPct > 70 ? "bg-orange-500" : "bg-blue-500"}`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const Icon = EVENT_TYPE_ICONS[event.eventType] ?? Calendar;
              const fillPct = event.capacity
                ? Math.min(Math.round((event._count.registrations / event.capacity) * 100), 100)
                : null;
              const tags = event.tags ? (JSON.parse(event.tags) as string[]) : [];

              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                              <p className="text-xs text-gray-400 mt-0.5">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</p>
                            </div>
                            <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                            {event.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(event.startDate)}
                              </span>
                            )}
                            {(event.city || event.location) && (
                              <span className="flex items-center gap-1">
                                {event.online ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                                {event.online ? "Online" : (event.city || event.location)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {event._count.registrations}{event.capacity ? ` / ${event.capacity}` : ""} partecipanti
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                            {fillPct !== null && (
                              <div className="flex items-center gap-2 flex-1 max-w-40">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                                  <div
                                    className={`h-1.5 rounded-full ${fillPct > 90 ? "bg-red-500" : fillPct > 70 ? "bg-orange-500" : "bg-blue-500"}`}
                                    style={{ width: `${fillPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400">{fillPct}%</span>
                              </div>
                            )}
                            {event.accommodationNeeded && (
                              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">🏨 Alloggio</span>
                            )}
                            {event.travelNeeded && (
                              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">✈️ Viaggio</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
