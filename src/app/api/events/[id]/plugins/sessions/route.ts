import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";

type SessionItem = {
  id: string;
  title: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  groupId: string | null;
};

type SessionsConfig = {
  enabled: boolean;
  sessions: SessionItem[];
};

function parseConfig(raw: string | null): SessionsConfig {
  if (!raw) return { enabled: false, sessions: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<SessionsConfig>;
    return {
      enabled: !!parsed.enabled,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { enabled: false, sessions: [] };
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "SESSIONS" } },
  });
  return NextResponse.json(parseConfig(plugin?.config ?? null));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Partial<SessionsConfig>;
  const config: SessionsConfig = {
    enabled: !!body.enabled,
    sessions: (body.sessions ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      capacity: s.capacity ?? null,
      waitlistEnabled: !!s.waitlistEnabled,
      groupId: s.groupId ?? null,
    })),
  };

  const plugin = await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "SESSIONS" } },
    create: { eventId: id, pluginType: "SESSIONS", enabled: config.enabled, config: JSON.stringify(config) },
    update: { enabled: config.enabled, config: JSON.stringify(config) },
  });

  return NextResponse.json(parseConfig(plugin.config));
}
