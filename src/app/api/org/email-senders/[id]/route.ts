import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth-helpers";

// PATCH /api/org/email-senders/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const sender = await prisma.orgEmailSender.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!sender) return NextResponse.json({ error: "Mittente non trovato" }, { status: 404 });

  const body = await req.json();
  const { displayName, isDefault } = body;

  if (isDefault === true) {
    // Unset isDefault on all other senders for this org first
    await prisma.orgEmailSender.updateMany({
      where: { organizationId: orgId, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.orgEmailSender.update({
    where: { id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/org/email-senders/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const sender = await prisma.orgEmailSender.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!sender) return NextResponse.json({ error: "Mittente non trovato" }, { status: 404 });

  // Remove from Resend if applicable
  if (sender.resendDomainId && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (resend.domains as any).remove({ id: sender.resendDomainId });
    } catch (err) {
      console.warn("[email-senders] Failed to remove Resend domain:", err);
    }
  }

  await prisma.orgEmailSender.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
