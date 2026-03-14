import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  Calendar, MapPin, Users, ArrowLeft, Edit, Mail, QrCode, Download,
  CheckCircle2, Clock, XCircle, BarChart3, Globe, Hotel, Plane,
  Phone, User, Euro, FileText, Info, FormInput, TrendingUp,
} from "lucide-react";
import AnalyticsClient from "./analytics/AnalyticsClient";
import HospitalityClient from "./HospitalityClient";
import TravelClient from "./TravelClient";
import GroupsClient from "./GroupsClient";
import Link from "next/link";
import {
  formatDate, formatDateTime, getStatusColor, getStatusLabel, formatCurrency,
} from "@/lib/utils";
import DeleteEventButton from "./DeleteEventButton";
import { EventStatusActions, DuplicateEventButton } from "./EventActions";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: true, checkIns: true } },
      registrations: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!event) notFound();

  const confirmed = event.registrations.filter((r) => r.status === "CONFIRMED");
  const pending = event.registrations.filter((r) => r.status === "PENDING");
  const cancelled = event.registrations.filter((r) => r.status === "CANCELLED");
  const waitlist = event.registrations.filter((r) => r.status === "WAITLIST");

  const stats = {
    total: event._count.registrations,
    confirmed: confirmed.length,
    pending: pending.length,
    cancelled: cancelled.length,
    waitlist: waitlist.length,
    checkedIn: event._count.checkIns,
    revenue: event.registrations.reduce((sum, r) => sum + (r.ticketPrice ?? 0), 0),
  };

  const fillPct = event.capacity
    ? Math.min(Math.round((stats.total / event.capacity) * 100), 100)
    : 0;

  const tags = event.tags ? (JSON.parse(event.tags) as string[]) : [];

  return (
    <DashboardLayout>
      <Header
        title={event.title}
        subtitle={
          event.online
            ? "Evento online"
            : [event.location, event.city].filter(Boolean).join(" · ") || "Evento"
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/events">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </Button>
            </Link>
            <Link href={`/events/${event.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Modifica
              </Button>
            </Link>
            <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Confermati", value: stats.confirmed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { label: "In attesa", value: stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Check-in", value: stats.checkedIn, icon: QrCode, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Entrate", value: formatCurrency(stats.revenue), icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Capacity bar */}
        {event.capacity && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">
                  Riempimento — {stats.total} / {event.capacity} posti
                </span>
                <span className={`font-semibold ${fillPct > 90 ? "text-red-600" : fillPct > 70 ? "text-orange-600" : "text-green-600"}`}>
                  {fillPct}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div
                  className={`h-3 rounded-full transition-all ${fillPct > 90 ? "bg-red-500" : fillPct > 70 ? "bg-orange-500" : "bg-green-500"}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              {stats.waitlist > 0 && (
                <p className="text-xs text-purple-600 mt-1">{stats.waitlist} in lista d&apos;attesa</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab navigation */}
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="overview" className="gap-1.5">
              <Info className="h-3.5 w-3.5" />Panoramica
            </TabsTrigger>
            <TabsTrigger value="participants" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />Partecipanti
              {stats.total > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />Analytics
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />Gruppi
            </TabsTrigger>
            <TabsTrigger value="logistics" className="gap-1.5">
              <Hotel className="h-3.5 w-3.5" />Logistica
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />Gestione
            </TabsTrigger>
          </TabsList>

          {/* ── PANORAMICA ── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Info principale */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />Informazioni evento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  {event.description && (
                    <p className="text-gray-600 leading-relaxed">{event.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {event.startDate && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-400 text-xs">Inizio</p>
                          <p className="font-medium text-gray-900">{formatDateTime(event.startDate)}</p>
                        </div>
                      </div>
                    )}
                    {event.endDate && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-400 text-xs">Fine</p>
                          <p className="font-medium text-gray-900">{formatDateTime(event.endDate)}</p>
                        </div>
                      </div>
                    )}
                    {event.online ? (
                      <div className="flex items-start gap-2">
                        <Globe className="h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-400 text-xs">Modalità</p>
                          <p className="font-medium text-gray-900">Online</p>
                          {event.onlineUrl && (
                            <a href={event.onlineUrl} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate block max-w-[160px]">
                              {event.onlineUrl}
                            </a>
                          )}
                        </div>
                      </div>
                    ) : event.location ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-400 text-xs">Luogo</p>
                          <p className="font-medium text-gray-900">{event.location}</p>
                          {event.city && <p className="text-gray-500 text-xs">{event.city}{event.country ? `, ${event.country}` : ""}</p>}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Capienza</p>
                        <p className="font-medium text-gray-900">
                          {event.capacity ? `${event.capacity} posti` : "Illimitata"}
                        </p>
                      </div>
                    </div>
                    {event.website && (
                      <div className="flex items-start gap-2">
                        <Globe className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-400 text-xs">Sito web</p>
                          <a href={event.website} target="_blank" rel="noreferrer"
                            className="text-blue-600 hover:underline text-xs font-medium">
                            {event.website}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Organizzazione + Budget */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />Segreteria e budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {event.organizerName && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Responsabile</p>
                        <p className="font-medium text-gray-900">{event.organizerName}</p>
                      </div>
                    </div>
                  )}
                  {event.organizerEmail && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Email</p>
                        <a href={`mailto:${event.organizerEmail}`} className="text-blue-600 hover:underline font-medium">
                          {event.organizerEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {event.organizerPhone && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Telefono</p>
                        <p className="font-medium text-gray-900">{event.organizerPhone}</p>
                      </div>
                    </div>
                  )}
                  {(event.budgetEstimated || event.budgetActual) && (
                    <div className="flex gap-4 pt-2 border-t border-gray-100">
                      {event.budgetEstimated && (
                        <div className="flex items-start gap-2">
                          <Euro className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-400 text-xs">Budget stimato</p>
                            <p className="font-medium text-gray-900">{formatCurrency(event.budgetEstimated)}</p>
                          </div>
                        </div>
                      )}
                      {event.budgetActual && (
                        <div className="flex items-start gap-2">
                          <Euro className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-400 text-xs">Budget effettivo</p>
                            <p className="font-medium text-gray-900">{formatCurrency(event.budgetActual)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {event.secretariatNotes && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
                      <p className="font-medium text-gray-700 mb-1">Note segreteria</p>
                      {event.secretariatNotes}
                    </div>
                  )}
                  {!event.organizerName && !event.budgetEstimated && !event.secretariatNotes && (
                    <p className="text-gray-400 text-sm">Nessuna informazione organizzativa inserita.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── PARTECIPANTI ── */}
          <TabsContent value="participants" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Partecipanti ({stats.total})</CardTitle>
                <div className="flex gap-2">
                  <Link href={`/participants?eventId=${event.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Users className="h-4 w-4" />
                      Gestisci tutti
                    </Button>
                  </Link>
                  <a href={`/api/participants/export?eventId=${event.id}`} download>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Esporta
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mini stats */}
                <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
                  {[
                    { label: "Confermati", value: stats.confirmed, color: "text-green-600 bg-green-50" },
                    { label: "In attesa", value: stats.pending, color: "text-yellow-600 bg-yellow-50" },
                    { label: "Annullati", value: stats.cancelled, color: "text-red-600 bg-red-50" },
                    { label: "Lista attesa", value: stats.waitlist, color: "text-purple-600 bg-purple-50" },
                  ].map((s) => (
                    <div key={s.label} className="p-3 text-center border-r border-gray-100 last:border-r-0">
                      <p className={`text-lg font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Partecipante", "Email", "Azienda", "Stato", "Pagamento", "Iscritto il"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {event.registrations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Nessuna iscrizione ancora
                          </td>
                        </tr>
                      ) : (
                        event.registrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {reg.firstName[0]}{reg.lastName[0]}
                                </div>
                                <span className="font-medium text-gray-900">
                                  {reg.firstName} {reg.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{reg.email}</td>
                            <td className="px-4 py-3 text-gray-500">{reg.company ?? "—"}</td>
                            <td className="px-4 py-3">
                              <Badge className={getStatusColor(reg.status)}>{getStatusLabel(reg.status)}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {reg.paymentStatus ? (
                                <Badge className={getStatusColor(reg.paymentStatus)}>
                                  {getStatusLabel(reg.paymentStatus)}
                                </Badge>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(reg.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {event.registrations.length > 0 && (
                  <div className="p-4 border-t border-gray-100 text-center">
                    <Link href={`/participants?eventId=${event.id}`}>
                      <Button variant="ghost" size="sm" className="gap-2 text-blue-600">
                        Vedi tutti i partecipanti <Users className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── LOGISTICA ── */}
          <TabsContent value="logistics" className="mt-4 space-y-6">
            {/* Venue (static) */}
            {!event.online && (event.location || event.city || event.venueSetup) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />Venue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {event.location && <div><span className="text-gray-500">Location:</span> <span className="font-medium">{event.location}</span></div>}
                  {event.city && <div><span className="text-gray-500">Città:</span> <span className="font-medium">{event.city}{event.country ? `, ${event.country}` : ""}</span></div>}
                  {event.venueSetup && <div><span className="text-gray-500">Setup sala:</span> <span className="font-medium">{event.venueSetup}</span></div>}
                  {event.venueNotes && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mt-2">{event.venueNotes}</div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Alloggio — dynamic */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Hotel className="h-4 w-4 text-purple-500" />Gestione alloggio
              </h3>
              <HospitalityClient eventId={event.id} />
            </div>

            {/* Trasporti — dynamic */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Plane className="h-4 w-4 text-orange-500" />Gestione trasporti
              </h3>
              <TravelClient eventId={event.id} />
            </div>
          </TabsContent>

          {/* ── GESTIONE ── */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            {/* Azioni rapide */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Azioni rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Link href={`/participants?eventId=${event.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Users className="h-4 w-4" />Gestisci partecipanti
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Mail className="h-4 w-4" />Invia email
                  </Button>
                  <Link href={`/events/${event.id}/checkin`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <QrCode className="h-4 w-4" />Check-in QR
                    </Button>
                  </Link>
                  <a href={`/api/participants/export?eventId=${event.id}`} download>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />Esporta Excel
                    </Button>
                  </a>
                  <Link href={`/events/${event.id}/masterlist`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />Masterlist
                    </Button>
                  </Link>
                  <Link href={`/events/${event.id}/form`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FormInput className="h-4 w-4" />Form iscrizione
                    </Button>
                  </Link>
                  <Link href={`/events/${event.id}/emails`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Mail className="h-4 w-4" />Email
                    </Button>
                  </Link>
                  <DuplicateEventButton eventId={event.id} />
                </div>
              </CardContent>
            </Card>

            {/* Cambio stato */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Gestione stato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Stato attuale:</span>
                  <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                </div>
                <div className="flex flex-wrap gap-3">
                  <EventStatusActions eventId={event.id} currentStatus={event.status} />
                </div>
              </CardContent>
            </Card>

            {/* Zona pericolosa */}
            <Card className="border-red-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />Zona pericolosa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">
                  L&apos;eliminazione dell&apos;evento rimuove definitivamente tutti i dati, iscrizioni e configurazioni associate.
                </p>
                <DeleteEventButton eventId={event.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── GRUPPI ── */}
          <TabsContent value="groups" className="mt-4 space-y-4">
            <GroupsClient eventId={event.id} />
          </TabsContent>

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics" className="mt-4">
            <AnalyticsClient eventId={event.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
