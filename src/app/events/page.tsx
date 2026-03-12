import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { Calendar, MapPin, Users, Plus, Eye, BarChart3 } from "lucide-react";
import Link from "next/link";
import { formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { registrations: true } },
    },
  });

  const statusGroups = {
    all: events.length,
    published: events.filter((e) => e.status === "PUBLISHED").length,
    draft: events.filter((e) => e.status === "DRAFT").length,
    closed: events.filter((e) => e.status === "CLOSED" || e.status === "CANCELLED").length,
  };

  const gradients = [
    "from-blue-500 via-indigo-500 to-purple-600",
    "from-emerald-500 via-teal-500 to-cyan-600",
    "from-orange-500 via-rose-500 to-pink-600",
    "from-violet-500 via-purple-500 to-indigo-600",
    "from-amber-500 via-orange-500 to-red-600",
    "from-teal-500 via-cyan-500 to-blue-600",
  ];

  return (
    <DashboardLayout>
      <Header
        title="Gestione Eventi"
        subtitle="Crea e gestisci tutti i tuoi eventi"
        actions={
          <Link href="/events/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Crea Evento
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: "all", label: "Tutti", count: statusGroups.all },
            { key: "published", label: "Pubblicati", count: statusGroups.published },
            { key: "draft", label: "Bozze", count: statusGroups.draft },
            { key: "closed", label: "Chiusi", count: statusGroups.closed },
          ].map((tab, i) => (
            <button
              key={tab.key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                i === 0 ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${i === 0 ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event, i) => {
            const gradient = gradients[i % gradients.length];
            const fill = event.capacity
              ? Math.min(Math.round((event._count.registrations / event.capacity) * 100), 100)
              : 0;
            const tags = event.tags ? JSON.parse(event.tags) as string[] : [];

            return (
              <Card key={event.id} className="hover:shadow-md transition-all overflow-hidden">
                <div className={`h-36 bg-gradient-to-br ${gradient} relative`}>
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute top-3 right-3">
                    <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                  </div>
                  {tags.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
                      {tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-black/30 text-white px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">{event.title}</h3>
                  {event.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{event.description}</p>
                  )}

                  <div className="space-y-1.5 mb-4">
                    {event.startDate && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        {formatDate(event.startDate)}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <span>{event._count.registrations}{event.capacity ? ` / ${event.capacity}` : ""} iscritti</span>
                      {event.capacity && (
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${fill}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/events/${event.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        Gestisci
                      </Button>
                    </Link>
                    <Link href={`/analytics?eventId=${event.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Stats
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* New Event Card */}
          <Link href="/events/new">
            <Card className="hover:shadow-md transition-all border-dashed border-2 border-gray-200 hover:border-blue-300 cursor-pointer h-full min-h-[280px]">
              <CardContent className="p-4 h-full flex flex-col items-center justify-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Plus className="h-7 w-7 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-700">Crea Nuovo Evento</p>
                  <p className="text-sm text-gray-400 mt-1">O usa Phorma AI</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
