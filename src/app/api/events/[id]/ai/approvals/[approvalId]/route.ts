import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";
import { buildCustomEmail, sendEmail } from "@/lib/email";

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

async function executeEmailAction(eventId: string, payload: Record<string, unknown>) {
  const mode = String(payload.mode ?? "status_filter");

  const statuses = Array.isArray(payload.statusFilter)
    ? (payload.statusFilter as string[])
    : ["CONFIRMED", "PENDING"];

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });
  if (!event) return { sent: 0 };

  const subject = String(payload.subject ?? "");
  const body = String(payload.body ?? "");
  if (!subject || !body) return { sent: 0 };

  if (mode === "single_registration") {
    const registrationId = String(payload.registrationId ?? "");
    if (!registrationId) return { sent: 0 };
    const reg = await prisma.registration.findFirst({
      where: { id: registrationId, eventId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!reg) return { sent: 0 };

    await sendEmail({
      to: reg.email,
      ...buildCustomEmail({
        firstName: reg.firstName,
        lastName: reg.lastName,
        eventTitle: event.title,
        subject,
        body,
      }),
    }).catch(() => null);

    await prisma.emailSendLog.create({
      data: {
        eventId,
        registrationId: reg.id,
        email: reg.email,
        subject,
        status: "SENT",
      },
    }).catch(() => null);

    return { sent: 1 };
  }

  const recipients = await prisma.registration.findMany({
    where: { eventId, status: { in: statuses } },
    select: { id: true, email: true, firstName: true, lastName: true },
    take: 1000,
  });

  await Promise.all(
    recipients.map((reg) =>
      sendEmail({
        to: reg.email,
        ...buildCustomEmail({
          firstName: reg.firstName,
          lastName: reg.lastName,
          eventTitle: event.title,
          subject,
          body,
        }),
      })
        .then(() =>
          prisma.emailSendLog.create({
            data: {
              eventId,
              registrationId: reg.id,
              email: reg.email,
              subject,
              status: "SENT",
            },
          })
        )
        .catch(() => null)
    )
  );

  return { sent: recipients.length };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  const result = await requirePlanner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id, approvalId } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "AI_APPROVALS" } },
  });
  if (!plugin) return NextResponse.json({ error: "Coda approvazioni non trovata" }, { status: 404 });

  const body = await req.json();
  const decision = body.decision === "REJECT" ? "REJECTED" : "APPROVED";
  const note = body.note ? String(body.note) : undefined;

  const config = parseConfig(plugin.config);
  const target = config.items.find((item) => item.id === approvalId);
  if (!target) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
  if (target.status !== "PENDING") {
    return NextResponse.json({ error: "Richiesta già processata" }, { status: 409 });
  }

  let sent = 0;
  if (decision === "APPROVED" && target.actionType === "EMAIL_SEND") {
    const exec = await executeEmailAction(id, target.payload);
    sent = exec.sent;
  }
  if (decision === "APPROVED" && target.actionType === "FLOW_ACTION") {
    await prisma.emailSendLog.create({
      data: {
        eventId: id,
        email: "flow-approval@eventflow.local",
        subject: `[FLOW_APPROVED] ${target.title}`,
        status: "SENT",
      },
    }).catch(() => null);
  }

  const now = new Date().toISOString();
  const updatedItems = config.items.map((item) =>
    item.id === approvalId
      ? { ...item, status: decision, decidedAt: now, decisionNote: note }
      : item
  );
  await prisma.eventPlugin.update({
    where: { id: plugin.id },
    data: { config: JSON.stringify({ items: updatedItems }) },
  });

  return NextResponse.json({ success: true, decision, sent });
}
