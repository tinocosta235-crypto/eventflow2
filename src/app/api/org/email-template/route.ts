import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/auth-helpers";

// GET /api/org/email-template?type=HEADER|FOOTER
export async function GET(req: NextRequest) {
  const auth = await requireOrg("VIEWER");
  if ("error" in auth) return auth.error;
  const type = req.nextUrl.searchParams.get("type");
  if (!type || !["HEADER", "FOOTER"].includes(type))
    return NextResponse.json({ error: "type must be HEADER or FOOTER" }, { status: 400 });
  const tpl = await prisma.orgEmailTemplate.findUnique({
    where: { organizationId_type: { organizationId: auth.orgId, type } },
  });
  return NextResponse.json({ payload: tpl?.payload ?? null });
}

// PUT /api/org/email-template?type=HEADER|FOOTER
export async function PUT(req: NextRequest) {
  const auth = await requireOrg("PLANNER");
  if ("error" in auth) return auth.error;
  const type = req.nextUrl.searchParams.get("type");
  if (!type || !["HEADER", "FOOTER"].includes(type))
    return NextResponse.json({ error: "type must be HEADER or FOOTER" }, { status: 400 });
  const body = await req.json();
  if (!body?.payload || typeof body.payload !== "string")
    return NextResponse.json({ error: "payload required" }, { status: 400 });
  const tpl = await prisma.orgEmailTemplate.upsert({
    where: { organizationId_type: { organizationId: auth.orgId, type } },
    create: { organizationId: auth.orgId, type, payload: body.payload },
    update: { payload: body.payload },
  });
  return NextResponse.json({ id: tpl.id, type: tpl.type, updatedAt: tpl.updatedAt });
}

// DELETE /api/org/email-template?type=HEADER|FOOTER
export async function DELETE(req: NextRequest) {
  const auth = await requireOrg("PLANNER");
  if ("error" in auth) return auth.error;
  const type = req.nextUrl.searchParams.get("type");
  if (!type || !["HEADER", "FOOTER"].includes(type))
    return NextResponse.json({ error: "type must be HEADER or FOOTER" }, { status: 400 });
  await prisma.orgEmailTemplate.deleteMany({
    where: { organizationId: auth.orgId, type },
  });
  return NextResponse.json({ ok: true });
}
