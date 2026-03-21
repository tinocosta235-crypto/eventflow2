import "server-only";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

type AuditAction =
  | "TEAM_INVITE_CREATED"
  | "TEAM_INVITE_REVOKED"
  | "TEAM_ROLE_UPDATED"
  | "TEAM_MEMBER_REMOVED"
  | "ORG_SETTINGS_UPDATED"
  | "GDPR_EXPORT_REQUESTED"
  | "GDPR_DELETE_REQUESTED";

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
