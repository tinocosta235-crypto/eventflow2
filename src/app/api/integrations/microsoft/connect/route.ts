import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth-helpers";

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Files.ReadWrite",
  "Mail.Send",
  "Calendars.ReadWrite",
  "Chat.ReadWrite",
].join(" ");

export async function GET() {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Microsoft OAuth non configurato. Aggiungi MICROSOFT_CLIENT_ID nelle variabili d'ambiente." },
      { status: 503 }
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/microsoft/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    response_mode: "query",
    state: auth.orgId,
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  );
}
