import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const integration = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId: auth.orgId, provider: "MICROSOFT" } },
    select: { id: true, status: true, scopes: true, consentGivenAt: true, meta: true },
  });

  return NextResponse.json(integration ?? { status: "NOT_CONNECTED" });
}

export async function DELETE() {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const integration = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId: auth.orgId, provider: "MICROSOFT" } },
  });
  if (!integration) return NextResponse.json({ ok: true });

  await prisma.orgIntegration.update({
    where: { id: integration.id },
    data: {
      status: "REVOKED",
      encryptedTokens: null,
      revokedAt: new Date(),
      revokedBy: auth.userId,
    },
  });

  await logAudit({
    action: "INTEGRATION_REVOKED",
    orgId: auth.orgId,
    actorId: auth.userId,
    metadata: { provider: "MICROSOFT" },
  });

  return NextResponse.json({ ok: true });
}
