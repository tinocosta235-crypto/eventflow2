import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

// POST /api/events/[id]/flow/template
// Generates a standard v2 flow for each event group:
//   Trigger(guest_imported) → Condition(group X?) → yes → Email(invite) → Condition(email_behavior) → 3 branches
// Overwrites the existing flow unless ?merge=true is passed.

type V2Node = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    active: boolean;
    nodeKey?: string;
    config?: Record<string, unknown>;
  };
};

type V2Edge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
};

function n(id: string, type: string, x: number, y: number, data: V2Node["data"]): V2Node {
  return { id, type, position: { x, y }, data };
}

function e(id: string, src: string, tgt: string, handle?: string): V2Edge {
  return { id, source: src, target: tgt, sourceHandle: handle ?? undefined };
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

  const groups = await prisma.eventGroup.findMany({
    where: { eventId: id },
    orderBy: { order: "asc" },
    select: { id: true, name: true, color: true },
  });

  // Find email templates for labeling
  const emailTemplates = await prisma.emailTemplate.findMany({
    where: { eventId: id },
    select: { id: true, name: true, subject: true },
    orderBy: { createdAt: "asc" },
  });

  const nodes: V2Node[] = [];
  const edges: V2Edge[] = [];

  // Layout constants
  const COL_W = 380;       // horizontal spacing per group column
  const ROW_H = 160;       // vertical spacing between rows
  const START_X = 80;
  const START_Y = 60;

  // One shared trigger
  const triggerId = "t_import";
  nodes.push(n(triggerId, "trigger", START_X + (groups.length * COL_W) / 2 - COL_W / 2, START_Y, {
    label: "Import partecipanti",
    active: true,
    nodeKey: "guest_imported",
  }));

  if (groups.length === 0) {
    // No groups — build a minimal generic flow
    const condId = "c_email_1";
    const emailInvId = "e_invite_1";
    const emailConfId = "e_confirm_1";
    const emailRemId = "e_reminder_1";
    const manualId = "m_noaction_1";

    nodes.push(
      n(emailInvId, "email", START_X, START_Y + ROW_H, { label: "Invia email invito", active: true, config: {} }),
      n(condId, "condition", START_X, START_Y + ROW_H * 2, { label: "Risposta email?", active: true, config: { condType: "email_behavior", timeoutHours: 48 } }),
      n(emailConfId, "email", START_X - 140, START_Y + ROW_H * 3, { label: "Email conferma", active: true, config: {} }),
      n(emailRemId, "email", START_X, START_Y + ROW_H * 3, { label: "Email reminder", active: true, config: {} }),
      n(manualId, "manual", START_X + 140, START_Y + ROW_H * 3, { label: "Azione manuale", active: true, config: { task: "Contattare partecipante", priority: "media" } }),
    );
    edges.push(
      e("e_t_inv", triggerId, emailInvId),
      e("e_inv_c", emailInvId, condId),
      e("e_c_comp", condId, emailConfId, "completed"),
      e("e_c_open", condId, emailRemId, "opened"),
      e("e_c_none", condId, manualId, "no_action"),
    );
  } else {
    groups.forEach((group, i) => {
      const gx = START_X + i * COL_W;
      const gy = START_Y;

      const condGroupId   = `cg_${group.id}`;
      const emailInvId    = `einv_${group.id}`;
      const condEmailId   = `ce_${group.id}`;
      const emailConfId   = `econf_${group.id}`;
      const emailRemId    = `erem_${group.id}`;
      const manualId      = `man_${group.id}`;

      // Find invite template for this group if any
      const inviteTemplate = emailTemplates.find(t =>
        t.name.toLowerCase().includes(group.name.toLowerCase()) &&
        (t.name.toLowerCase().includes("invito") || t.name.toLowerCase().includes("invite"))
      ) ?? null;

      nodes.push(
        n(condGroupId, "condition", gx, gy + ROW_H, {
          label: `Gruppo: ${group.name}?`,
          active: true,
          config: { condType: "group", groupId: group.id, groupName: group.name },
        }),
        n(emailInvId, "email", gx, gy + ROW_H * 2, {
          label: `Invito — ${group.name}`,
          active: true,
          config: { emailTemplateId: inviteTemplate?.id ?? null, subject: `Invito — ${event.title}` },
        }),
        n(condEmailId, "condition", gx, gy + ROW_H * 3, {
          label: "Risposta email?",
          active: true,
          config: { condType: "email_behavior", timeoutHours: 48 },
        }),
        n(emailConfId, "email", gx - 130, gy + ROW_H * 4, {
          label: "Conferma registrazione",
          active: true,
          config: { subject: `Conferma — ${event.title}` },
        }),
        n(emailRemId, "email", gx, gy + ROW_H * 4, {
          label: "Reminder apertura",
          active: true,
          config: { subject: `Reminder — ${event.title}` },
        }),
        n(manualId, "manual", gx + 130, gy + ROW_H * 4, {
          label: "Azione manuale",
          active: true,
          config: { task: `Follow-up ${group.name} — nessuna risposta`, priority: "media" },
        }),
      );

      // Trigger → condition gruppo
      edges.push(e(`e_t_cg_${i}`, triggerId, condGroupId));
      // Condition gruppo yes → email invito
      edges.push(e(`e_cg_inv_${i}`, condGroupId, emailInvId, "yes"));
      // Email invito → condition email
      edges.push(e(`e_inv_ce_${i}`, emailInvId, condEmailId));
      // Condition email branches
      edges.push(e(`e_ce_conf_${i}`, condEmailId, emailConfId, "completed"));
      edges.push(e(`e_ce_rem_${i}`,  condEmailId, emailRemId,  "opened"));
      edges.push(e(`e_ce_man_${i}`,  condEmailId, manualId,    "no_action"));
    });
  }

  const flowConfig = {
    version: 2,
    status: "DRAFT",
    nodes,
    edges,
    updatedAt: new Date().toISOString(),
  };

  await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW" } },
    create: { eventId: id, pluginType: "EVENT_FLOW", enabled: true, config: JSON.stringify(flowConfig) },
    update: { enabled: true, config: JSON.stringify(flowConfig) },
  });

  return NextResponse.json({ success: true, groups: groups.length, nodes: nodes.length, edges: edges.length });
}

// DELETE /api/events/[id]/flow/template — reset flow to empty
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlanner();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: auth.orgId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const empty = { version: 2, status: "DRAFT", nodes: [], edges: [], updatedAt: new Date().toISOString() };
  await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: id, pluginType: "EVENT_FLOW" } },
    create: { eventId: id, pluginType: "EVENT_FLOW", enabled: true, config: JSON.stringify(empty) },
    update: { config: JSON.stringify(empty) },
  });

  return NextResponse.json({ success: true });
}
