import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { Users, Calendar, TrendingUp, Euro, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [events, registrations] = await Promise.all([
    prisma.event.findMany({
      include: { _count: { select: { registrations: true, checkIns: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.registration.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const revenue = registrations.filter((r) => r.paymentStatus === "PAID").reduce((s, r) => s + (r.ticketPrice || 0), 0);
  const confirmed = registrations.filter((r) => r.status === "CONFIRMED").length;
  const checkedIn = registrations.filter((r) => r.checkedInAt).length;
  const conversionRate = registrations.length > 0 ? Math.round((confirmed / registrations.length) * 100) : 0;

  // Group registrations by date (last 30 days)
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const byDate: Record<string, number> = {};
  registrations.filter((r) => new Date(r.createdAt) >= thirtyDaysAgo).forEach((r) => {
    const d = new Date(r.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
    byDate[d] = (byDate[d] || 0) + 1;
  });
  const maxPerDay = Math.max(...Object.values(byDate), 1);

  const topEvents = events.slice(0, 5);

  return (
    <DashboardLayout>
      <Header title="Analytics" subtitle="Statistiche e performance degli eventi" />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Iscrizioni Totali", value: registrations.length, icon: Users, color: "blue" },
            { label: "Entrate Totali", value: formatCurrency(revenue), icon: Euro, color: "purple" },
            { label: "Tasso Conversione", value: `${conversionRate}%`, icon: TrendingUp, color: "green" },
            { label: "Check-in Effettuati", value: checkedIn, icon: CheckCircle2, color: "orange" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <div className={`h-10 w-10 rounded-xl bg-${color}-50 flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 text-${color}-600`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Registrations over time (mini bar chart) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Iscrizioni — Ultimi 30 giorni</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(byDate).length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Nessuna iscrizione negli ultimi 30 giorni</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {Object.entries(byDate).slice(-20).map(([date, count]) => (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500 rounded-sm hover:bg-blue-600 transition-colors cursor-default"
                        style={{ height: `${(count / maxPerDay) * 100}%` }}
                        title={`${date}: ${count}`}
                      />
                      <span className="text-[9px] text-gray-400 rotate-45 origin-left">{date}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuzione Stato Iscrizioni</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Confermati", status: "CONFIRMED", color: "bg-green-500" },
                { label: "In Attesa", status: "PENDING", color: "bg-yellow-500" },
                { label: "Lista Attesa", status: "WAITLIST", color: "bg-purple-500" },
                { label: "Annullati", status: "CANCELLED", color: "bg-red-500" },
              ].map(({ label, status, color }) => {
                const count = registrations.filter((r) => r.status === status).length;
                const pct = registrations.length > 0 ? Math.round((count / registrations.length) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-medium text-gray-900">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Events performance */}
        <Card>
          <CardHeader><CardTitle className="text-base">Performance per Evento</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  {["Evento", "Data", "Iscritti", "Capienza", "Riempimento", "Check-in"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topEvents.map((ev) => {
                  const fill = ev.capacity ? Math.round((ev._count.registrations / ev.capacity) * 100) : null;
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{ev.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(ev.startDate)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{ev._count.registrations}</td>
                      <td className="px-4 py-3 text-gray-500">{ev.capacity ?? "—"}</td>
                      <td className="px-4 py-3">
                        {fill !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 w-20">
                              <div className={`h-1.5 rounded-full ${fill > 90 ? "bg-red-500" : fill > 70 ? "bg-orange-500" : "bg-green-500"}`} style={{ width: `${Math.min(fill, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{fill}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{ev._count.checkIns}</td>
                    </tr>
                  );
                })}
                {topEvents.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nessun evento</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
