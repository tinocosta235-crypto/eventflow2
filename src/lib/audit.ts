import "server-only";
import { prisma } from "@/lib/db";

export type AuditAction =
  // Team & org
  | "TEAM_INVITE_CREATED"
  | "TEAM_INVITE_REVOKED"
  | "TEAM_ROLE_UPDATED"
  | "TEAM_MEMBER_REMOVED"
  | "ORG_SETTINGS_UPDATED"
  // GDPR
  | "GDPR_EXPORT_REQUESTED"
  | "GDPR_DELETE_REQUESTED"
  // Integrations
  | "INTEGRATION_CONNECTED"
  | "INTEGRATION_REVOKED"
  | "INTEGRATION_REFRESHED"
  // Auth
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGOUT"
  // Security
  | "API_RATE_LIMITED"
  | "SECURITY_INVALID_INPUT"
  // Data
  | "DATA_EXPORT_REQUESTED";

export type AuditEntry = {
  action: AuditAction;
  orgId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: entry.orgId ?? null,
        actorId:        entry.actorId ?? "system",
        action:         entry.action,
        metadata:       entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress:      entry.ipAddress ?? null,
        userAgent:      entry.userAgent ?? null,
      },
    });
  } catch (err) {
    // Fallback: non bloccare mai il flusso principale per un errore di audit
    console.error("[audit] DB write failed:", entry.action, err);
  }
}

// Helper per leggere gli audit log di un'org (usato dalla UI /settings/audit)
export async function getAuditLogs(orgId: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
