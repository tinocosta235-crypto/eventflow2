import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

type FlowPolicy = {
  approveFirstCritical: boolean;
};

function parsePolicy(raw: string | null): FlowPolicy {
  if (!raw) return { approveFirstCritical: false };
  try {
    const parsed = JSON.parse(raw) as Partial<FlowPolicy>;
    return { approveFirstCritical: parsed.approveFirstCritical === true };
  } catch {
    return { approveFirstCritical: false };
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW_POLICY" } },
  });
  return NextResponse.json(parsePolicy(plugin?.config ?? null));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const policy: FlowPolicy = { approveFirstCritical: body.approveFirstCritical === true };

  await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW_POLICY" } },
    create: {
      eventId: id,
      pluginType: "EVENT_FLOW_POLICY",
      enabled: true,
      config: JSON.stringify(policy),
    },
    update: {
      enabled: true,
      config: JSON.stringify(policy),
    },
  });

  return NextResponse.json(policy);
}
