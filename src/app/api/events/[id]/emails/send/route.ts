import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";
import { sendEmail, buildCustomEmail, buildEventReminderEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

// POST /api/events/[id]/emails/send
// body: { templateId?, subject?, body?, type: "custom" | "reminder", statusFilter?: string[] }
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
  const { templateId, type = "custom", statusFilter } = body;

  // Determine recipients
  const statusWhere = statusFilter?.length
    ? { status: { in: statusFilter as string[] } }
    : { status: { in: ["CONFIRMED", "PENDING"] } };

  const registrations = await prisma.registration.findMany({
    where: { eventId: id, ...statusWhere },
    select: { id: true, firstName: true, lastName: true, email: true, registrationCode: true },
  });

  if (!registrations.length) {
    return NextResponse.json({ error: "Nessun destinatario trovato" }, { status: 400 });
  }

  const eventDate = event.startDate ? formatDateTime(event.startDate) : "";
  const eventLocation = event.online
    ? (event.onlineUrl ?? "Evento online")
    : [event.location, event.city].filter(Boolean).join(", ") || undefined;

  let subject: string;
  let templateBody: string;

  if (templateId) {
    const tmpl = await prisma.emailTemplate.findFirst({
      where: { id: templateId, eventId: id },
    });
    if (!tmpl) return NextResponse.json({ error: "Template non trovato" }, { status: 404 });
    subject = tmpl.subject;
    templateBody = tmpl.body;
  } else if (type === "reminder") {
    // Send reminder using built-in template
    const sends = registrations.map((reg) =>
      sendEmail({
        to: reg.email,
        ...buildEventReminderEmail({
          firstName: reg.firstName,
          eventTitle: event.title,
          eventDate,
          eventLocation,
          onlineUrl: event.onlineUrl ?? undefined,
          registrationCode: reg.registrationCode,
        }),
      }).catch(console.error)
    );
    await Promise.all(sends);
    return NextResponse.json({ sent: registrations.length });
  } else {
    subject = body.subject;
    templateBody = body.body;
    if (!subject || !templateBody) {
      return NextResponse.json({ error: "Oggetto e corpo richiesti" }, { status: 400 });
    }
  }

  // Send personalized emails
  const sends = registrations.map((reg) =>
    sendEmail({
      to: reg.email,
      ...buildCustomEmail({
        firstName: reg.firstName,
        lastName: reg.lastName,
        eventTitle: event.title,
        subject,
        body: templateBody,
      }),
    }).catch(console.error)
  );
  await Promise.all(sends);

  return NextResponse.json({ sent: registrations.length });
}
