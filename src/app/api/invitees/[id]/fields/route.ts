import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const fields = await prisma.inviteeCustomField.findMany({
    where: { inviteeId: id },
  });

  return NextResponse.json(fields);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { fieldName, fieldType, value } = body;

  if (!fieldName) {
    return NextResponse.json({ error: "fieldName obbligatorio" }, { status: 400 });
  }

  const field = await prisma.inviteeCustomField.create({
    data: {
      inviteeId: id,
      fieldName,
      fieldType: fieldType ?? "text",
      value,
    },
  });

  return NextResponse.json(field, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Replace all custom fields for an invitee
  const { id } = await params;
  const body = await request.json();
  const { fields } = body as {
    fields: { fieldName: string; fieldType: string; value?: string }[];
  };

  await prisma.inviteeCustomField.deleteMany({ where: { inviteeId: id } });

  const created = await prisma.inviteeCustomField.createMany({
    data: fields.map((f) => ({
      inviteeId: id,
      fieldName: f.fieldName,
      fieldType: f.fieldType ?? "text",
      value: f.value,
    })),
  });

  return NextResponse.json({ count: created.count });
}
