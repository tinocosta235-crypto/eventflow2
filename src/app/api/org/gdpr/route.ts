import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

// GET /api/org/gdpr — baseline GDPR posture and data footprint
export async function GET() {
  const result = await requireOrgAdmin();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const [events, registrations, templates, users] = await Promise.all([
    prisma.event.count({ where: { organizationId: orgId } }),
    prisma.registration.count({ where: { event: { organizationId: orgId } } }),
    prisma.emailTemplate.count({ where: { event: { organizationId: orgId } } }),
    prisma.userOrganization.count({ where: { organizationId: orgId } }),
  ]);

  return NextResponse.json({
    retentionDays: 365,
    lawfulBasis: "Contract + Legitimate Interest",
    dpaSigned: false,
    exportedAt: null,
    deletionPolicy: "Soft request queue",
    footprint: { events, registrations, templates, users },
  });
}

// POST /api/org/gdpr — create export/delete requests (baseline queue)
export async function POST(req: NextRequest) {
  const result = await requireOrgAdmin();
  if ("error" in result) return result.error;
  const { orgId, userId } = result;

  const { action } = await req.json();
  if (!["EXPORT", "DELETE_REQUEST"].includes(action)) {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }

  await logAudit({
    action: action === "EXPORT" ? "GDPR_EXPORT_REQUESTED" : "GDPR_DELETE_REQUESTED",
    orgId,
    actorId: userId,
    metadata: { requestedAt: new Date().toISOString() },
  });

  return NextResponse.json({
    success: true,
    status: "QUEUED",
    message:
      action === "EXPORT"
        ? "Richiesta export GDPR registrata"
        : "Richiesta cancellazione GDPR registrata",
  });
}
