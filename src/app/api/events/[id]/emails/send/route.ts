import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";
import { sendEmail, sendEmailBatch, buildCustomEmail, buildEventReminderEmail, buildUnsubscribeUrl } from "@/lib/email";
import { resolveOrgFromAddress } from "@/lib/email-sender";
import { formatDateTime } from "@/lib/utils";
import { runEventFlowTrigger } from "@/lib/event-flow-runtime";

const BATCH_SIZE = 100; // Resend batch API limit

// Split array into chunks
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// POST /api/events/[id]/emails/send
// body:
// {
//   templateId?, subject?, body?, type: "custom" | "reminder",
//   statusFilter?: string[],
//   deliveryMode?: "MANUAL" | "CONDITIONAL",
//   conditions?: { statuses?: string[], groupIds?: string[], createdAfter?: string, createdBefore?: string },
//   dryRun?: boolean
// }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true, title: true, startDate: true,
      location: true, city: true, online: true, onlineUrl: true,
      organizerEmail: true,
    },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const body = await req.json();
  const { templateId, type = "custom", statusFilter, deliveryMode, conditions, dryRun, recipientType, specificEmail, includeUnsubscribe } = body;

  // ── Resolve recipients ─────────────────────────────────────────────────────
  let registrations: Array<{ id: string | null; firstName: string; lastName: string; email: string; registrationCode: string | null; unsubscribedAt: Date | null }> = [];

  if (recipientType === "specific" && typeof specificEmail === "string" && specificEmail.includes("@")) {
    // Single specific recipient — may or may not be a registered participant
    const existing = await prisma.registration.findFirst({
      where: { eventId: id, email: specificEmail },
      select: { id: true, firstName: true, lastName: true, email: true, registrationCode: true, unsubscribedAt: true },
    });
    registrations = existing
      ? [existing]
      : [{ id: null, firstName: "Ospite", lastName: "", email: specificEmail, registrationCode: null, unsubscribedAt: null }];
  } else if (recipientType === "internal") {
    // Send to organizer email
    registrations = [{
      id: null,
      firstName: "Team",
      lastName: "",
      email: event.organizerEmail ?? result.userId,
      registrationCode: null,
      unsubscribedAt: null,
    }];
    // Resolve organizer email from org admin if not set on event
    if (!event.organizerEmail) {
      const adminUser = await prisma.user.findFirst({
        where: { organizations: { some: { id: orgId } } },
        select: { email: true, name: true },
      });
      if (adminUser?.email) {
        registrations = [{ id: null, firstName: adminUser.name ?? "Admin", lastName: "", email: adminUser.email, registrationCode: null, unsubscribedAt: null }];
      }
    }
  } else {
    // Default: filter guest list by status / group / date
    const statuses =
      (Array.isArray(conditions?.statuses) && conditions.statuses.length
        ? conditions.statuses
        : Array.isArray(statusFilter) && statusFilter.length
          ? statusFilter
          : ["CONFIRMED", "PENDING"]) as string[];

    const where: {
      eventId: string;
      status: { in: string[] };
      groupId?: { in: string[] };
      createdAt?: { gte?: Date; lte?: Date };
    } = { eventId: id, status: { in: statuses } };

    if (Array.isArray(conditions?.groupIds) && conditions.groupIds.length) {
      where.groupId = { in: conditions.groupIds };
    }
    if (conditions?.createdAfter || conditions?.createdBefore) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (conditions.createdAfter) createdAt.gte = new Date(String(conditions.createdAfter));
      if (conditions.createdBefore) createdAt.lte = new Date(String(conditions.createdBefore));
      where.createdAt = createdAt;
    }

    registrations = await prisma.registration.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, registrationCode: true, unsubscribedAt: true },
    });
  }

  // Filter out unsubscribed registrations
  registrations = registrations.filter((r) => !r.unsubscribedAt);

  if (!registrations.length) {
    return NextResponse.json({ error: "Nessun destinatario trovato" }, { status: 400 });
  }

  const eventDate = event.startDate ? formatDateTime(event.startDate) : "";
  const eventLocation = event.online
    ? (event.onlineUrl ?? "Evento online")
    : [event.location, event.city].filter(Boolean).join(", ") || undefined;

  if (dryRun) {
    return NextResponse.json({
      sent: 0,
      matched: registrations.length,
      dryRun: true,
      deliveryMode: deliveryMode ?? "MANUAL",
    });
  }

  let subject: string;
  let templateBody: string;

  let shouldIncludeUnsub = Boolean(includeUnsubscribe);

  if (templateId) {
    const tmpl = await prisma.emailTemplate.findFirst({
      where: { id: templateId, eventId: id },
    });
    if (!tmpl) return NextResponse.json({ error: "Template non trovato" }, { status: 404 });
    subject = tmpl.subject;
    templateBody = tmpl.body;
    // Template's own flag overrides body flag (OR logic)
    shouldIncludeUnsub = shouldIncludeUnsub || tmpl.includeUnsubscribe;
  } else if (type === "reminder") {
    const reminderSubject = `Promemoria: ${event.title}`;
    const fromAddress = await resolveOrgFromAddress(orgId);

    // Build all email payloads
    const emailPayloads = registrations.map((reg) => {
      const unsubscribeUrl = (shouldIncludeUnsub && reg.id) ? buildUnsubscribeUrl(reg.id) : undefined;
      const { html } = buildEventReminderEmail({
        firstName: reg.firstName,
        eventTitle: event.title,
        eventDate,
        eventLocation,
        onlineUrl: event.onlineUrl ?? undefined,
        registrationCode: reg.registrationCode ?? undefined,
        unsubscribeUrl,
      });
      return { reg, html };
    });

    // Send in sequential batches of 100
    const batches = chunk(emailPayloads, BATCH_SIZE);
    const allResults: Array<{ id: string | null }> = [];
    for (const batch of batches) {
      const results = await sendEmailBatch(
        batch.map((p) => ({ to: p.reg.email, subject: reminderSubject, html: p.html, from: fromAddress }))
      );
      allResults.push(...results);
    }

    // Log all sends in bulk
    await prisma.emailSendLog.createMany({
      data: emailPayloads.map((p, i) => ({
        eventId: id,
        registrationId: p.reg.id ?? undefined,
        email: p.reg.email,
        subject: reminderSubject,
        resendId: allResults[i]?.id ?? null,
        status: "SENT",
      })),
      skipDuplicates: true,
    });

    // Trigger flow (cap at 50 to avoid timeout)
    await Promise.all(
      registrations.slice(0, 50).map((reg) =>
        runEventFlowTrigger({ eventId: id, trigger: "email_sent", registrationId: reg.id ?? undefined, payload: { type: "reminder" } }).catch(() => null)
      )
    );
    return NextResponse.json({ sent: registrations.length });
  } else {
    subject = body.subject;
    templateBody = body.body;
    if (!subject || !templateBody) {
      return NextResponse.json({ error: "Oggetto e corpo richiesti" }, { status: 400 });
    }
  }

  // Build all email payloads first
  const fromAddress = await resolveOrgFromAddress(orgId);
  const emailPayloads = registrations.map((reg) => {
    const unsubscribeUrl = (shouldIncludeUnsub && reg.id) ? buildUnsubscribeUrl(reg.id) : undefined;
    const { subject: resolvedSubject, html } = buildCustomEmail({
      firstName: reg.firstName,
      lastName: reg.lastName,
      eventTitle: event.title,
      subject,
      body: templateBody,
      unsubscribeUrl,
    });
    return { reg, html, resolvedSubject };
  });

  // Send in sequential batches of 100 (Resend Batch API limit)
  const batches = chunk(emailPayloads, BATCH_SIZE);
  const allResults: Array<{ id: string | null }> = [];
  for (const batch of batches) {
    const results = await sendEmailBatch(
      batch.map((p) => ({ to: p.reg.email, subject: p.resolvedSubject, html: p.html, from: fromAddress }))
    );
    allResults.push(...results);
  }

  // Log all sends in bulk
  await prisma.emailSendLog.createMany({
    data: emailPayloads.map((p, i) => ({
      eventId: id,
      registrationId: p.reg.id ?? undefined,
      email: p.reg.email,
      subject: emailPayloads[i].resolvedSubject,
      templateId: templateId ?? null,
      resendId: allResults[i]?.id ?? null,
      status: "SENT",
    })),
    skipDuplicates: true,
  });

  // Trigger flow (cap at 50)
  await Promise.all(
    registrations.slice(0, 50).map((reg) =>
      runEventFlowTrigger({ eventId: id, trigger: "email_sent", registrationId: reg.id ?? undefined, payload: { templateId: templateId ?? null, type } }).catch(() => null)
    )
  );

  return NextResponse.json({ sent: registrations.length });
}
