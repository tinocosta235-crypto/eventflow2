import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

// GET /api/org/ai/proposals?status=PENDING — cross-event proposals for org
export async function GET(req: NextRequest) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const proposals = await prisma.agentProposal.findMany({
    where: {
      orgId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      event: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    proposals: proposals.map((p) => ({
      ...p,
      payload: JSON.parse(p.payload),
      diffPayload: p.diffPayload ? JSON.parse(p.diffPayload) : null,
    })),
  });
}
