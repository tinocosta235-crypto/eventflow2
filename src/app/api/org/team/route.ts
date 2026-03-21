import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg, requireOrgAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { ORG_ROLES, normalizeOrgRole } from "@/lib/rbac";

// GET /api/org/team — list members + pending invites
export async function GET() {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;

  const [members, invites] = await Promise.all([
    prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orgInvite.findMany({
      where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    members: members.map((m) => ({ ...m, role: normalizeOrgRole(m.role) })),
    invites: invites.map((i) => ({ ...i, role: normalizeOrgRole(i.role) })),
  });
}

// PATCH /api/org/team — update member role
export async function PATCH(req: NextRequest) {
  const result = await requireOrgAdmin();
  if ("error" in result) return result.error;
  const { orgId, userId: currentUserId } = result;

  const { userId, role } = await req.json();
  if (!userId || !role) return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  const normalizedRole = normalizeOrgRole(role);
  if (!ORG_ROLES.includes(normalizedRole)) {
    return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
  }
  if (normalizedRole === "OWNER" && result.role !== "OWNER") {
    return NextResponse.json({ error: "Solo un owner puo promuovere a owner" }, { status: 403 });
  }
  if (userId === currentUserId) {
    return NextResponse.json({ error: "Non puoi modificare il tuo ruolo" }, { status: 400 });
  }

  const membership = await prisma.userOrganization.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!membership) return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });

  const updated = await prisma.userOrganization.update({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    data: { role: normalizedRole },
  });
  await logAudit({
    action: "TEAM_ROLE_UPDATED",
    orgId,
    actorId: currentUserId,
    metadata: { targetUserId: userId, role: normalizedRole },
  });
  return NextResponse.json(updated);
}

// DELETE /api/org/team — remove member
export async function DELETE(req: NextRequest) {
  const result = await requireOrgAdmin();
  if ("error" in result) return result.error;
  const { orgId, userId: currentUserId } = result;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  if (userId === currentUserId) {
    return NextResponse.json({ error: "Non puoi rimuovere te stesso" }, { status: 400 });
  }

  const membership = await prisma.userOrganization.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!membership) return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });

  await prisma.userOrganization.delete({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  await logAudit({
    action: "TEAM_MEMBER_REMOVED",
    orgId,
    actorId: currentUserId,
    metadata: { targetUserId: userId },
  });
  return NextResponse.json({ success: true });
}
