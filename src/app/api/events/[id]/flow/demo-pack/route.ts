import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

type FlowNodeType = "trigger" | "condition" | "action" | "ai_action";
type FlowStatus = "DRAFT" | "PUBLISHED";

type FlowNode = {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number;
  y: number;
  active: boolean;
  config?: Record<string, unknown>;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type FlowConfig = {
  version: 1;
  status: FlowStatus;
  nodes: FlowNode[];
  edges: FlowEdge[];
  updatedAt: string;
};

type PackKey = "PIRELLI" | "KFC_RGM_2026" | "WURTH_KICKOFF" | "AUTO";

function node(
  id: string,
  type: FlowNodeType,
  label: string,
  x: number,
  y: number,
  config?: Record<string, unknown>
): FlowNode {
  return { id, type, label, x, y, active: true, config };
}

function edge(id: string, source: string, target: string, label?: string): FlowEdge {
  return { id, source, target, label };
}

function packPirelli(eventTitle: string): FlowConfig {
  const nodes = [
    node("t1", "trigger", "Registration Submitted", 100, 120, { templateKey: "registration_submitted" }),
    node("c1", "condition", "If VIP", 380, 120, { templateKey: "if_vip" }),
    node("a1", "action", "Send Email", 670, 45, {
      templateKey: "send_email",
      subject: `Welcome VIP - ${eventTitle}`,
      body: "Ciao {{firstName}}, grazie per la registrazione VIP a {{eventTitle}}. Il tuo account manager ti contattera entro 24h.",
    }),
    node("a2", "action", "Assign Hotel Offer", 670, 200, { templateKey: "assign_hotel", approveFirst: true }),
    node("ai1", "ai_action", "Suggest Next Action", 960, 120, { templateKey: "ai_next_action", approveFirst: true }),
    node("a3", "action", "Notify Internal Team", 1240, 120, { templateKey: "notify_team" }),
    node("a4", "action", "Activate Check-in", 1520, 120, { templateKey: "activate_checkin" }),
    node("a5", "action", "End Flow", 1780, 120, { templateKey: "end_flow" }),
  ];
  const edges = [
    edge("e1", "t1", "c1"),
    edge("e2", "c1", "a1", "true"),
    edge("e3", "c1", "a2", "false"),
    edge("e4", "a1", "ai1"),
    edge("e5", "a2", "ai1"),
    edge("e6", "ai1", "a3"),
    edge("e7", "a3", "a4"),
    edge("e8", "a4", "a5"),
  ];
  return { version: 1, status: "PUBLISHED", nodes, edges, updatedAt: new Date().toISOString() };
}

function packKfc(eventTitle: string): FlowConfig {
  const nodes = [
    node("t1", "trigger", "Registration Submitted", 100, 160, { templateKey: "registration_submitted" }),
    node("a1", "action", "Assign Registration Path", 380, 160, { templateKey: "assign_form" }),
    node("a2", "action", "Send Email", 660, 160, {
      templateKey: "send_email",
      subject: `KFC RGM 2026 - Conferma registrazione`,
      body: "Ciao {{firstName}}, registrazione ricevuta per {{eventTitle}}. Riceverai agenda e dettagli logistici a breve.",
    }),
    node("t2", "trigger", "Guest Status Updated", 100, 360, { templateKey: "guest_status_updated" }),
    node("c1", "condition", "If Capacity Exceeded", 380, 360, { templateKey: "if_capacity" }),
    node("a3", "action", "Update Guest Status", 660, 300, { templateKey: "update_guest_status", status: "WAITLIST" }),
    node("a4", "action", "Send Email", 660, 430, {
      templateKey: "send_email",
      subject: `${eventTitle} - Aggiornamento stato`,
      body: "Ciao {{firstName}}, abbiamo aggiornato il tuo stato registrazione per {{eventTitle}}. Controlla la tua area partecipante.",
      approveFirst: true,
    }),
    node("a5", "action", "Notify Internal Team", 950, 360, { templateKey: "notify_team" }),
  ];
  const edges = [
    edge("e1", "t1", "a1"),
    edge("e2", "a1", "a2"),
    edge("e3", "t2", "c1"),
    edge("e4", "c1", "a3", "true"),
    edge("e5", "c1", "a4", "false"),
    edge("e6", "a3", "a5"),
    edge("e7", "a4", "a5"),
  ];
  return { version: 1, status: "PUBLISHED", nodes, edges, updatedAt: new Date().toISOString() };
}

function packWurth(eventTitle: string): FlowConfig {
  const nodes = [
    node("t1", "trigger", "Registration Submitted", 80, 120, { templateKey: "registration_submitted" }),
    node("a1", "action", "Send Transport Request", 350, 70, { templateKey: "send_transport_request", approveFirst: true }),
    node("a2", "action", "Assign Hotel Offer", 350, 180, { templateKey: "assign_hotel" }),
    node("a3", "action", "Send Email", 620, 120, {
      templateKey: "send_email",
      subject: `${eventTitle} - Dettagli ospitalita`,
      body: "Ciao {{firstName}}, stiamo finalizzando trasporto e ospitalita per {{eventTitle}}. Ti aggiorniamo presto con i dettagli.",
    }),
    node("t2", "trigger", "Check-in Completed", 80, 340, { templateKey: "checkin_completed" }),
    node("a4", "action", "Send Email", 350, 340, {
      templateKey: "send_email",
      subject: `${eventTitle} - Grazie per il check-in`,
      body: "Ciao {{firstName}}, check-in completato con successo per {{eventTitle}}. Buon evento!",
    }),
    node("ai1", "ai_action", "Summarize Guest Data", 620, 340, { templateKey: "ai_missing_data", approveFirst: true }),
    node("a5", "action", "Notify Internal Team", 900, 340, { templateKey: "notify_team" }),
  ];
  const edges = [
    edge("e1", "t1", "a1"),
    edge("e2", "t1", "a2"),
    edge("e3", "a1", "a3"),
    edge("e4", "a2", "a3"),
    edge("e5", "t2", "a4"),
    edge("e6", "a4", "ai1"),
    edge("e7", "ai1", "a5"),
  ];
  return { version: 1, status: "PUBLISHED", nodes, edges, updatedAt: new Date().toISOString() };
}

function detectPack(eventTitle: string): Exclude<PackKey, "AUTO"> {
  const t = eventTitle.toLowerCase();
  if (t.includes("pirelli")) return "PIRELLI";
  if (t.includes("kfc") || t.includes("rgm")) return "KFC_RGM_2026";
  if (t.includes("wurth") || t.includes("kick-off") || t.includes("kick off")) return "WURTH_KICKOFF";
  return "PIRELLI";
}

function buildPack(pack: Exclude<PackKey, "AUTO">, eventTitle: string): FlowConfig {
  if (pack === "KFC_RGM_2026") return packKfc(eventTitle);
  if (pack === "WURTH_KICKOFF") return packWurth(eventTitle);
  return packPirelli(eventTitle);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true, title: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const selectedPack = String(body.pack ?? "AUTO").toUpperCase() as PackKey;
  const resolvedPack = selectedPack === "AUTO" ? detectPack(event.title) : (selectedPack as Exclude<PackKey, "AUTO">);

  const config = buildPack(resolvedPack, event.title);

  await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW" } },
    create: { eventId: id, pluginType: "EVENT_FLOW", enabled: true, config: JSON.stringify(config) },
    update: { enabled: true, config: JSON.stringify(config) },
  });

  await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW_POLICY" } },
    create: { eventId: id, pluginType: "EVENT_FLOW_POLICY", enabled: true, config: JSON.stringify({ approveFirstCritical: true }) },
    update: { enabled: true, config: JSON.stringify({ approveFirstCritical: true }) },
  });

  return NextResponse.json({ success: true, pack: resolvedPack, config });
}
