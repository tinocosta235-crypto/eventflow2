import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth-helpers";
import { getAuditLogs } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;

  const limit = Math.min(
    parseInt(new URL(req.url).searchParams.get("limit") ?? "100"),
    500
  );

  const logs = await getAuditLogs(auth.orgId, limit);
  return NextResponse.json(logs);
}
