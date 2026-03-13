import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const result = await requireOrg("OWNER");
  if ("error" in result) return result.error;

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: "Destinatario richiesto" }, { status: 400 });

  const res = await sendEmail({
    to,
    subject: "Test email — EventFlow",
    html: `
      <div style="font-family:sans-serif;padding:32px;max-width:480px;margin:0 auto;">
        <h2 style="color:#0f172a;">Email di test</h2>
        <p style="color:#475569;">La configurazione email di EventFlow funziona correttamente.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Inviata da EventFlow Platform</p>
      </div>
    `,
  });

  return NextResponse.json(res);
}
