import { prisma } from "@/lib/db";
import { createDefaultBuilderPayload, serializeBuilderPayload, type EmailBuilderPayload } from "@/lib/email-builder";

type DefaultTemplate = {
  type: string;
  name: string;
  subject: string;
  payload: EmailBuilderPayload;
};

function makePayload(params: {
  eventTitle: string;
  title: string;
  content: string;
  buttonLabel?: string;
  buttonHref?: string;
  statuses?: string[];
}) {
  const payload = createDefaultBuilderPayload(params.eventTitle);
  payload.blocks = [
    {
      id: "intro",
      kind: "text",
      title: params.title,
      content: params.content,
    },
    ...(params.buttonLabel && params.buttonHref
      ? [{ id: "cta", kind: "button", label: params.buttonLabel, href: params.buttonHref } as const]
      : []),
  ];
  payload.audience = {
    statuses: params.statuses ?? ["CONFIRMED", "PENDING"],
    groupIds: [],
  };
  payload.status = "APPROVED";
  payload.versions = [{ at: new Date().toISOString(), status: "APPROVED", note: "Template predefinito" }];
  return payload;
}

function defaultTemplates(eventTitle: string): DefaultTemplate[] {
  return [
    {
      type: "INVITE",
      name: "Invito evento",
      subject: `Invito ufficiale — ${eventTitle}`,
      payload: makePayload({
        eventTitle,
        title: "Sei invitato",
        content: "Ciao {{firstName}},\n\nsei invitato a {{eventTitle}}. Conferma la tua partecipazione dal pulsante qui sotto.",
        buttonLabel: "Registrati ora",
        buttonHref: "https://eventflow.app",
        statuses: ["PENDING"],
      }),
    },
    {
      type: "REG_CONFIRMATION",
      name: "Conferma registrazione",
      subject: `Registrazione confermata — ${eventTitle}`,
      payload: makePayload({
        eventTitle,
        title: "Registrazione confermata",
        content: "Ciao {{firstName}},\n\nla tua registrazione per {{eventTitle}} è confermata. Riceverai i prossimi aggiornamenti via email.",
        statuses: ["CONFIRMED"],
      }),
    },
    {
      type: "WAITLIST_CONFIRMATION",
      name: "Conferma lista d'attesa",
      subject: `Sei in lista d'attesa — ${eventTitle}`,
      payload: makePayload({
        eventTitle,
        title: "Lista d'attesa",
        content: "Ciao {{firstName}},\n\nal momento non ci sono posti disponibili per {{eventTitle}}. Ti avviseremo appena si libera un posto.",
        statuses: ["WAITLIST"],
      }),
    },
    {
      type: "WAITLIST_PROMOTION",
      name: "Promozione da lista d'attesa",
      subject: `Posto confermato — ${eventTitle}`,
      payload: makePayload({
        eventTitle,
        title: "Ottime notizie",
        content: "Ciao {{firstName}},\n\nsi è liberato un posto per {{eventTitle}}. La tua partecipazione è ora confermata.",
        statuses: ["WAITLIST"],
      }),
    },
    {
      type: "REMINDER",
      name: "Promemoria evento",
      subject: `Promemoria — ${eventTitle}`,
      payload: makePayload({
        eventTitle,
        title: "Promemoria",
        content: "Ciao {{firstName}},\n\nti ricordiamo che {{eventTitle}} si avvicina. Ti aspettiamo!",
        statuses: ["CONFIRMED", "PENDING"],
      }),
    },
    {
      type: "UPDATE",
      name: "Aggiornamento evento",
      subject: `Aggiornamento importante — ${eventTitle}`,
      payload: makePayload({
        eventTitle,
        title: "Aggiornamento evento",
        content: "Ciao {{firstName}},\n\nabbiamo un aggiornamento importante per {{eventTitle}}. Controlla i dettagli.",
        statuses: ["CONFIRMED", "PENDING", "WAITLIST"],
      }),
    },
    {
      type: "CANCELLATION",
      name: "Cancellazione evento",
      subject: `Comunicazione ufficiale — ${eventTitle}`,
      payload: makePayload({
        eventTitle,
        title: "Comunicazione evento",
        content: "Ciao {{firstName}},\n\nstiamo inviando una comunicazione ufficiale relativa a {{eventTitle}}.",
        statuses: ["CONFIRMED", "PENDING", "WAITLIST"],
      }),
    },
  ];
}

export async function ensureDefaultEventTemplates(eventId: string, eventTitle: string) {
  const existing = await prisma.emailTemplate.findMany({
    where: { eventId },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((t) => t.type));
  const missing = defaultTemplates(eventTitle).filter((t) => !existingTypes.has(t.type));

  if (!missing.length) return;

  await prisma.emailTemplate.createMany({
    data: missing.map((t) => ({
      eventId,
      type: t.type,
      name: t.name,
      subject: t.subject,
      body: serializeBuilderPayload(t.payload),
      isDefault: true,
    })),
  });
}
