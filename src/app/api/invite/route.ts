import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/invite — accept an invite (create account if needed + join org)
export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json();
  if (!token) return NextResponse.json({ error: "Token mancante" }, { status: 400 });

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invito non valido" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Invito già utilizzato" }, { status: 409 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invito scaduto" }, { status: 410 });

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email: invite.email } });

  if (!user) {
    // New user — name and password required
    if (!name || !password) {
      return NextResponse.json({ error: "Nome e password richiesti per il nuovo account" }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: { email: invite.email, name, password: hash },
    });
  }

  // Add to org (upsert in case membership exists in another state)
  const alreadyMember = await prisma.userOrganization.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: invite.organizationId } },
  });
  if (alreadyMember) {
    await prisma.orgInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return NextResponse.json({ alreadyMember: true, orgName: invite.organization.name });
  }

  await prisma.$transaction([
    prisma.userOrganization.create({
      data: { userId: user.id, organizationId: invite.organizationId, role: invite.role },
    }),
    prisma.orgInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  return NextResponse.json({ success: true, orgName: invite.organization.name });
}

// GET /api/invite?token=xxx — get invite info (for the accept page)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token mancante" }, { status: 400 });

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    select: {
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      organization: { select: { name: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: "Invito non valido" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Invito già utilizzato" }, { status: 409 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invito scaduto" }, { status: 410 });

  // Check if user already has an account
  const userExists = !!(await prisma.user.findUnique({ where: { email: invite.email } }));

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    orgName: invite.organization.name,
    userExists,
  });
}
