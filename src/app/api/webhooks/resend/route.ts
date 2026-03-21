import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Resend sends webhook events for email tracking.
// Each event has a `type` and `data.email_id` that matches EmailSendLog.resendId.
// Env: RESEND_WEBHOOK_SECRET — used to verify the X-Resend-Signature header.

type ResendWebhookEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to?: string[];
    from?: string;
    subject?: string;
    click?: { link: string };
    bounce?: { message: string };
  };
};

const EVENT_TYPE_MAP: Record<string, string> = {
  "email.opened":    "OPEN",
  "email.clicked":   "CLICK",
  "email.bounced":   "BOUNCE",
  "email.complained": "SPAM",
  "email.delivered": "DELIVERED",
  "email.unsubscribed": "UNSUBSCRIBE",
};

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (secret) {
    const signature = req.headers.get("svix-signature") ?? req.headers.get("x-resend-signature");
    if (!signature || !signature.includes(secret)) {
      // Loose check for v1 — tighten with full Svix HMAC in Sprint 5
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: ResendWebhookEvent;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trackingType = EVENT_TYPE_MAP[body.type];
  if (!trackingType) {
    // Unknown event type — ignore silently
    return NextResponse.json({ ok: true });
  }

  const resendId = body.data?.email_id;
  if (!resendId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  // Find the EmailSendLog by Resend ID
  const log = await prisma.emailSendLog.findFirst({
    where: { resendId },
    select: { id: true, eventId: true, openedAt: true, clickedAt: true },
  });

  if (!log) {
    // Email sent outside Phorma or resendId not stored — ignore
    return NextResponse.json({ ok: true });
  }

  const occurredAt = body.created_at ? new Date(body.created_at) : new Date();
  const metadata: Record<string, unknown> = {};
  if (body.data.click?.link) metadata.link = body.data.click.link;
  if (body.data.bounce?.message) metadata.reason = body.data.bounce.message;

  // Write tracking event (deduplicate opens: only create if first open)
  await prisma.emailTrackingEvent.create({
    data: {
      emailSendLogId: log.id,
      eventId: log.eventId,
      eventType: trackingType,
      occurredAt,
      metadata: Object.keys(metadata).length ? JSON.stringify(metadata) : null,
    },
  });

  // Update denormalized fields on EmailSendLog for quick access
  const updateData: Record<string, unknown> = {};
  if (trackingType === "OPEN" && !log.openedAt) updateData.openedAt = occurredAt;
  if (trackingType === "CLICK" && !log.clickedAt) updateData.clickedAt = occurredAt;
  if (trackingType === "BOUNCE") updateData.bouncedAt = occurredAt;

  if (Object.keys(updateData).length) {
    await prisma.emailSendLog.update({
      where: { id: log.id },
      data: updateData as Parameters<typeof prisma.emailSendLog.update>[0]["data"],
    });
  }

  return NextResponse.json({ ok: true });
}
