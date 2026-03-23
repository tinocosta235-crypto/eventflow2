import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Resend sends webhook events via Svix.
// Signature verification uses the Svix signing scheme:
//   msg-id, msg-timestamp, msg-signature headers
//   HMAC-SHA256(secret_bytes, `${msgId}.${msgTimestamp}.${rawBody}`)
// Env: RESEND_WEBHOOK_SECRET — the signing secret from the Resend dashboard
//      (starts with "whsec_" — base64url-encoded 32-byte key)

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
  "email.opened":       "OPEN",
  "email.clicked":      "CLICK",
  "email.bounced":      "BOUNCE",
  "email.complained":   "SPAM",
  "email.delivered":    "DELIVERED",
  "email.unsubscribed": "UNSUBSCRIBE",
};

// ── Svix HMAC-SHA256 verification ────────────────────────────────────────────

/**
 * Decodes a base64url or base64 string to an ArrayBuffer.
 * Resend/Svix secrets are prefixed with "whsec_" and base64-encoded.
 */
function decodeBase64(input: string): ArrayBuffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary  = atob(base64);
  const buffer  = new ArrayBuffer(binary.length);
  const view    = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

/**
 * Verifies a Svix webhook signature.
 * Returns true if at least one of the provided signatures matches.
 */
async function verifySvixSignature(
  secret: string,
  msgId: string,
  msgTimestamp: string,
  rawBody: string,
  sigHeader: string
): Promise<boolean> {
  // Reject timestamps older than 5 minutes (replay attack prevention)
  const ts = parseInt(msgTimestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  // The signed content is: "{msgId}.{msgTimestamp}.{rawBody}"
  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;
  const encoder = new TextEncoder();

  // Strip "whsec_" prefix if present
  const secretBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyBytes = decodeBase64(secretBase64);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(toSign));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // sigHeader format: "v1,<base64sig> v1,<base64sig2> ..."
  const signatures = sigHeader
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean);

  // Constant-time comparison using a simple XOR approach
  return signatures.some((sig) => {
    if (sig.length !== computed.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ computed.charCodeAt(i);
    }
    return diff === 0;
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Read raw body for signature verification
  const rawBody = await req.text();

  if (secret) {
    const msgId        = req.headers.get("svix-id")        ?? "";
    const msgTimestamp = req.headers.get("svix-timestamp") ?? "";
    const msgSignature = req.headers.get("svix-signature") ?? "";

    if (!msgId || !msgTimestamp || !msgSignature) {
      console.warn("[webhook/resend] Missing Svix headers");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const valid = await verifySvixSignature(
      secret,
      msgId,
      msgTimestamp,
      rawBody,
      msgSignature
    );

    if (!valid) {
      console.warn("[webhook/resend] Invalid signature for msgId:", msgId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[webhook/resend] RESEND_WEBHOOK_SECRET not configured — skipping signature check");
  }

  let body: ResendWebhookEvent;
  try {
    body = JSON.parse(rawBody) as ResendWebhookEvent;
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

  // Write tracking event
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
  if (trackingType === "OPEN"   && !log.openedAt)  updateData.openedAt  = occurredAt;
  if (trackingType === "CLICK"  && !log.clickedAt) updateData.clickedAt = occurredAt;
  if (trackingType === "BOUNCE")                   updateData.bouncedAt = occurredAt;

  if (Object.keys(updateData).length) {
    await prisma.emailSendLog.update({
      where: { id: log.id },
      data: updateData as Parameters<typeof prisma.emailSendLog.update>[0]["data"],
    });
  }

  return NextResponse.json({ ok: true });
}
