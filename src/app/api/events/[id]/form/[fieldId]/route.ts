import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id, fieldId } = await params;

  const field = await prisma.formField.findFirst({
    where: { id: fieldId, event: { id, organizationId: orgId } },
  });
  if (!field) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.formField.update({
    where: { id: fieldId },
    data: {
      label: body.label ?? field.label,
      type: body.type ?? field.type,
      placeholder: body.placeholder !== undefined ? (body.placeholder || null) : field.placeholder,
      required: body.required ?? field.required,
      options: body.options !== undefined ? (body.options ? JSON.stringify(body.options) : null) : field.options,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id, fieldId } = await params;

  const field = await prisma.formField.findFirst({
    where: { id: fieldId, event: { id, organizationId: orgId } },
  });
  if (!field) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  await prisma.formField.delete({ where: { id: fieldId } });
  return NextResponse.json({ success: true });
}
