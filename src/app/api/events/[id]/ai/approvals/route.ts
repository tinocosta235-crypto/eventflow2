import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
type ApprovalAction = "EMAIL_SEND" | "FLOW_ACTION";

type ApprovalItem = {
  id: string;
  actionType: ApprovalAction;
  title: string;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  requestedBy: string;
  createdAt: string;
  decidedAt?: string;
  decisionNote?: string;
};

function parseConfig(raw: string): { items: ApprovalItem[] } {
  try {
    const parsed = JSON.parse(raw) as { items?: ApprovalItem[] };
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlanner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "AI_APPROVALS" } },
  });

  if (!plugin) return NextResponse.json({ items: [] });
  const config = parseConfig(plugin.config);
  const sorted = [...config.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ items: sorted });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlanner();
  if ("error" in result) return result.error;
  const { orgId, userId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const body = await req.json();
  if (body.actionType !== "EMAIL_SEND" && body.actionType !== "FLOW_ACTION") {
    return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
  }

  const plugin = await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "AI_APPROVALS" } },
    update: {},
    create: {
      eventId: id,
      pluginType: "AI_APPROVALS",
      enabled: true,
      config: JSON.stringify({ items: [] }),
    },
  });

  const config = parseConfig(plugin.config);
  const item: ApprovalItem = {
    id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actionType: body.actionType as ApprovalAction,
    title: String(body.title ?? "Invio email AI"),
    status: "PENDING",
    payload: (body.payload as Record<string, unknown>) ?? {},
    requestedBy: userId,
    createdAt: new Date().toISOString(),
  };

  const nextItems = [item, ...config.items].slice(0, 100);
  await prisma.eventPlugin.update({
    where: { id: plugin.id },
    data: { config: JSON.stringify({ items: nextItems }) },
  });

  return NextResponse.json(item, { status: 201 });
}
