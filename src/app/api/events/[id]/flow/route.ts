import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

type PhormaNodeType =
  | "trigger" | "email" | "form" | "condition" | "wait" | "manual" | "masterlist" | "agent" | "end";

const VALID_NODE_TYPES = new Set<PhormaNodeType>([
  "trigger", "email", "form", "condition", "wait", "manual", "masterlist", "agent", "end",
]);

function isNodeType(v: unknown): v is PhormaNodeType {
  return typeof v === "string" && VALID_NODE_TYPES.has(v as PhormaNodeType);
}

type FlowNode = {
  id: string;
  type: PhormaNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    active: boolean;
    nodeKey?: string;
    agentType?: string;
    config?: Record<string, unknown>;
  };
  [key: string]: unknown;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  [key: string]: unknown;
};

type FlowStatus = "DRAFT" | "PUBLISHED";

type EventFlowConfig = {
  version: 2;
  status: FlowStatus;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
  updatedAt: string;
};

const MAX_NODES = 300;
const MAX_EDGES = 600;

function sanitizeNode(n: unknown): FlowNode | null {
  if (!n || typeof n !== "object") return null;
  const node = n as Record<string, unknown>;
  if (!isNodeType(node.type)) return null;
  if (!node.id || typeof node.id !== "string") return null;

  const pos = (node.position && typeof node.position === "object") ? node.position as Record<string, unknown> : {};
  const rawData = (node.data && typeof node.data === "object") ? node.data as Record<string, unknown> : {};

  return {
    id: node.id.slice(0, 80),
    type: node.type,
    position: {
      x: Number.isFinite(pos.x) ? Number(pos.x) : 0,
      y: Number.isFinite(pos.y) ? Number(pos.y) : 0,
    },
    data: {
      label: typeof rawData.label === "string" ? rawData.label.slice(0, 120) : "Node",
      active: rawData.active !== false,
      nodeKey: typeof rawData.nodeKey === "string" ? rawData.nodeKey : undefined,
      agentType: typeof rawData.agentType === "string" ? rawData.agentType : undefined,
      config: rawData.config && typeof rawData.config === "object" ? rawData.config as Record<string, unknown> : {},
    },
    // preserve selected/measured etc for xyflow
    ...(node.selected !== undefined ? { selected: node.selected } : {}),
    ...(node.measured !== undefined ? { measured: node.measured } : {}),
  };
}

function sanitizeEdge(e: unknown, nodeIds: Set<string>): FlowEdge | null {
  if (!e || typeof e !== "object") return null;
  const edge = e as Record<string, unknown>;
  if (!edge.id || typeof edge.id !== "string") return null;
  if (!edge.source || !edge.target || typeof edge.source !== "string" || typeof edge.target !== "string") return null;
  if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return null;
  return {
    id: edge.id.slice(0, 80),
    source: edge.source,
    target: edge.target,
    ...(typeof edge.sourceHandle === "string" ? { sourceHandle: edge.sourceHandle } : {}),
    ...(typeof edge.targetHandle === "string" ? { targetHandle: edge.targetHandle } : {}),
    ...(typeof edge.type === "string" ? { type: edge.type } : {}),
    ...(typeof edge.animated === "boolean" ? { animated: edge.animated } : {}),
    ...(edge.style ? { style: edge.style } : {}),
    ...(edge.markerEnd ? { markerEnd: edge.markerEnd } : {}),
  };
}

function emptyConfig(): EventFlowConfig {
  return { version: 2, status: "DRAFT", nodes: [], edges: [], updatedAt: new Date().toISOString() };
}

function parseConfig(raw: string | null): EventFlowConfig {
  if (!raw) return emptyConfig();
  try {
    const parsed = JSON.parse(raw) as Partial<EventFlowConfig>;
    const nodes = Array.isArray(parsed.nodes)
      ? parsed.nodes.slice(0, MAX_NODES).map(sanitizeNode).filter(Boolean) as FlowNode[]
      : [];
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = Array.isArray(parsed.edges)
      ? parsed.edges.slice(0, MAX_EDGES).map((e) => sanitizeEdge(e, nodeIds)).filter(Boolean) as FlowEdge[]
      : [];
    const viewport = parsed.viewport && typeof parsed.viewport === "object" ? parsed.viewport : undefined;
    return {
      version: 2,
      status: parsed.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      nodes,
      edges,
      ...(viewport ? { viewport } : {}),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyConfig();
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true, title: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW" } },
  });

  return NextResponse.json({
    eventId: id,
    eventTitle: event.title,
    ...parseConfig(plugin?.config ?? null),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Partial<EventFlowConfig>;
  const nodes = Array.isArray(body.nodes)
    ? body.nodes.slice(0, MAX_NODES).map(sanitizeNode).filter(Boolean) as FlowNode[]
    : [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(body.edges)
    ? body.edges.slice(0, MAX_EDGES).map((e) => sanitizeEdge(e, nodeIds)).filter(Boolean) as FlowEdge[]
    : [];

  const config: EventFlowConfig = {
    version: 2,
    status: body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    nodes,
    edges,
    ...(body.viewport ? { viewport: body.viewport } : {}),
    updatedAt: new Date().toISOString(),
  };

  const plugin = await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW" } },
    create: { eventId: id, pluginType: "EVENT_FLOW", enabled: true, config: JSON.stringify(config) },
    update: { enabled: true, config: JSON.stringify(config) },
  });

  return NextResponse.json(parseConfig(plugin.config));
}
