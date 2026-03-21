import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";
import { sendEmail, buildCustomEmail } from "@/lib/email";

type DecideBody =
  | { action: "approve"; decisionNote?: string }
  | { action: "reject"; decisionNote: string }
  | { action: "modify"; payload: Record<string, unknown>; decisionNote?: string };

// POST /api/events/[id]/ai/proposals/[proposalId] — approve | reject | modify
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { orgId, userId } = auth;
  const { id: eventId, proposalId } = await params;

  const proposal = await prisma.agentProposal.findFirst({
    where: { id: proposalId, eventId, orgId },
  });
  if (!proposal) {
    return NextResponse.json({ error: "Proposta non trovata" }, { status: 404 });
  }
  if (proposal.status !== "PENDING") {
    return NextResponse.json({ error: "Proposta già processata" }, { status: 409 });
  }

  const body: DecideBody = await req.json();
  const { action } = body;

  if (action === "reject") {
    const note = (body as { action: "reject"; decisionNote: string }).decisionNote;
    if (!note || note.trim().length < 5) {
      return NextResponse.json({ error: "decisionNote obbligatoria per rifiuto" }, { status: 400 });
    }
    await prisma.agentProposal.update({
      where: { id: proposalId },
      data: {
        status: "REJECTED",
        decidedBy: userId,
        decidedAt: new Date(),
        decisionNote: note,
      },
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  // For "modify" — update payload then continue as approve
  let finalPayload = JSON.parse(proposal.payload) as Record<string, unknown>;
  if (action === "modify") {
    const newPayload = (body as { action: "modify"; payload: Record<string, unknown> }).payload;
    finalPayload = { ...finalPayload, ...newPayload };
    await prisma.agentProposal.update({
      where: { id: proposalId },
      data: { payload: JSON.stringify(finalPayload) },
    });
  }

  // Execute the action
  let result: Record<string, unknown> = {};
  try {
    result = await executeProposalAction(proposal.actionType, finalPayload, eventId, orgId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: `Esecuzione fallita: ${message}` }, { status: 500 });
  }

  // Mark approved + write action log
  const note = (body as { action: string; decisionNote?: string }).decisionNote;
  await prisma.agentProposal.update({
    where: { id: proposalId },
    data: {
      status: "APPROVED",
      decidedBy: userId,
      decidedAt: new Date(),
      decisionNote: note ?? null,
    },
  });

  await prisma.agentActionLog.create({
    data: {
      eventId,
      orgId,
      proposalId,
      agentType: proposal.agentType,
      actionType: proposal.actionType,
      executedBy: userId,
      payload: JSON.stringify(finalPayload),
      result: JSON.stringify(result),
    },
  });

  return NextResponse.json({ ok: true, status: "APPROVED", result });
}

// GET /api/events/[id]/ai/proposals/[proposalId] — proposal detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { id: eventId, proposalId } = await params;

  const proposal = await prisma.agentProposal.findFirst({
    where: { id: proposalId, eventId, orgId },
    include: { actionLogs: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!proposal) return NextResponse.json({ error: "Proposta non trovata" }, { status: 404 });

  return NextResponse.json({
    ...proposal,
    payload: JSON.parse(proposal.payload),
    diffPayload: proposal.diffPayload ? JSON.parse(proposal.diffPayload) : null,
  });
}

// PATCH /api/events/[id]/ai/proposals/[proposalId] — update payload only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { id: eventId, proposalId } = await params;

  const proposal = await prisma.agentProposal.findFirst({
    where: { id: proposalId, eventId, orgId, status: "PENDING" },
  });
  if (!proposal) return NextResponse.json({ error: "Proposta non trovata o già processata" }, { status: 404 });

  const body = await req.json();
  const current = JSON.parse(proposal.payload) as Record<string, unknown>;
  const merged = { ...current, ...(body.payload ?? {}) };

  const updated = await prisma.agentProposal.update({
    where: { id: proposalId },
    data: { payload: JSON.stringify(merged) },
  });

  return NextResponse.json({ ...updated, payload: merged });
}

// ── Action executors ──────────────────────────────────────────────────────────

async function executeProposalAction(
  actionType: string,
  payload: Record<string, unknown>,
  eventId: string,
  orgId: string
): Promise<Record<string, unknown>> {
  switch (actionType) {
    case "EMAIL_SEND":
      return executeEmailSend(payload, eventId, orgId);
    case "MASTERLIST_CHANGE":
      return executeMasterlistChange(payload, eventId, orgId);
    case "REPORT_GENERATE":
      // Report is already generated — approval = confirmation to share/export
      // Apply any masterlist changes embedded in the report payload
      return executeReportApproval(payload, eventId, orgId);
    case "FORM_CHANGE":
      return executeFormChange(payload, eventId, orgId);
    default:
      // FLOW_ACTION — placeholder
      return { executed: false, reason: `Action type ${actionType} not yet implemented` };
  }
}

async function executeEmailSend(
  payload: Record<string, unknown>,
  eventId: string,
  orgId: string
): Promise<Record<string, unknown>> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: orgId },
    select: { id: true, title: true, startDate: true },
  });
  if (!event) throw new Error("Evento non trovato");

  const statusFilter = (payload.statusFilter as string[]) ?? ["CONFIRMED", "PENDING"];
  const groupIds = payload.groupIds as string[] | undefined;

  const registrations = await prisma.registration.findMany({
    where: {
      eventId,
      status: { in: statusFilter },
      ...(groupIds?.length ? { groupId: { in: groupIds } } : {}),
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const subject = String(payload.subject ?? "");
  const body = String(payload.body ?? "");

  const results = await Promise.allSettled(
    registrations.map(async (reg) => {
      const { subject: resolvedSubject, html } = buildCustomEmail({
        firstName: reg.firstName,
        lastName: reg.lastName,
        eventTitle: event.title,
        subject,
        body,
      });
      const sent = await sendEmail({ to: reg.email, subject: resolvedSubject, html });
      await prisma.emailSendLog.create({
        data: {
          eventId,
          registrationId: reg.id,
          email: reg.email,
          subject,
          resendId: (sent as { id?: string })?.id ?? null,
          status: "SENT",
        },
      });
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent, failed, total: registrations.length };
}

async function executeReportApproval(
  payload: Record<string, unknown>,
  eventId: string,
  orgId: string
): Promise<Record<string, unknown>> {
  // Apply the embedded masterlist changes if any
  const masterlistChanges = payload.masterlistChanges as Array<{
    registrationId: string; field: string; after: string
  }> | undefined

  if (!masterlistChanges?.length) {
    return { approved: true, masterlistUpdated: 0 }
  }

  return executeMasterlistChange(
    { changes: masterlistChanges.map((c) => ({ registrationId: c.registrationId, field: c.field, newValue: c.after })) },
    eventId,
    orgId
  )
}

async function executeFormChange(
  payload: Record<string, unknown>,
  eventId: string,
  orgId: string
): Promise<Record<string, unknown>> {
  const fieldChanges = payload.fieldChanges as Array<{
    fieldId: string;
    field: string;
    after: string;
  }> | undefined;

  if (!Array.isArray(fieldChanges) || fieldChanges.length === 0) {
    return { updated: 0 };
  }

  const allowedFields = ["label", "type", "required", "placeholder", "options"];
  let updated = 0;

  for (const change of fieldChanges) {
    if (!allowedFields.includes(change.field)) continue;
    try {
      await prisma.formField.updateMany({
        where: { id: change.fieldId, eventId },
        data: {
          [change.field]: change.field === "required"
            ? change.after === "true" || change.after === "sì" || change.after === "si"
            : change.after,
        } as Parameters<typeof prisma.formField.updateMany>[0]["data"],
      });
      updated++;
    } catch {
      // skip invalid field updates
    }
  }

  void orgId;
  return { updated, total: fieldChanges.length };
}

async function executeMasterlistChange(
  payload: Record<string, unknown>,
  eventId: string,
  orgId: string
): Promise<Record<string, unknown>> {
  const changes = payload.changes as Array<{
    registrationId: string;
    field: string;
    newValue: string;
  }>;
  if (!Array.isArray(changes) || changes.length === 0) {
    return { updated: 0 };
  }

  // Verify all registrations belong to this event+org
  const ids = [...new Set(changes.map((c) => c.registrationId))];
  const regs = await prisma.registration.findMany({
    where: { id: { in: ids }, eventId },
    select: { id: true },
  });
  const validIds = new Set(regs.map((r) => r.id));

  let updated = 0;
  for (const change of changes) {
    if (!validIds.has(change.registrationId)) continue;
    // Only allow safe fields
    const allowedFields = ["status", "notes", "groupId", "company", "jobTitle"];
    if (!allowedFields.includes(change.field)) continue;
    await prisma.registration.update({
      where: { id: change.registrationId },
      data: { [change.field]: change.newValue } as Parameters<typeof prisma.registration.update>[0]["data"],
    });
    updated++;
  }

  void orgId; // validated via event ownership check above
  return { updated, total: changes.length };
}
