import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/auth-helpers";

// GET /api/events/[id]/ai/proposals/count — lightweight pending count for badge
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrg("VIEWER");
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { id: eventId } = await params;

  const count = await prisma.agentProposal.count({
    where: { eventId, orgId, status: "PENDING" },
  });

  return NextResponse.json({ count });
}
