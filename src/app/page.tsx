import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import {
  Calendar, Users, TrendingUp, Euro, ArrowUpRight,
  ArrowRight, Plus, Zap, CheckCircle2, Clock,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalEvents, totalRegistrations, upcomingEvents, recentRegistrations] = await Promise.all([
    prisma.event.count(),
    prisma.registration.count({ where: { status: "CONFIRMED" } }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 5,
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.registration.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { event: { select: { title: true } } },
    }),
  ]);

  const revenue = await prisma.registration.aggregate({
    _sum: { ticketPrice: true },
    where: { paymentStatus: "PAID" },
  });

  const stats = [
    { label: "Eventi Totali", value: totalEvents, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", change: "+2 questo mese" },
    { label: "Partecipanti Confermati", value: totalRegistrations, icon: Users, color: "text-green-600", bg: "bg-green-50", change: "+18% vs mese scorso" },
    { label: "Entrate Totali", value: formatCurrency(revenue._sum.ticketPrice ?? 0), icon: Euro, color: "text-purple-600", bg: "bg-purple-50", change: "Da biglietti venduti" },
    { label: "Tasso Conversione", value: "73%", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50", change: "+5% rispetto al target" },
  ];

  return (
    <DashboardLayout>
      <Header
        title="Dashboard"
        subtitle={`Benvenuto! Oggi è ${new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}`}
        actions={
          <Link href="/events/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Evento
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                <p className="text-xs text-green-600 mt-1 font-medium">{s.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Upcoming Events */}
          <Card className="xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Prossimi Eventi</CardTitle>
              <Link href="/events">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Vedi tutti <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nessun evento in programma</p>
                  <Link href="/events/new">
                    <Button size="sm" className="mt-3 gap-2">
                      <Plus className="h-4 w-4" /> Crea il primo evento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingEvents.map((event) => {
                    const fill = event.capacity
                      ? Math.min(Math.round((event._count.registrations / event.capacity) * 100), 100)
                      : 0;
                    return (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                            <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(event.startDate)}</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event._count.registrations}{event.capacity ? ` / ${event.capacity}` : ""}</span>
                          </div>
                          {event.capacity && (
                            <div className="mt-2 h-1 rounded-full bg-gray-100">
                              <div className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${fill}%` }} />
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Registrations */}
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Iscrizioni Recenti</CardTitle>
              <Link href="/participants">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Tutte <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              {recentRegistrations.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">Nessuna iscrizione</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentRegistrations.map((reg) => (
                    <div key={reg.id} className="px-5 py-2.5 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {reg.firstName[0]}{reg.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{reg.firstName} {reg.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{reg.event.title}</p>
                      </div>
                      {reg.status === "CONFIRMED"
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        : <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Phorma CTA */}
        <Card className="border-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white overflow-hidden relative">
          <div className="absolute right-6 top-0 h-full flex items-center opacity-10">
            <Zap className="h-32 w-32" />
          </div>
          <CardContent className="p-6 flex items-center justify-between relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-300" />
                <span className="font-semibold text-lg">Phorma AI</span>
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">Nuovo</span>
              </div>
              <p className="text-blue-100 text-sm max-w-md">
                Crea landing page e moduli di iscrizione professionali in pochi secondi con l&apos;intelligenza artificiale.
              </p>
            </div>
            <Link href="/phorma">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold gap-2 flex-shrink-0">
                Prova Phorma <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
