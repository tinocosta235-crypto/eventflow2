import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptTokens } from "@/lib/token-crypto";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const orgId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error || !code || !orgId) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=microsoft_denied`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/integrations/microsoft/callback`;

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=microsoft_token`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  // Fetch user profile from Microsoft Graph
  const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = userRes.ok ? await userRes.json() as { mail?: string; displayName?: string; userPrincipalName?: string } : {};

  const tokenPayload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
  };

  const actorId = "system";

  const email = userInfo.mail ?? userInfo.userPrincipalName;

  await prisma.orgIntegration.upsert({
    where: { organizationId_provider: { organizationId: orgId, provider: "MICROSOFT" } },
    create: {
      organizationId: orgId,
      provider: "MICROSOFT",
      status: "CONNECTED",
      encryptedTokens: encryptTokens(tokenPayload),
      scopes: JSON.stringify(tokens.scope.split(" ")),
      consentGivenAt: new Date(),
      consentGivenBy: actorId,
      meta: JSON.stringify({ email, name: userInfo.displayName }),
    },
    update: {
      status: "CONNECTED",
      encryptedTokens: encryptTokens(tokenPayload),
      scopes: JSON.stringify(tokens.scope.split(" ")),
      consentGivenAt: new Date(),
      consentGivenBy: actorId,
      revokedAt: null,
      revokedBy: null,
      meta: JSON.stringify({ email, name: userInfo.displayName }),
    },
  });

  await logAudit({
    action: "INTEGRATION_CONNECTED",
    orgId,
    actorId,
    metadata: { provider: "MICROSOFT", email },
  });

  return NextResponse.redirect(`${appUrl}/settings/integrations?success=microsoft`);
}
