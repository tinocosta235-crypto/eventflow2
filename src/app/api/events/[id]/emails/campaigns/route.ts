// GET /api/events/[id]/emails/campaigns
// Aggrega i log di invio per campagna (subject) con metriche open/click/bounce
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/auth-helpers";

export type CampaignMetrics = {
  subject: string;
  templateId: string | null;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;   // 0-100
  clickRate: number;  // 0-100
  bounceRate: number; // 0-100
  firstSentAt: string;
  lastSentAt: string;
  // Chi non ha aperto (per azioni agente)
  unopenedCount: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrg("VIEWER");
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { id: eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  // Raggruppa per subject (campagna) + templateId
  const groups = await prisma.emailSendLog.groupBy({
    by: ["subject", "templateId"],
    where: { eventId },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const campaigns: CampaignMetrics[] = await Promise.all(
    groups.map(async (g) => {
      const where = { eventId, subject: g.subject, templateId: g.templateId };

      const [opened, clicked, bounced, dates, unopened] = await Promise.all([
        prisma.emailSendLog.count({ where: { ...where, openedAt: { not: null } } }),
        prisma.emailSendLog.count({ where: { ...where, clickedAt: { not: null } } }),
        prisma.emailSendLog.count({ where: { ...where, bouncedAt: { not: null } } }),
        prisma.emailSendLog.aggregate({
          where,
          _min: { sentAt: true },
          _max: { sentAt: true },
        }),
        prisma.emailSendLog.count({ where: { ...where, openedAt: null } }),
      ]);

      const sent = g._count.id;
      return {
        subject: g.subject,
        templateId: g.templateId,
        sent,
        opened,
        clicked,
        bounced,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
        unopenedCount: unopened,
        firstSentAt: dates._min.sentAt?.toISOString() ?? "",
        lastSentAt: dates._max.sentAt?.toISOString() ?? "",
      };
    })
  );

  // Totali aggregati
  const totals = {
    totalSent: campaigns.reduce((s, c) => s + c.sent, 0),
    totalOpened: campaigns.reduce((s, c) => s + c.opened, 0),
    totalClicked: campaigns.reduce((s, c) => s + c.clicked, 0),
    totalBounced: campaigns.reduce((s, c) => s + c.bounced, 0),
  };
  const avgOpenRate =
    totals.totalSent > 0 ? Math.round((totals.totalOpened / totals.totalSent) * 100) : 0;
  const avgClickRate =
    totals.totalSent > 0 ? Math.round((totals.totalClicked / totals.totalSent) * 100) : 0;

  return NextResponse.json({ campaigns, totals: { ...totals, avgOpenRate, avgClickRate } });
}
