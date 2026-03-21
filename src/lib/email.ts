import { Resend } from "resend";
import { createHmac } from "crypto";
import { parseBuilderPayload, renderBuilderContentHtml } from "@/lib/email-builder";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_DEFAULT = process.env.EMAIL_FROM ?? "Phorma <noreply@phorma.it>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailOptions) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { id: "mock", skipped: true };
  }
  const result = await resend.emails.send({
    from: from ?? FROM_DEFAULT,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    replyTo,
  });
  return result;
}

// Batch send up to 100 emails per call using Resend Batch API
// Returns array of { id } results (one per email)
export async function sendEmailBatch(
  emails: Array<{ to: string; subject: string; html: string; from?: string }>
): Promise<Array<{ id: string | null }>> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping batch send");
    return emails.map(() => ({ id: null }));
  }
  const payload = emails.map((e) => ({
    from: e.from ?? FROM_DEFAULT,
    to: [e.to],
    subject: e.subject,
    html: e.html,
  }));
  const { data, error } = await resend.batch.send(payload);
  if (error || !data) {
    console.error("[email] Batch send error", error);
    return emails.map(() => ({ id: null }));
  }
  return data.data.map((r: { id: string }) => ({ id: r.id ?? null }));
}

// ─────────────────────────────────────────────
// HTML email templates
// ─────────────────────────────────────────────

function baseTemplate(content: string, accentColor = "#2563eb", opts?: { unsubscribeUrl?: string }) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Phorma</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${accentColor},#4f46e5);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:8px;">
              <div style="background:rgba(255,255,255,.2);border-radius:8px;width:32px;height:32px;display:inline-block;line-height:32px;text-align:center;font-weight:900;font-size:16px;color:#fff;">P</div>
              <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-.5px;">Phorma</span>
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Hai ricevuto questa email perché sei iscritto a un evento gestito tramite Phorma.<br />
              Phorma · Tutti i diritti riservati
              ${opts?.unsubscribeUrl ? `<br /><a href="${opts.unsubscribeUrl}" style="color:#94a3b8;font-size:11px;">Disiscriviti dalle comunicazioni di questo evento</a>` : ""}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildUnsubscribeToken(registrationId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback";
  const hmac = createHmac("sha256", secret).update(registrationId).digest("hex");
  return `${registrationId}|${hmac}`;
}

export function buildUnsubscribeUrl(registrationId: string, baseUrl?: string): string {
  const token = buildUnsubscribeToken(registrationId);
  const base = baseUrl ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}

function pill(text: string, bg = "#dbeafe", color = "#1d4ed8") {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;">${text}</span>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#64748b;width:130px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:500;">${value}</td>
  </tr>`;
}

export interface RegistrationConfirmationData {
  firstName: string;
  lastName: string;
  email: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation?: string;
  registrationCode: string;
  organizerEmail?: string;
  organizerName?: string;
}

export function buildRegistrationConfirmationEmail(data: RegistrationConfirmationData) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Registrazione confermata!</h1>
    <p style="margin:0 0 28px;font-size:16px;color:#475569;">Ciao ${data.firstName}, la tua iscrizione a <strong>${data.eventTitle}</strong> è confermata.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      ${data.eventDate ? infoRow("Data", data.eventDate) : ""}
      ${data.eventLocation ? infoRow("Luogo", data.eventLocation) : ""}
      ${infoRow("Nome", `${data.firstName} ${data.lastName}`)}
      ${infoRow("Email", data.email)}
    </table>

    <div style="background:#f8fafc;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Codice registrazione</p>
      <p style="margin:0;font-size:28px;font-weight:900;font-family:monospace;color:#0f172a;letter-spacing:.1em;">${data.registrationCode}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Mostra questo codice al check-in</p>
    </div>

    ${data.organizerEmail ? `<p style="margin:0;font-size:13px;color:#64748b;">Per informazioni contatta <a href="mailto:${data.organizerEmail}" style="color:#2563eb;">${data.organizerEmail}</a></p>` : ""}
  `;
  return {
    subject: `Registrazione confermata — ${data.eventTitle}`,
    html: baseTemplate(content),
  };
}

export interface WaitlistConfirmationData {
  firstName: string;
  eventTitle: string;
  registrationCode: string;
}

export function buildWaitlistConfirmationEmail(data: WaitlistConfirmationData) {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      ${pill("Lista d'attesa", "#fef3c7", "#d97706")}
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Sei in lista d'attesa</h1>
    <p style="margin:0 0 28px;font-size:16px;color:#475569;">
      Ciao ${data.firstName}, l'evento <strong>${data.eventTitle}</strong> è al momento al completo. Sei stato inserito in lista d'attesa — ti contatteremo non appena si libera un posto.
    </p>
    <div style="background:#fffbeb;border:1px solid #fed7aa;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:.05em;">Codice lista d'attesa</p>
      <p style="margin:0;font-size:28px;font-weight:900;font-family:monospace;color:#92400e;letter-spacing:.1em;">${data.registrationCode}</p>
    </div>
    <p style="margin:0;font-size:13px;color:#64748b;">Conserva questo codice per il check-in se il tuo posto verrà confermato.</p>
  `;
  return {
    subject: `Lista d'attesa — ${data.eventTitle}`,
    html: baseTemplate(content, "#d97706"),
  };
}

export interface WaitlistPromotionData {
  firstName: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation?: string;
  registrationCode: string;
}

export function buildWaitlistPromotionEmail(data: WaitlistPromotionData) {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      ${pill("Posto confermato!", "#dcfce7", "#16a34a")}
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Il tuo posto è confermato!</h1>
    <p style="margin:0 0 28px;font-size:16px;color:#475569;">
      Ciao ${data.firstName}, si è liberato un posto per <strong>${data.eventTitle}</strong>. La tua iscrizione è ora confermata!
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      ${data.eventDate ? infoRow("Data", data.eventDate) : ""}
      ${data.eventLocation ? infoRow("Luogo", data.eventLocation) : ""}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:.05em;">Codice registrazione</p>
      <p style="margin:0;font-size:28px;font-weight:900;font-family:monospace;color:#166534;letter-spacing:.1em;">${data.registrationCode}</p>
    </div>
  `;
  return {
    subject: `Posto confermato — ${data.eventTitle}`,
    html: baseTemplate(content, "#16a34a"),
  };
}

export interface EventReminderData {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation?: string;
  onlineUrl?: string;
  registrationCode?: string;
  unsubscribeUrl?: string;
}

export function buildEventReminderEmail(data: EventReminderData) {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      ${pill("Promemoria evento", "#ede9fe", "#7c3aed")}
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">A domani!</h1>
    <p style="margin:0 0 28px;font-size:16px;color:#475569;">
      Ciao ${data.firstName}, ti ricordiamo che domani si tiene <strong>${data.eventTitle}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      ${infoRow("Data", data.eventDate)}
      ${data.eventLocation ? infoRow("Luogo", data.eventLocation) : ""}
      ${data.onlineUrl ? infoRow("Link", `<a href="${data.onlineUrl}" style="color:#2563eb;">${data.onlineUrl}</a>`) : ""}
    </table>
    <div style="background:#f5f3ff;border-radius:12px;padding:16px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em;">Il tuo codice</p>
      <p style="margin:0;font-size:22px;font-weight:900;font-family:monospace;color:#4c1d95;">${data.registrationCode}</p>
    </div>
    <p style="margin:0;font-size:13px;color:#64748b;">Non dimenticare di presentare il codice al check-in. A presto!</p>
  `;
  return {
    subject: `Promemoria: ${data.eventTitle} è domani!`,
    html: baseTemplate(content, "#7c3aed", { unsubscribeUrl: data.unsubscribeUrl }),
  };
}

export interface CustomEmailData {
  firstName: string;
  lastName: string;
  eventTitle: string;
  subject: string;
  body: string;
  unsubscribeUrl?: string;
}

export function buildCustomEmail(data: CustomEmailData) {
  const resolvedSubject = data.subject
    .replace(/\{\{firstName\}\}/g, data.firstName)
    .replace(/\{\{lastName\}\}/g, data.lastName)
    .replace(/\{\{eventTitle\}\}/g, data.eventTitle);

  const builder = parseBuilderPayload(data.body);
  if (builder) {
    const content = renderBuilderContentHtml(builder, {
      firstName: data.firstName,
      lastName: data.lastName,
      eventTitle: data.eventTitle,
    });
    return {
      subject: resolvedSubject,
      html: baseTemplate(content, builder.branding.accentColor, { unsubscribeUrl: data.unsubscribeUrl }),
    };
  }

  // Simple body substitution of placeholders
  const resolvedBody = data.body
    .replace(/\{\{firstName\}\}/g, data.firstName)
    .replace(/\{\{lastName\}\}/g, data.lastName)
    .replace(/\{\{eventTitle\}\}/g, data.eventTitle)
    .replace(/\n/g, "<br />");

  const content = `
    <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">${data.eventTitle}</h2>
    <div style="font-size:15px;color:#334155;line-height:1.7;">${resolvedBody}</div>
  `;
  return {
    subject: resolvedSubject,
    html: baseTemplate(content, undefined, { unsubscribeUrl: data.unsubscribeUrl }),
  };
}
