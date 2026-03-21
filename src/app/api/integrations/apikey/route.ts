import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { encryptTokens, decryptTokens } from "@/lib/token-crypto";
import { logAudit } from "@/lib/audit";

const API_KEY_PROVIDERS = ["AMADEUS", "BOOKING", "WHATSAPP", "TELEGRAM"] as const;
type ApiKeyProvider = typeof API_KEY_PROVIDERS[number];

// POST /api/integrations/apikey — save or update API key
export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({})) as {
    provider?: string;
    apiKey?: string;
    apiSecret?: string;  // for Amadeus (client_secret)
    meta?: Record<string, string>;
  };

  const { provider, apiKey, apiSecret, meta } = body;

  if (!provider || !API_KEY_PROVIDERS.includes(provider as ApiKeyProvider)) {
    return NextResponse.json({ error: "Provider non valido" }, { status: 400 });
  }
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API key obbligatoria" }, { status: 400 });
  }

  const encrypted = encryptTokens({ apiKey, apiSecret: apiSecret ?? null });

  await prisma.orgIntegration.upsert({
    where: { organizationId_provider: { organizationId: auth.orgId, provider } },
    create: {
      organizationId: auth.orgId,
      provider,
      status: "CONNECTED",
      encryptedApiKey: encrypted,
      consentGivenAt: new Date(),
      consentGivenBy: auth.userId,
      meta: meta ? JSON.stringify(meta) : null,
    },
    update: {
      status: "CONNECTED",
      encryptedApiKey: encrypted,
      consentGivenAt: new Date(),
      consentGivenBy: auth.userId,
      revokedAt: null,
      revokedBy: null,
      meta: meta ? JSON.stringify(meta) : undefined,
    },
  });

  await logAudit({
    action: "INTEGRATION_CONNECTED",
    orgId: auth.orgId,
    actorId: auth.userId,
    metadata: { provider },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/integrations/apikey?provider=AMADEUS
export async function DELETE(req: NextRequest) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (!provider || !API_KEY_PROVIDERS.includes(provider as ApiKeyProvider)) {
    return NextResponse.json({ error: "Provider non valido" }, { status: 400 });
  }

  await prisma.orgIntegration.updateMany({
    where: { organizationId: auth.orgId, provider },
    data: {
      status: "REVOKED",
      encryptedApiKey: null,
      revokedAt: new Date(),
      revokedBy: auth.userId,
    },
  });

  await logAudit({
    action: "INTEGRATION_REVOKED",
    orgId: auth.orgId,
    actorId: auth.userId,
    metadata: { provider },
  });

  return NextResponse.json({ ok: true });
}
