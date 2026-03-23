import "server-only";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

type AuditAction =
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
  // Security — Authentication
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGOUT"
  // Security — Rate limiting
  | "API_RATE_LIMITED"
  // Security — Input validation
  | "SECURITY_INVALID_INPUT"
  // Data export
  | "DATA_EXPORT_REQUESTED";

type AuditEntry = {
  at: string;
  action: AuditAction;
  orgId: string;
  actorId: string;
  metadata?: Record<string, unknown>;
};

const AUDIT_LOG_FILE = join(process.cwd(), "docs", "audit-log.ndjson");

export async function logAudit(entry: Omit<AuditEntry, "at">) {
  const payload: AuditEntry = { at: new Date().toISOString(), ...entry };
  const line = `${JSON.stringify(payload)}\n`;
  try {
    await appendFile(AUDIT_LOG_FILE, line, "utf8");
  } catch {
    // Non-blocking fallback for environments where filesystem append is unavailable.
    console.info("[audit]", payload);
  }
}
