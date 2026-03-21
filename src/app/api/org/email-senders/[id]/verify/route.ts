import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth-helpers";

// POST /api/org/email-senders/[id]/verify — trigger verification + refresh status
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const sender = await prisma.orgEmailSender.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!sender) return NextResponse.json({ error: "Mittente non trovato" }, { status: 404 });

  if (!sender.resendDomainId) {
    return NextResponse.json({ error: "Nessun dominio Resend associato" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY non configurata" }, { status: 400 });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Trigger re-check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (resend.domains as any).verify({ id: sender.resendDomainId });

    // Get current status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: domainData, error } = await (resend.domains as any).get({ id: sender.resendDomainId });

    if (error || !domainData) {
      return NextResponse.json({ error: "Impossibile recuperare lo stato del dominio" }, { status: 500 });
    }

    // Map Resend status to our status
    const resendStatus: string = domainData.status ?? "";
    let mappedStatus: string;
    if (resendStatus === "verified") {
      mappedStatus = "VERIFIED";
    } else if (resendStatus === "failed" || resendStatus === "failure") {
      mappedStatus = "FAILED";
    } else {
      mappedStatus = "PENDING";
    }

    const updatedDnsRecords = domainData.records ? JSON.stringify(domainData.records) : sender.dnsRecords;

    const updated = await prisma.orgEmailSender.update({
      where: { id },
      data: {
        status: mappedStatus,
        dnsRecords: updatedDnsRecords,
      },
    });

    return NextResponse.json({ status: updated.status, dnsRecords: updated.dnsRecords });
  } catch (err) {
    console.error("[email-senders/verify]", err);
    return NextResponse.json({ error: "Errore durante la verifica" }, { status: 500 });
  }
}
