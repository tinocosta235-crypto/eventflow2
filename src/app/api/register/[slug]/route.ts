import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils";
import {
  sendEmail,
  buildRegistrationConfirmationEmail,
  buildWaitlistConfirmationEmail,
  buildCustomEmail,
} from "@/lib/email";
import { formatDateTime } from "@/lib/utils";
import { runEventFlowTrigger } from "@/lib/event-flow-runtime";
import {
  parseRegistrationPathsConfig,
  resolveRegistrationPathByGroup,
  resolveRegistrationPathById,
} from "@/lib/registration-paths";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true, title: true, description: true, slug: true,
      startDate: true, endDate: true, location: true, city: true, country: true,
      online: true, onlineUrl: true, capacity: true, currentCount: true,
      status: true, eventType: true, coverImage: true, website: true,
      formFields: { orderBy: { order: "asc" } },
      groups: { orderBy: { order: "asc" }, select: { id: true, name: true, color: true } },
      plugins: { where: { enabled: true }, select: { pluginType: true, config: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  if (event.status !== "PUBLISHED") return NextResponse.json({ error: "Evento non disponibile" }, { status: 403 });

  return NextResponse.json({ ...event, isFull: event.capacity != null && event.currentCount >= event.capacity });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true, title: true, status: true, capacity: true, currentCount: true,
      startDate: true, location: true, city: true, online: true, onlineUrl: true,
      organizerEmail: true, organizerName: true,
    },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  if (event.status !== "PUBLISHED") return NextResponse.json({ error: "Registrazioni non aperte" }, { status: 403 });

  const body = await req.json();
  const { firstName, lastName, email, phone, company, jobTitle, groupId, pathId, customFields, sessionSelections } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "Nome, cognome e email sono obbligatori" }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const registrationPlugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: event.id, pluginType: "REGISTRATION" } },
  });
  if (registrationPlugin?.config) {
    try {
      const parsed = JSON.parse(registrationPlugin.config) as { mode?: string; invitedEmails?: string[] };
      if (parsed.mode === "INVITE_ONLY") {
        const invited = (parsed.invitedEmails ?? []).map((e) => e.toLowerCase().trim());
        if (!invited.includes(normalizedEmail)) {
          return NextResponse.json({ error: "Registrazione riservata a utenti invitati" }, { status: 403 });
        }
      }
    } catch {
      // ignore malformed config
    }
  }

  let validGroupId: string | null = null;
  const groups = await prisma.eventGroup.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  const pathsPlugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: event.id, pluginType: "REGISTRATION_PATHS" } },
  });
  const registrationPaths = parseRegistrationPathsConfig(pathsPlugin?.config ?? null, groups).paths;
  const selectedPath = resolveRegistrationPathById(registrationPaths, typeof pathId === "string" ? pathId : null);

  if (groupId) {
    const group = await prisma.eventGroup.findFirst({ where: { id: groupId, eventId: event.id } });
    if (!group) return NextResponse.json({ error: "Gruppo non valido" }, { status: 400 });
    validGroupId = group.id;
  } else if (selectedPath?.groupId) {
    validGroupId = selectedPath.groupId;
  }

  const isFull = event.capacity != null && event.currentCount >= event.capacity;
  const status = isFull ? "WAITLIST" : "PENDING";

  try {
    const reg = await prisma.registration.create({
      data: {
        eventId: event.id,
        registrationCode: generateCode("REG"),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone: phone || null,
        company: company || null,
        jobTitle: jobTitle || null,
        groupId: validGroupId,
        notes:
          Array.isArray(sessionSelections) && sessionSelections.length > 0
            ? `Sessioni selezionate: ${(sessionSelections as string[]).join(", ")}`
            : null,
        source: "public_form",
        status,
        paymentStatus: "FREE",
      },
    });

    if (customFields && typeof customFields === "object") {
      const fieldEntries = Object.entries(customFields) as [string, string][];
      await Promise.all(
        fieldEntries
          .filter(([, v]) => v != null && v !== "")
          .map(([fieldId, value]) =>
            prisma.registrationField.create({
              data: { registrationId: reg.id, fieldId, value: String(value) },
            }).catch(() => null)
          )
      );
    }

    if (status !== "WAITLIST") {
      await prisma.event.update({ where: { id: event.id }, data: { currentCount: { increment: 1 } } });
    }

    runEventFlowTrigger({
      eventId: event.id,
      trigger: "registration_submitted",
      registrationId: reg.id,
      payload: { source: "public_form", status },
    }).catch(console.error);

    runEventFlowTrigger({
      eventId: event.id,
      trigger: "guest_status_updated",
      registrationId: reg.id,
      payload: { status },
    }).catch(console.error);

    // Fire-and-forget email
    const eventDate = event.startDate ? formatDateTime(event.startDate) : undefined;
    const eventLocation = event.online
      ? (event.onlineUrl ? `Online — ${event.onlineUrl}` : "Evento online")
      : [event.location, event.city].filter(Boolean).join(", ") || undefined;

    const resolvedPath = selectedPath ?? resolveRegistrationPathByGroup(registrationPaths, validGroupId);
    const pathTemplateId = status === "WAITLIST"
      ? resolvedPath?.emailTemplateIds.waitlistTemplateId
      : resolvedPath?.emailTemplateIds.confirmationTemplateId;
    const pathTemplate = pathTemplateId
      ? await prisma.emailTemplate.findFirst({
          where: { id: pathTemplateId, eventId: event.id },
          select: { subject: true, body: true },
        })
      : null;

    if (pathTemplate) {
      sendEmail({
        to: reg.email,
        ...buildCustomEmail({
          firstName: reg.firstName,
          lastName: reg.lastName,
          eventTitle: event.title,
          subject: pathTemplate.subject,
          body: pathTemplate.body,
        }),
      }).catch(console.error);
    } else if (status === "WAITLIST") {
      sendEmail({
        to: reg.email,
        ...buildWaitlistConfirmationEmail({
          firstName: reg.firstName,
          eventTitle: event.title,
          registrationCode: reg.registrationCode,
        }),
      }).catch(console.error);
    } else {
      sendEmail({
        to: reg.email,
        ...buildRegistrationConfirmationEmail({
          firstName: reg.firstName,
          lastName: reg.lastName,
          email: reg.email,
          eventTitle: event.title,
          eventDate,
          eventLocation,
          registrationCode: reg.registrationCode,
          organizerEmail: event.organizerEmail ?? undefined,
        }),
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      status,
      registrationCode: reg.registrationCode,
      message: status === "WAITLIST"
        ? "Sei stato aggiunto alla lista d'attesa."
        : "Registrazione completata con successo!",
    }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Sei già registrato a questo evento con questa email." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Errore durante la registrazione" }, { status: 500 });
  }
}
