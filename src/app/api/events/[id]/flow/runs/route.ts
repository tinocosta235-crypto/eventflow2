import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

type RuntimeRun = {
  id: string;
  at: string;
  eventId: string;
  trigger: string;
  registrationId?: string;
  executedNodes: string[];
  sentEmails: number;
  notes: string[];
};

function parseRuntime(raw: string | null): RuntimeRun[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { runs?: RuntimeRun[] };
    return Array.isArray(parsed.runs) ? parsed.runs : [];
  } catch {
    return [];
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
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW_RUNTIME" } },
  });
  return NextResponse.json({ runs: parseRuntime(plugin?.config ?? null) });
}
