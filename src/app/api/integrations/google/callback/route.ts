import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptTokens } from "@/lib/token-crypto";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const orgId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error || !code || !orgId) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=google_denied`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/integrations/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=google_token`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
  };

  // Fetch user info from Google
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = userRes.ok ? await userRes.json() as { email?: string; name?: string } : {};

  const tokenPayload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
  };

  const session = await auth();
  const actorId = session?.user?.id ?? "system";

  await prisma.orgIntegration.upsert({
    where: { organizationId_provider: { organizationId: orgId, provider: "GOOGLE" } },
    create: {
      organizationId: orgId,
      provider: "GOOGLE",
      status: "CONNECTED",
      encryptedTokens: encryptTokens(tokenPayload),
      scopes: JSON.stringify(tokens.scope.split(" ")),
      consentGivenAt: new Date(),
      consentGivenBy: actorId,
      meta: JSON.stringify({ email: userInfo.email, name: userInfo.name }),
    },
    update: {
      status: "CONNECTED",
      encryptedTokens: encryptTokens(tokenPayload),
      scopes: JSON.stringify(tokens.scope.split(" ")),
      consentGivenAt: new Date(),
      consentGivenBy: actorId,
      revokedAt: null,
      revokedBy: null,
      meta: JSON.stringify({ email: userInfo.email, name: userInfo.name }),
    },
  });

  await logAudit({
    action: "INTEGRATION_CONNECTED",
    orgId,
    actorId,
    metadata: { provider: "GOOGLE", email: userInfo.email },
  });

  return NextResponse.redirect(`${appUrl}/settings/integrations?success=google`);
}
