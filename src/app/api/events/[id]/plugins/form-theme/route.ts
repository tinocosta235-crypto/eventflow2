import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-helpers";

type FormTheme = {
  primaryColor: string;
  bgColor: string;
  radius: "none" | "sm" | "md" | "lg";
  font: "inter" | "system" | "serif" | "mono";
  button: "filled" | "outline";
  // Header / above-the-fold
  formTitle?: string;
  formSubtitle?: string;
  coverImage?: string;        // base64 data URL or https URL
  coverHeight?: "sm" | "md" | "lg";
};

const DEFAULT: FormTheme = {
  primaryColor: "#3B82F6",
  bgColor: "#FFFFFF",
  radius: "md",
  font: "inter",
  button: "filled",
};

function parseConfig(raw: string | null): FormTheme {
  if (!raw) return DEFAULT;
  try {
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<FormTheme>) };
  } catch {
    return DEFAULT;
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "FORM_THEME" } },
  });
  return NextResponse.json(parseConfig(plugin?.config ?? null));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Partial<FormTheme>;
  const config: FormTheme = {
    primaryColor: body.primaryColor ?? DEFAULT.primaryColor,
    bgColor: body.bgColor ?? DEFAULT.bgColor,
    radius: body.radius ?? DEFAULT.radius,
    font: body.font ?? DEFAULT.font,
    button: body.button ?? DEFAULT.button,
    formTitle: body.formTitle ?? undefined,
    formSubtitle: body.formSubtitle ?? undefined,
    coverImage: body.coverImage ?? undefined,
    coverHeight: body.coverHeight ?? undefined,
  };

  const plugin = await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "FORM_THEME" } },
    create: { eventId: id, pluginType: "FORM_THEME", enabled: true, config: JSON.stringify(config) },
    update: { config: JSON.stringify(config) },
  });

  return NextResponse.json(parseConfig(plugin.config));
}
