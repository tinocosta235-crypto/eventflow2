export const ORG_ROLES = ["OWNER", "ADMIN", "PLANNER", "ONSITE", "FINANCE", "VIEWER"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

const LEGACY_ROLE_MAP: Record<string, OrgRole> = {
  MEMBER: "PLANNER",
  STAFF: "PLANNER",
};

const ROLE_RANK: Record<OrgRole, number> = {
  VIEWER: 0,
  ONSITE: 1,
  FINANCE: 1,
  PLANNER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function normalizeOrgRole(role: string | null | undefined): OrgRole {
  if (!role) return "VIEWER";
  const upper = role.toUpperCase();
  if (upper in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[upper];
  if ((ORG_ROLES as readonly string[]).includes(upper)) return upper as OrgRole;
  return "VIEWER";
}

export function hasMinRole(role: string | null | undefined, minRole: OrgRole): boolean {
  return ROLE_RANK[normalizeOrgRole(role)] >= ROLE_RANK[minRole];
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PLANNER: "Planner",
  ONSITE: "Onsite",
  FINANCE: "Finance",
  VIEWER: "Viewer",
};
