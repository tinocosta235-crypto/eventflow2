import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

function validateToken(token: string): { valid: false } | { valid: true; registrationId: string } {
  const parts = token.split("|");
  if (parts.length !== 2) return { valid: false };
  const [registrationId, providedHmac] = parts;
  if (!registrationId || !providedHmac) return { valid: false };

  const secret = process.env.NEXTAUTH_SECRET ?? "fallback";
  const expectedHmac = createHmac("sha256", secret).update(registrationId).digest("hex");

  if (expectedHmac !== providedHmac) return { valid: false };
  return { valid: true, registrationId };
}

// GET /api/unsubscribe?token=xxx
// Returns registration info for the page to display before confirming
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const validated = validateToken(token);
  if (!validated.valid) {
    return NextResponse.json({ error: "Token non valido" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: validated.registrationId },
    select: {
      id: true,
      firstName: true,
      unsubscribedAt: true,
      event: { select: { id: true, title: true } },
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registrazione non trovata" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    eventTitle: registration.event.title,
    eventId: registration.event.id,
    firstName: registration.firstName,
    alreadyUnsubscribed: registration.unsubscribedAt !== null,
  });
}

// POST /api/unsubscribe
// body: { token: string }
export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const token = body.token ?? "";
  const validated = validateToken(token);
  if (!validated.valid) {
    return NextResponse.json({ error: "Token non valido" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: validated.registrationId },
    select: {
      id: true,
      firstName: true,
      unsubscribedAt: true,
      event: { select: { id: true, title: true } },
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registrazione non trovata" }, { status: 404 });
  }

  if (!registration.unsubscribedAt) {
    await prisma.registration.update({
      where: { id: validated.registrationId },
      data: { unsubscribedAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    eventTitle: registration.event.title,
    firstName: registration.firstName,
  });
}
