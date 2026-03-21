import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg, requirePlanner } from "@/lib/auth-helpers";
import {
  parseRegistrationPathsConfig,
  serializeRegistrationPathsConfig,
  type RegistrationPath,
} from "@/lib/registration-paths";

type EventParams = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: EventParams) {
  const auth = await requireOrg("VIEWER");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: {
      id: true,
      groups: { orderBy: { order: "asc" }, select: { id: true, name: true } },
      plugins: {
        where: { pluginType: "REGISTRATION_PATHS" },
        select: { config: true },
        take: 1,
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const config = parseRegistrationPathsConfig(event.plugins[0]?.config ?? null, event.groups);
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest, { params }: EventParams) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: {
      id: true,
      groups: { orderBy: { order: "asc" }, select: { id: true, name: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const nextPaths = Array.isArray(body.paths) ? body.paths as RegistrationPath[] : [];
  const config = parseRegistrationPathsConfig(
    JSON.stringify({ version: 1, paths: nextPaths }),
    event.groups
  );

  await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "REGISTRATION_PATHS" } },
    create: {
      eventId: id,
      pluginType: "REGISTRATION_PATHS",
      enabled: true,
      config: serializeRegistrationPathsConfig(config),
    },
    update: {
      enabled: true,
      config: serializeRegistrationPathsConfig(config),
    },
  });

  return NextResponse.json(config);
}
