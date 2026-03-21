import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";

type BadgeConfig = {
  enabled: boolean;
  eventTitleVisible: boolean;
  companyVisible: boolean;
  qrVisible: boolean;
  footerText: string;
};

const DEFAULT_CONFIG: BadgeConfig = {
  enabled: true,
  eventTitleVisible: true,
  companyVisible: true,
  qrVisible: true,
  footerText: "Powered by EventFlow",
};

function parseConfig(raw: string): BadgeConfig {
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<BadgeConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, title: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "BADGE_PRINT" } },
  });

  return NextResponse.json({
    ...parseConfig(plugin?.config ?? "{}"),
    eventTitle: event.title,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const body = await req.json();
  const config: BadgeConfig = {
    enabled: body.enabled !== false,
    eventTitleVisible: body.eventTitleVisible !== false,
    companyVisible: body.companyVisible !== false,
    qrVisible: body.qrVisible !== false,
    footerText: body.footerText ? String(body.footerText) : DEFAULT_CONFIG.footerText,
  };

  await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "BADGE_PRINT" } },
    update: { enabled: true, config: JSON.stringify(config) },
    create: { eventId: id, pluginType: "BADGE_PRINT", enabled: true, config: JSON.stringify(config) },
  });

  return NextResponse.json(config);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const body = await req.json();
  const registrationId = String(body.registrationId ?? "");
  if (!registrationId) {
    return NextResponse.json({ error: "registrationId obbligatorio" }, { status: 400 });
  }

  const reg = await prisma.registration.findFirst({
    where: { id: registrationId, eventId: id, event: { organizationId: orgId } },
    select: {
      registrationCode: true,
      firstName: true,
      lastName: true,
      company: true,
      event: { select: { title: true } },
    },
  });
  if (!reg) return NextResponse.json({ error: "Partecipante non trovato" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "BADGE_PRINT" } },
  });
  const config = parseConfig(plugin?.config ?? "{}");

  return NextResponse.json({
    config,
    badge: {
      fullName: `${reg.firstName} ${reg.lastName}`,
      company: reg.company,
      eventTitle: reg.event.title,
      registrationCode: reg.registrationCode,
      qrValue: reg.registrationCode,
    },
  });
}
