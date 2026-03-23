import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole, normalizeOrgRole } from "@/lib/rbac";

export type OrgRole = "OWNER" | "ADMIN" | "PLANNER" | "ONSITE" | "FINANCE" | "VIEWER";

const isDev = process.env.NODE_ENV !== "production";

// ─────────────────────────────────────────────────────────────────────────────
// Secure error responses — never leak internal details in production
// ─────────────────────────────────────────────────────────────────────────────

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Non autorizzato" },
    {
      status: 401,
      headers: {
        // Prevent browsers from sniffing content type
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}

function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: "Permessi insufficienti" },
    {
      status: 403,
      headers: { "X-Content-Type-Options": "nosniff" },
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSRF / Content-Type check for mutation routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that a mutation request (POST/PUT/PATCH/DELETE) carries a valid
 * Content-Type or Origin header to mitigate CSRF attacks.
 *
 * Returns a NextResponse error if the check fails, undefined otherwise.
 *
 * Usage (optional — call in routes that accept JSON mutations):
 *   const csrfErr = checkMutationRequest(req);
 *   if (csrfErr) return csrfErr;
 */
export function checkMutationRequest(req: NextRequest): NextResponse | undefined {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return undefined;

  const contentType = req.headers.get("content-type") ?? "";
  const origin      = req.headers.get("origin") ?? "";
  const appUrl      = process.env.NEXTAUTH_URL ?? "";

  // Accept if Content-Type contains application/json
  if (contentType.includes("application/json")) return undefined;

  // Accept if Origin matches the app origin (same-origin AJAX)
  if (appUrl && origin) {
    try {
      const reqOrigin = new URL(origin).origin;
      const ownOrigin = new URL(appUrl).origin;
      if (reqOrigin === ownOrigin) return undefined;
    } catch {
      // malformed URL — fall through to reject
    }
  }

  // In development, only warn (don't block — avoids friction with curl/Postman)
  if (isDev) {
    console.warn(
      `[csrf] Suspicious mutation request: method=${method} content-type="${contentType}" origin="${origin}"`
    );
    return undefined;
  }

  return NextResponse.json(
    { error: "Richiesta non valida" },
    { status: 400, headers: { "X-Content-Type-Options": "nosniff" } }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call at the start of any API route that requires org membership.
 * Returns session info or a NextResponse error to return immediately.
 *
 * @param minRole – minimum role required (default: VIEWER)
 */
export async function requireOrg(minRole: OrgRole = "VIEWER") {
  const session = await auth();
  const orgId   = session?.user?.organizationId;
  const role    = normalizeOrgRole(session?.user?.role);
  const userId  = session?.user?.id ?? "";

  if (!orgId || !userId) {
    return { error: unauthorizedResponse() };
  }
  if (!hasMinRole(role, minRole)) {
    return { error: forbiddenResponse() };
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
