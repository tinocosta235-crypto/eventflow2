import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";
import { runEventFlowTrigger } from "@/lib/event-flow-runtime";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const trigger = String(body.trigger ?? "");
  const registrationId = body.registrationId ? String(body.registrationId) : undefined;
  if (!trigger) return NextResponse.json({ error: "trigger obbligatorio" }, { status: 400 });

  const run = await runEventFlowTrigger({
    eventId: id,
    trigger,
    registrationId,
    payload: { source: "manual_test" },
    force: true, // bypass PUBLISHED check for manual tests
  });

  if (!run) {
    return NextResponse.json({
      success: false,
      error: "Nessun flow trovato. Salva il flow prima di testarlo.",
    }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    trigger,
    registrationId: registrationId ?? null,
    run: {
      id: run.id,
      executedNodes: run.executedNodes,
      sentEmails: run.sentEmails,
      notes: run.notes,
    },
  });
}
