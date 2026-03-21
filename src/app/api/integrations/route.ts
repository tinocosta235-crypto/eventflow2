import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

// List all integrations for the org (status + meta only, never tokens)
export async function GET() {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const integrations = await prisma.orgIntegration.findMany({
    where: { organizationId: auth.orgId },
    select: {
      id: true,
      provider: true,
      status: true,
      scopes: true,
      consentGivenAt: true,
      revokedAt: true,
      meta: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(integrations);
}
