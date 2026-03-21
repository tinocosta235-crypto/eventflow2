import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasMinRole, normalizeOrgRole } from "@/lib/rbac";

export type OrgRole = "OWNER" | "ADMIN" | "PLANNER" | "ONSITE" | "FINANCE" | "VIEWER";

/**
 * Call at the start of any API route that requires org membership.
 * Returns session info or a NextResponse error to return immediately.
 *
 * @param minRole – minimum role required (default: VIEWER)
 */
export async function requireOrg(minRole: OrgRole = "VIEWER") {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const role = normalizeOrgRole(session?.user?.role);
  const userId = session?.user?.id ?? "";

  if (!orgId || !userId) {
    return {
      error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }),
    };
  }
  if (!hasMinRole(role, minRole)) {
    return {
      error: NextResponse.json(
        { error: "Permessi insufficienti" },
        { status: 403 }
      ),
    };
  }
  return { orgId, userId, role };
}

/** Shorthand for OWNER-only routes */
export async function requireOwner() {
  return requireOrg("OWNER");
}

/** Shorthand for org admin routes (OWNER/ADMIN) */
export async function requireOrgAdmin() {
  return requireOrg("ADMIN");
}

/** Shorthand for write-capable event routes (PLANNER+) */
export async function requirePlanner() {
  return requireOrg("PLANNER");
}

/** Backward-compatible alias for previous MEMBER semantics */
export async function requireMember() {
  return requirePlanner();
}
