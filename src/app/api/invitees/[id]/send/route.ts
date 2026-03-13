import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { subject, notes } = body;

  const invitee = await prisma.invitee.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!invitee) {
    return NextResponse.json({ error: "Invitato non trovato" }, { status: 404 });
  }

  // Log the send action
  await prisma.inviteLog.create({
    data: {
      inviteeId: id,
      emailSubject: subject ?? `Invito: ${invitee.event.title}`,
      method: "email",
      notes,
    },
  });

  // Increment send count and update lastInviteSentAt
  await prisma.invitee.update({
    where: { id },
    data: {
      invitesSent: { increment: 1 },
      lastInviteSentAt: new Date(),
    },
  });

  // NOTE: Real email sending would happen here via a transactional email service
  // (Resend, SendGrid, Postmark, etc.) using invitee.inviteToken as the unique link token

  return NextResponse.json({
    success: true,
    message: `Invito registrato per ${invitee.email}`,
    inviteToken: invitee.inviteToken,
  });
}
