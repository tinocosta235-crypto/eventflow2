import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth-helpers";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export async function GET() {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth non configurato. Aggiungi GOOGLE_CLIENT_ID nelle variabili d'ambiente." },
      { status: 503 }
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: auth.orgId, // pass orgId through state
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
