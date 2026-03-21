import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg, requireOrgAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

// GET /api/org/settings
export async function GET() {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, website: true, logo: true, plan: true, createdAt: true },
  });
  return NextResponse.json(org);
}

// PATCH /api/org/settings
export async function PATCH(req: NextRequest) {
  const result = await requireOrgAdmin();
  if ("error" in result) return result.error;
  const { orgId, userId } = result;

  const { name, website, logo } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome organizzazione richiesto" }, { status: 400 });

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name,
      website: website || null,
      logo: logo || null,
    },
    select: { id: true, name: true, slug: true, website: true, logo: true, plan: true },
  });
  await logAudit({
    action: "ORG_SETTINGS_UPDATED",
    orgId,
    actorId: userId,
    metadata: { website: updated.website ?? null },
  });
  return NextResponse.json(updated);
}
