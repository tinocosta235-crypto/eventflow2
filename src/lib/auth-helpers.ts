import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type OrgRole = "OWNER" | "MEMBER" | "VIEWER";

const ROLE_RANK: Record<string, number> = { VIEWER: 0, MEMBER: 1, OWNER: 2 };

function hasMinRole(userRole: string, minRole: OrgRole) {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[minRole] ?? 0);
}

/**
 * Call at the start of any API route that requires org membership.
 * Returns session info or a NextResponse error to return immediately.
 *
 * @param minRole – minimum role required (default: VIEWER)
 */
export async function requireOrg(minRole: OrgRole = "VIEWER") {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const role = session?.user?.role ?? "";
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

/** Shorthand for write-capable routes (MEMBER+) */
export async function requireMember() {
  return requireOrg("MEMBER");
}
