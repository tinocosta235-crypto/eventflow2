import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireOrgAdmin } from "@/lib/auth-helpers";

const AUDIT_LOG_FILE = join(process.cwd(), "docs", "audit-log.ndjson");

// GET /api/org/audit — latest org audit entries (baseline)
export async function GET() {
  const result = await requireOrgAdmin();
  if ("error" in result) return result.error;
  const { orgId } = result;

  try {
    const raw = await readFile(AUDIT_LOG_FILE, "utf8");
    const entries = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as { orgId: string; at: string };
        } catch {
          return null;
        }
      })
      .filter((e): e is { orgId: string; at: string } & Record<string, unknown> => !!e)
      .filter((e) => e.orgId === orgId)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 25);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
