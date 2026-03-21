import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { BarChart3, CheckCircle2, MailOpen, Target, TrendingUp, Users } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [events, registrations, emailLogs] = await Promise.all([
    prisma.event.findMany({
      include: { _count: { select: { registrations: true, checkIns: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.registration.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.emailSendLog.findMany({ orderBy: { sentAt: "desc" } }),
  ]);

  const now = new Date();
  const revenue = registrations
    .filter((r) => r.paymentStatus === "PAID")
    .reduce((sum, r) => sum + (r.ticketPrice || 0), 0);
  const confirmed = registrations.filter((r) => r.status === "CONFIRMED").length;
  const checkedIn = registrations.filter((r) => r.checkedInAt).length;
  const registrationRate = registrations.length > 0 ? Math.round((confirmed / registrations.length) * 100) : 0;
  const openRate = emailLogs.length > 0
    ? Math.round((emailLogs.filter((l) => l.openedAt).length / emailLogs.length) * 100)
    : 0;

  const eventsByStatus = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});
  const upcomingEvents = events.filter((e) => e.startDate && e.startDate >= now).length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const byDate: Record<string, number> = {};
  registrations
    .filter((r) => new Date(r.createdAt) >= thirtyDaysAgo)
    .forEach((r) => {
      const day = new Date(r.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
      byDate[day] = (byDate[day] ?? 0) + 1;
    });
  const maxPerDay = Math.max(...Object.values(byDate), 1);

  return (
    <DashboardLayout>
      <Header title="Analytics & Investor Board" subtitle="KPI operativi e vista board-ready per la beta" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          {[
            { label: "Eventi totali", value: events.length, icon: BarChart3, tone: "from-cyan-500/20 to-cyan-500/5 text-cyan-200" },
            { label: "Prossimi eventi", value: upcomingEvents, icon: TrendingUp, tone: "from-blue-500/20 to-blue-500/5 text-blue-200" },
            { label: "Partecipanti gestiti", value: registrations.length, icon: Users, tone: "from-emerald-500/20 to-emerald-500/5 text-emerald-200" },
            { label: "Open rate medio", value: `${openRate}%`, icon: MailOpen, tone: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-200" },
            { label: "Registration rate", value: `${registrationRate}%`, icon: Target, tone: "from-amber-500/20 to-amber-500/5 text-amber-200" },
            { label: "Check-in totali", value: checkedIn, icon: CheckCircle2, tone: "from-green-500/20 to-green-500/5 text-green-200" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="border-white/10 bg-slate-950/45">
              <CardContent className="p-4">
                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center mb-2`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-semibold text-slate-100">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-cyan-400/20 bg-slate-950/55">
          <CardHeader>
            <CardTitle className="text-base text-cyan-100">Investor Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-slate-400">Revenue registrato</p>
              <p className="text-xl font-semibold text-slate-100">{formatCurrency(revenue)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-slate-400">Eventi per status</p>
              <p className="text-sm text-slate-200 mt-1">
                Draft: {eventsByStatus.DRAFT ?? 0} · Published: {eventsByStatus.PUBLISHED ?? 0} · Completed: {eventsByStatus.COMPLETED ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-slate-400">Efficienza funnel</p>
              <p className="text-sm text-slate-200 mt-1">
                Confirmed: {confirmed} / {registrations.length} · Open rate: {openRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="border-white/10 bg-slate-950/45">
            <CardHeader><CardTitle className="text-base text-slate-100">Iscrizioni - ultimi 30 giorni</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(byDate).length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Nessuna iscrizione negli ultimi 30 giorni</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {Object.entries(byDate).slice(-20).map(([date, count]) => (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-cyan-500 rounded-sm hover:bg-cyan-400 transition-colors"
                        style={{ height: `${(count / maxPerDay) * 100}%` }}
                        title={`${date}: ${count}`}
                      />
                      <span className="text-[9px] text-slate-500 rotate-45 origin-left">{date}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/45">
            <CardHeader><CardTitle className="text-base text-slate-100">Distribuzione stato iscrizioni</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Confermati", status: "CONFIRMED", color: "bg-green-500" },
                { label: "In attesa", status: "PENDING", color: "bg-yellow-500" },
                { label: "Lista attesa", status: "WAITLIST", color: "bg-purple-500" },
                { label: "Annullati", status: "CANCELLED", color: "bg-red-500" },
              ].map(({ label, status, color }) => {
                const count = registrations.filter((r) => r.status === status).length;
                const pct = registrations.length > 0 ? Math.round((count / registrations.length) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-medium text-slate-100">{count} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-slate-950/45">
          <CardHeader><CardTitle className="text-base text-slate-100">Performance evento</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/70 border-y border-white/10">
                <tr>
                  {["Evento", "Data", "Iscritti", "Capienza", "Riempimento", "Check-in"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.slice(0, 8).map((ev) => {
                  const fill = ev.capacity ? Math.round((ev._count.registrations / ev.capacity) * 100) : null;
                  return (
                    <tr key={ev.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-slate-100 max-w-[220px] truncate">{ev.title}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(ev.startDate)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{ev._count.registrations}</td>
                      <td className="px-4 py-3 text-slate-400">{ev.capacity ?? "—"}</td>
                      <td className="px-4 py-3">
                        {fill !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-800 w-20">
                              <div
                                className={`h-1.5 rounded-full ${fill > 90 ? "bg-red-500" : fill > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(fill, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">{fill}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-100 font-medium">{ev._count.checkIns}</td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nessun evento</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
