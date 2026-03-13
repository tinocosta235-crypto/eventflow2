import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, orgName } = await req.json();
    if (!firstName || !lastName || !email || !password || !orgName) {
      return NextResponse.json({ error: "Tutti i campi sono obbligatori" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    let slug = slugify(orgName);
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) slug = `${slug}-${Date.now()}`;
    const org = await prisma.organization.create({
      data: { name: orgName, slug, plan: "FREE" },
    });
    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        organizations: {
          create: { organizationId: org.id, role: "OWNER" },
        },
      },
    });
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Errore durante la registrazione" }, { status: 500 });
  }
}
