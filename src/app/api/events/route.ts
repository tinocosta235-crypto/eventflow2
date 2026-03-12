import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { registrations: true } } },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, location, startDate, endDate, capacity, status, tags, visibility, online, onlineUrl } = body;

    if (!title) return NextResponse.json({ error: "Titolo richiesto" }, { status: 400 });

    let slug = slugify(title);
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const event = await prisma.event.create({
      data: {
        title, description, location, slug, status: status || "DRAFT",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        capacity: capacity ? parseInt(capacity) : null,
        tags: tags || null,
        visibility: visibility || "PUBLIC",
        online: online || false,
        onlineUrl: onlineUrl || null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Errore creazione evento" }, { status: 500 });
  }
}
