import { prisma } from "@/lib/db";

/**
 * Resolves the FROM address for an org's outgoing email.
 * Looks for the default verified OrgEmailSender; falls back to EMAIL_FROM env or Phorma default.
 */
export async function resolveOrgFromAddress(orgId: string): Promise<string> {
  try {
    const sender = await prisma.orgEmailSender.findFirst({
      where: { organizationId: orgId, isDefault: true, status: "VERIFIED" },
      select: { displayName: true, email: true },
    });
    if (sender) return `${sender.displayName} <${sender.email}>`;
  } catch {
    // Silently fall through to default
  }
  return process.env.EMAIL_FROM ?? "Phorma <noreply@phorma.it>";
}
