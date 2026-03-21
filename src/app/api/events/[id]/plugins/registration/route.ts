import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";

type RegistrationConfig = {
  mode: "PUBLIC" | "INVITE_ONLY";
  invitedEmails: string[];
};

function parseConfig(raw: string | null): RegistrationConfig {
  if (!raw) return { mode: "PUBLIC", invitedEmails: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<RegistrationConfig>;
    return {
      mode: parsed.mode === "INVITE_ONLY" ? "INVITE_ONLY" : "PUBLIC",
      invitedEmails: Array.isArray(parsed.invitedEmails) ? parsed.invitedEmails : [],
    };
  } catch {
    return { mode: "PUBLIC", invitedEmails: [] };
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "REGISTRATION" } },
  });
  return NextResponse.json(parseConfig(plugin?.config ?? null));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Partial<RegistrationConfig>;
  const config: RegistrationConfig = {
    mode: body.mode === "INVITE_ONLY" ? "INVITE_ONLY" : "PUBLIC",
    invitedEmails: (body.invitedEmails ?? []).map((e) => e.toLowerCase().trim()).filter(Boolean),
  };

  const plugin = await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "REGISTRATION" } },
    create: { eventId: id, pluginType: "REGISTRATION", enabled: true, config: JSON.stringify(config) },
    update: { enabled: true, config: JSON.stringify(config) },
  });

  return NextResponse.json(parseConfig(plugin.config));
}
