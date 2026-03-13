import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth-helpers";
import crypto from "crypto";

// POST /api/org/invite — create invite token
export async function POST(req: NextRequest) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const { email, role = "MEMBER" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email richiesta" }, { status: 400 });
  if (!["OWNER", "MEMBER", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
  }

  // Check if already a member
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const alreadyMember = await prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: existingUser.id, organizationId: orgId } },
    });
    if (alreadyMember) {
      return NextResponse.json({ error: "L'utente è già membro dell'organizzazione" }, { status: 409 });
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert invite (replace existing pending invite for same email)
  const invite = await prisma.orgInvite.upsert({
    where: { organizationId_email: { organizationId: orgId, email: normalizedEmail } },
    update: { token, role, expiresAt, acceptedAt: null },
    create: { organizationId: orgId, email: normalizedEmail, role, token, expiresAt },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${token}`;

  return NextResponse.json({ invite, inviteUrl }, { status: 201 });
}

// DELETE /api/org/invite — revoke invite
export async function DELETE(req: NextRequest) {
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const { inviteId } = await req.json();
  if (!inviteId) return NextResponse.json({ error: "ID invito mancante" }, { status: 400 });

  const invite = await prisma.orgInvite.findFirst({
    where: { id: inviteId, organizationId: orgId },
  });
  if (!invite) return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });

  await prisma.orgInvite.delete({ where: { id: inviteId } });
  return NextResponse.json({ success: true });
}
