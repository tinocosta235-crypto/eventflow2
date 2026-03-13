import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";

// PATCH /api/events/[id]/emails/[templateId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; templateId: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id, templateId } = await params;

  const template = await prisma.emailTemplate.findFirst({
    where: { id: templateId, eventId: id, event: { organizationId: orgId } },
  });
  if (!template) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.emailTemplate.update({
    where: { id: templateId },
    data: {
      name: body.name ?? template.name,
      subject: body.subject ?? template.subject,
      body: body.body ?? template.body,
      type: body.type ?? template.type,
    },
  });
  return NextResponse.json(updated);
}

// DELETE /api/events/[id]/emails/[templateId]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; templateId: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id, templateId } = await params;

  const template = await prisma.emailTemplate.findFirst({
    where: { id: templateId, eventId: id, event: { organizationId: orgId } },
  });
  if (!template) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  await prisma.emailTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ success: true });
}
