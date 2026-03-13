import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOrg } from "@/lib/auth-helpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const fields = await prisma.formField.findMany({ where: { eventId: id }, orderBy: { order: "asc" } });
  return NextResponse.json(fields);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const body = await req.json();
  const maxOrder = await prisma.formField.aggregate({ _max: { order: true }, where: { eventId: id } });
  const order = (maxOrder._max.order ?? -1) + 1;

  const field = await prisma.formField.create({
    data: {
      eventId: id,
      label: body.label,
      type: body.type || "text",
      placeholder: body.placeholder || null,
      required: body.required ?? false,
      options: body.options ? JSON.stringify(body.options) : null,
      order,
    },
  });
  return NextResponse.json(field, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const body = await req.json();
  if (body.fields) {
    await Promise.all(
      body.fields.map((f: { id: string; order: number }) =>
        prisma.formField.update({ where: { id: f.id }, data: { order: f.order } })
      )
    );
  }
  return NextResponse.json({ success: true });
}
