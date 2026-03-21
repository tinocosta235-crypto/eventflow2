import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// GET: status
export async function GET() {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const integration = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId: auth.orgId, provider: "GOOGLE" } },
    select: { id: true, status: true, scopes: true, consentGivenAt: true, meta: true },
  });

  return NextResponse.json(integration ?? { status: "NOT_CONNECTED" });
}

// DELETE: revoke
export async function DELETE() {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const integration = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId: auth.orgId, provider: "GOOGLE" } },
  });
  if (!integration) return NextResponse.json({ ok: true });

  // Revoke token on Google side (best effort)
  try {
    const tokens = JSON.parse(
      Buffer.from(integration.encryptedTokens ?? "", "base64").toString() // simplified for revoke
    );
    if (tokens.access_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`, { method: "POST" });
    }
  } catch {
    // ignore
  }

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
    metadata: { provider: "GOOGLE" },
  });

  return NextResponse.json({ ok: true });
}
