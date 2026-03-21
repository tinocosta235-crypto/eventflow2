import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

export type AgentType =
  | "SCORE_MONITOR"
  | "EMAIL_DRAFT"
  | "REPORT"
  | "EMAIL_TRACKER"
  | "FORM_AUDIT";

export type ActionType =
  | "EMAIL_SEND"
  | "MASTERLIST_CHANGE"
  | "REPORT_GENERATE"
  | "FLOW_ACTION"
  | "FORM_CHANGE";

export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type AgentProposalRow = {
  id: string;
  eventId: string;
  orgId: string;
  agentType: AgentType;
  actionType: ActionType;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  diffPayload: Record<string, unknown> | null;
  status: ProposalStatus;
  scheduledAt: string | null;
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatRow(r: {
  id: string;
  eventId: string;
  orgId: string;
  agentType: string;
  actionType: string;
  title: string;
  summary: string | null;
  payload: string;
  diffPayload: string | null;
  status: string;
  scheduledAt: Date | null;
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AgentProposalRow {
  return {
    ...r,
    agentType: r.agentType as AgentType,
    actionType: r.actionType as ActionType,
    status: r.status as ProposalStatus,
    payload: JSON.parse(r.payload),
    diffPayload: r.diffPayload ? JSON.parse(r.diffPayload) : null,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// GET /api/events/[id]/ai/proposals?status=PENDING
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { id: eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const proposals = await prisma.agentProposal.findMany({
    where: {
      eventId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ proposals: proposals.map(formatRow) });
}

// POST /api/events/[id]/ai/proposals — create a new proposal (called by agent routes)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { orgId, userId } = auth;
  const { id: eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const body = await req.json();
  const { agentType, actionType, title, summary, payload, diffPayload, scheduledAt } = body;

  if (!agentType || !actionType || !title) {
    return NextResponse.json({ error: "agentType, actionType e title sono obbligatori" }, { status: 400 });
  }

  const proposal = await prisma.agentProposal.create({
    data: {
      eventId,
      orgId,
      agentType: String(agentType),
      actionType: String(actionType),
      title: String(title),
      summary: summary ? String(summary) : null,
      payload: JSON.stringify(payload ?? {}),
      diffPayload: diffPayload ? JSON.stringify(diffPayload) : null,
      status: "PENDING",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      requestedBy: userId,
    },
  });

  return NextResponse.json(formatRow(proposal), { status: 201 });
}
