import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  Calendar, MapPin, Users, ArrowLeft, Edit, Trash2,
  Mail, QrCode, Download, CheckCircle2, Clock, XCircle, BarChart3,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime, getStatusColor, getStatusLabel, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: true, checkIns: true } },
      registrations: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!event) notFound();

  const stats = {
    total: event._count.registrations,
    confirmed: event.registrations.filter((r) => r.status === "CONFIRMED").length,
    pending: event.registrations.filter((r) => r.status === "PENDING").length,
    cancelled: event.registrations.filter((r) => r.status === "CANCELLED").length,
    checkedIn: event._count.checkIns,
    revenue: event.registrations.reduce((sum, r) => sum + (r.ticketPrice || 0), 0),
  };

  const fillPct = event.capacity
    ? Math.min(Math.round((stats.total / event.capacity) * 100), 100)
    : 0;

  const tags = event.tags ? JSON.parse(event.tags) as string[] : [];

  return (
    <DashboardLayout>
      <Header
        title={event.title}
        subtitle={event.location || "Evento"}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/events">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Modifica
            </Button>
            <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Info + Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
              {event.description && <p className="text-sm text-gray-600 mb-4">{event.description}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {event.startDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Inizio</p>
                      <p className="font-medium text-gray-900">{formatDateTime(event.startDate)}</p>
                    </div>
                  </div>
                )}
                {event.endDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Fine</p>
                      <p className="font-medium text-gray-900">{formatDateTime(event.endDate)}</p>
                    </div>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Luogo</p>
                      <p className="font-medium text-gray-900">{event.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Capienza</p>
                    <p className="font-medium text-gray-900">
                      {stats.total}{event.capacity ? ` / ${event.capacity}` : " iscritti"}
                    </p>
                  </div>
                </div>
              </div>
              {event.capacity && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Riempimento</span>
                    <span>{fillPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full transition-all ${fillPct > 90 ? "bg-red-500" : fillPct > 70 ? "bg-orange-500" : "bg-green-500"}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {[
              { label: "Confermati", value: stats.confirmed, icon: CheckCircle2, color: "text-green-600" },
              { label: "In Attesa", value: stats.pending, icon: Clock, color: "text-yellow-600" },
              { label: "Check-in", value: stats.checkedIn, icon: QrCode, color: "text-blue-600" },
              { label: "Entrate", value: formatCurrency(stats.revenue), icon: BarChart3, color: "text-purple-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3 flex items-center gap-3">
                  <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/participants?eventId=${event.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              Gestisci Partecipanti
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="h-4 w-4" />
            Invia Email
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="h-4 w-4" />
            Check-in QR
          </Button>
          <a href={`/api/participants/export?eventId=${event.id}`} download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Esporta Excel
            </Button>
          </a>
          <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:border-red-200">
            <Trash2 className="h-4 w-4" />
            Elimina
          </Button>
        </div>

        {/* Registrations table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Ultime Iscrizioni</CardTitle>
            <Link href={`/participants?eventId=${event.id}`}>
              <Button variant="ghost" size="sm" className="text-xs">Vedi tutte</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-100">
                  <tr>
                    {["Nome", "Email", "Azienda", "Stato", "Iscritto il"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {event.registrations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
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
                            <span className="font-medium text-gray-900">{reg.firstName} {reg.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{reg.email}</td>
                        <td className="px-4 py-3 text-gray-500">{reg.company || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(reg.status)}>{getStatusLabel(reg.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(reg.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
