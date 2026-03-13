import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

// GET /api/user/profile
export async function GET() {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { userId } = result;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  });
  return NextResponse.json(user);
}

// PATCH /api/user/profile
export async function PATCH(req: NextRequest) {
  const result = await requireOrg("VIEWER");
  if ("error" in result) return result.error;
  const { userId } = result;

  const { name, currentPassword, newPassword } = await req.json();

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Password attuale richiesta" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user?.password) return NextResponse.json({ error: "Nessuna password impostata" }, { status: 400 });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Password attuale non corretta" }, { status: 400 });
    data.password = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, image: true },
  });
  return NextResponse.json(updated);
}
