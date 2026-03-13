import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg, requireOwner } from "@/lib/auth-helpers";

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
  const result = await requireOwner();
  if ("error" in result) return result.error;
  const { orgId } = result;

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
  return NextResponse.json(updated);
}
