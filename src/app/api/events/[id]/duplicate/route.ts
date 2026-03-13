import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";
import { slugify } from "@/lib/utils";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireMember();
  if ("error" in result) return result.error;
  const { orgId } = result;

  const { id } = await params;
  const source = await prisma.event.findFirst({ where: { id, organizationId: orgId } });
  if (!source) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const baseSlug = slugify(`${source.title} copia`);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.event.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, currentCount: _cc, ...rest } = source;

  const copy = await prisma.event.create({
    data: { ...rest, slug, title: `${source.title} (copia)`, status: "DRAFT", currentCount: 0 },
  });

  return NextResponse.json(copy, { status: 201 });
}
