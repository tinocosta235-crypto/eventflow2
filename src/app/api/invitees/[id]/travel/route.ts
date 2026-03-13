import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const travel = await prisma.travelPlan.findUnique({
    where: { inviteeId: id },
  });

  return NextResponse.json(travel ?? null);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const travel = await prisma.travelPlan.upsert({
    where: { inviteeId: id },
    create: { inviteeId: id, ...body },
    update: { ...body },
  });

  return NextResponse.json(travel);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.travelPlan.deleteMany({ where: { inviteeId: id } });

  return NextResponse.json({ success: true });
}
