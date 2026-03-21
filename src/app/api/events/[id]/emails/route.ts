import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember, requireOrg } from "@/lib/auth-helpers";

// GET /api/events/[id]/emails — list email templates for an event
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const templates = await prisma.emailTemplate.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

// POST /api/events/[id]/emails — create template
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!event) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const { name, subject, body, type, groupId, category } = await req.json();
  if (!name || !subject || !body) {
    return NextResponse.json({ error: "Nome, oggetto e corpo richiesti" }, { status: 400 });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      eventId: id,
      name,
      subject,
      body,
      type: type || "CUSTOM",
      groupId: groupId ?? null,
      category: category ?? "manual",
    },
  });
  return NextResponse.json(template, { status: 201 });
}
