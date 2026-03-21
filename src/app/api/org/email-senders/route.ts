import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth-helpers";

// GET /api/org/email-senders — list all senders for the org
export async function GET() {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const senders = await prisma.orgEmailSender.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(senders);
}

// POST /api/org/email-senders — create new sender
export async function POST(req: NextRequest) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const { displayName, email } = await req.json();

  if (!displayName || !email) {
    return NextResponse.json({ error: "Nome e email richiesti" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Indirizzo email non valido" }, { status: 400 });
  }

  const domain = email.split("@")[1];

  let resendDomainId: string | null = null;
  let dnsRecords: string | null = null;
  let status = "PENDING";

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: domainData, error } = await (resend.domains as any).create({ name: domain });
      if (!error && domainData) {
        resendDomainId = domainData.id ?? null;
        dnsRecords = domainData.records ? JSON.stringify(domainData.records) : null;
      }
    } catch (err) {
      console.warn("[email-senders] Failed to create Resend domain:", err);
    }
  }

  // Count existing senders to determine if this is the first
  const existingCount = await prisma.orgEmailSender.count({
    where: { organizationId: orgId },
  });
  const isDefault = existingCount === 0;

  const sender = await prisma.orgEmailSender.create({
    data: {
      organizationId: orgId,
      displayName,
      email,
      domain,
      resendDomainId,
      dnsRecords,
      status,
      isDefault,
    },
  });

  return NextResponse.json(sender, { status: 201 });
}
