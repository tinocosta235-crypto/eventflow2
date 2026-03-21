import "server-only";
import { prisma } from "@/lib/db";
import { buildCustomEmail, sendEmail } from "@/lib/email";
import {
  parseRegistrationPathsConfig,
  resolveRegistrationPathByGroup,
  resolveRegistrationPathById,
  type RegistrationPath,
} from "@/lib/registration-paths";

// ── Internal types ─────────────────────────────────────────────────────────────

type FlowNodeType =
  | "trigger" | "email" | "form" | "condition" | "wait" | "manual" | "masterlist" | "agent" | "end"
  // v1 legacy types
  | "action" | "ai_action" | "manual_action" | "update_masterlist";

type FlowStatus = "DRAFT" | "PUBLISHED";

/** Normalized internal node — works for both v1 and v2 wire formats */
type FlowNode = {
  id: string;
  type: FlowNodeType;
  label: string;
  active: boolean;
  nodeKey?: string;   // v2: trigger key, was config.templateKey in v1
  agentType?: string; // v2: agent sub-type
  config?: Record<string, unknown>;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
};

type FlowConfig = {
  version: 1 | 2;
  status: FlowStatus;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type RuntimeRun = {
  id: string;
  at: string;
  eventId: string;
  trigger: string;
  registrationId?: string;
  executedNodes: string[];
  sentEmails: number;
  notes: string[];
};

type RuntimeConfig = { runs: RuntimeRun[] };

type TriggerContext = {
  eventId: string;
  trigger: string;
  registrationId?: string;
  payload?: Record<string, unknown>;
  /** Skip PUBLISHED check — for manual tests from the builder */
  force?: boolean;
};

type FlowPolicy = { approveFirstCritical: boolean };

// ── Node normalization (v1 flat ↔ v2 @xyflow/react) ───────────────────────────

function normalizeNode(raw: Record<string, unknown>): FlowNode | null {
  const id = typeof raw.id === "string" ? raw.id.slice(0, 80) : null;
  if (!id) return null;

  const type = raw.type as FlowNodeType | undefined;
  if (!type) return null;

  // v2: data is in raw.data (xyflow Node<PhormaNodeData>)
  const hasData = raw.data && typeof raw.data === "object";
  const data = hasData ? (raw.data as Record<string, unknown>) : raw;

  const label = typeof data.label === "string" ? data.label.slice(0, 120) : "Node";
  const active = data.active !== false;
  const nodeKey = typeof data.nodeKey === "string" ? data.nodeKey : typeof raw.nodeKey === "string" ? raw.nodeKey : undefined;
  const agentType = typeof data.agentType === "string" ? data.agentType : undefined;
  const config = (data.config && typeof data.config === "object")
    ? (data.config as Record<string, unknown>)
    : (!hasData && raw.config && typeof raw.config === "object")
      ? (raw.config as Record<string, unknown>)
      : {};

  return { id, type, label, active, nodeKey, agentType, config };
}

function parseFlow(raw: string | null): FlowConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FlowConfig> & { nodes?: unknown[]; edges?: unknown[] };
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;

    const nodes: FlowNode[] = [];
    for (const n of parsed.nodes) {
      if (!n || typeof n !== "object") continue;
      const normalized = normalizeNode(n as Record<string, unknown>);
      if (normalized) nodes.push(normalized);
    }

    const edges: FlowEdge[] = [];
    for (const e of parsed.edges) {
      if (!e || typeof e !== "object") continue;
      const edge = e as Partial<FlowEdge>;
      if (!edge.id || !edge.source || !edge.target) continue;
      edges.push({
        id: String(edge.id).slice(0, 80),
        source: String(edge.source),
        target: String(edge.target),
        sourceHandle: edge.sourceHandle ? String(edge.sourceHandle) : undefined,
        label: edge.label ? String(edge.label).slice(0, 40) : undefined,
      });
    }

    return {
      version: parsed.version === 2 ? 2 : 1,
      status: parsed.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      nodes,
      edges,
    };
  } catch {
    return null;
  }
}

function parseRuntime(raw: string | null): RuntimeConfig {
  if (!raw) return { runs: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
    return { runs: Array.isArray(parsed.runs) ? parsed.runs : [] };
  } catch {
    return { runs: [] };
  }
}

// ── Trigger matching ───────────────────────────────────────────────────────────

// Maps old trigger keys to new ones for backwards compatibility
const TRIGGER_ALIASES: Record<string, string> = {
  registration_submitted: "registration_submitted",
  guest_imported:         "guest_imported",
  guest_group_assigned:   "guest_group_assigned",
  invite_sent:            "invite_sent",
  checkin_completed:      "checkin_completed",
  date_reached:           "date_reached",
  scheduled_daily:        "scheduled_daily",
  // legacy v1 keys
  rsvp_confirmed:         "invite_sent",
  guest_status_updated:   "guest_group_assigned",
  email_opened:           "invite_sent",
  event_created:          "scheduled_daily",
};

function triggerMatches(node: FlowNode, trigger: string) {
  if (node.type !== "trigger") return false;
  // v2: nodeKey is the trigger type directly (e.g. "registration_submitted")
  const rawKey = (node.nodeKey ?? String(node.config?.trigger ?? node.config?.templateKey ?? "")).toLowerCase();
  const key = TRIGGER_ALIASES[rawKey] ?? rawKey;
  const normalizedTrigger = (TRIGGER_ALIASES[trigger.toLowerCase()] ?? trigger).toLowerCase();
  if (key && key === normalizedTrigger) return true;

  // For group_assigned trigger: check targetGroupId filter
  if (key === "guest_group_assigned" && normalizedTrigger === "guest_group_assigned") {
    const targetGroupId = String(node.config?.targetGroupId ?? "").trim();
    if (targetGroupId) {
      // will be checked in matchesRegistrationPath — return true here, filter later
    }
    return true;
  }

  const normalizedLabel = node.label.toLowerCase().replace(/\s+/g, "_");
  return normalizedLabel.includes(normalizedTrigger);
}

// ── Condition evaluation ───────────────────────────────────────────────────────

function evaluateConditionRule(params: {
  config?: Record<string, unknown>;
  registration: {
    status: string; firstName: string; lastName: string; email: string;
    groupId?: string | null;
    fields?: Array<{ value: string | null; fieldId: string }>;
  } | null;
  registrationPaths?: RegistrationPath[];
}) {
  const source = String(params.config?.conditionSource ?? "").trim();
  const operator = String(params.config?.conditionOperator ?? "equals").trim().toLowerCase();
  const expected = String(params.config?.conditionValue ?? "").trim().toLowerCase();
  const customFieldMap = new Map((params.registration?.fields ?? []).map((f) => [f.fieldId, String(f.value ?? "")]));
  const resolvedPath =
    params.registration?.groupId && params.registrationPaths
      ? resolveRegistrationPathByGroup(params.registrationPaths, params.registration.groupId)
      : null;

  let current = "";
  if (source === "registration.status") current = String(params.registration?.status ?? "");
  else if (source === "registration.groupId") current = String(params.registration?.groupId ?? "");
  else if (source === "registration.pathId") current = String(resolvedPath?.id ?? "");
  else if (source === "registration.pathName") current = String(resolvedPath?.name ?? "");
  else if (source === "registration.firstName") current = String(params.registration?.firstName ?? "");
  else if (source === "registration.lastName") current = String(params.registration?.lastName ?? "");
  else if (source === "registration.email") current = String(params.registration?.email ?? "");
  else if (source.startsWith("field:")) current = String(customFieldMap.get(source.slice(6)) ?? "");

  const c = current.trim().toLowerCase();
  if (operator === "equals") return c === expected;
  if (operator === "not_equals") return c !== expected;
  if (operator === "contains") return c.includes(expected);
  if (operator === "not_contains") return !c.includes(expected);
  if (operator === "is_empty") return c === "";
  if (operator === "is_not_empty") return c !== "";
  if (operator === "greater_than") return parseFloat(c) > parseFloat(expected);
  if (operator === "less_than") return parseFloat(c) < parseFloat(expected);
  return true;
}

function evaluateConditionRules(params: {
  node: FlowNode;
  registration: {
    status: string; firstName: string; lastName: string; email: string;
    groupId?: string | null;
    fields?: Array<{ value: string | null; fieldId: string }>;
  } | null;
  registrationPaths?: RegistrationPath[];
}) {
  // v2 field condition: node.config has field/operator/value
  if (params.node.config?.condType === "field") {
    const rule = {
      conditionSource: `field:${params.node.config.field ?? ""}`,
      conditionOperator: params.node.config.operator ?? "equals",
      conditionValue: params.node.config.value ?? "",
    };
    return evaluateConditionRule({ config: rule, registration: params.registration, registrationPaths: params.registrationPaths });
  }

  // v1 conditionRules array
  const rawRules = Array.isArray(params.node.config?.conditionRules) ? params.node.config?.conditionRules : null;
  const rules = rawRules && rawRules.length > 0
    ? rawRules.map((rule) => {
        const record = (rule ?? {}) as Record<string, unknown>;
        return { conditionSource: record.source, conditionOperator: record.operator, conditionValue: record.value };
      })
    : [params.node.config ?? {}];
  const results = rules.map((ruleConfig) =>
    evaluateConditionRule({ config: ruleConfig, registration: params.registration, registrationPaths: params.registrationPaths })
  );
  const logic = String(params.node.config?.conditionLogic ?? "AND").toUpperCase();
  return logic === "OR" ? results.some(Boolean) : results.every(Boolean);
}

function matchesRegistrationPath(node: FlowNode, registration: { groupId: string | null } | null) {
  const pathGroupId = String(node.config?.pathGroupId ?? "").trim();
  if (!pathGroupId) return true;
  if (!registration?.groupId) return false;
  return registration.groupId === pathGroupId;
}

// ── Persistence helpers ────────────────────────────────────────────────────────

async function appendRuntimeRun(eventId: string, run: RuntimeRun) {
  const plugin = await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId, pluginType: "EVENT_FLOW_RUNTIME" } },
    update: {},
    create: { eventId, pluginType: "EVENT_FLOW_RUNTIME", enabled: true, config: JSON.stringify({ runs: [] }) },
  });
  const parsed = parseRuntime(plugin.config);
  const runs = [run, ...parsed.runs].slice(0, 200);
  await prisma.eventPlugin.update({ where: { id: plugin.id }, data: { config: JSON.stringify({ runs }) } });
}

async function readFlowPolicy(eventId: string): Promise<FlowPolicy> {
  const plugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId, pluginType: "EVENT_FLOW_POLICY" } },
  });
  if (!plugin?.config) return { approveFirstCritical: false };
  try {
    const parsed = JSON.parse(plugin.config) as Partial<FlowPolicy>;
    return { approveFirstCritical: parsed.approveFirstCritical === true };
  } catch {
    return { approveFirstCritical: false };
  }
}

async function enqueueApproval(params: {
  eventId: string;
  actionType: "EMAIL_SEND" | "FLOW_ACTION";
  title: string;
  payload: Record<string, unknown>;
}) {
  const plugin = await prisma.eventPlugin.upsert({
    where: { eventId_pluginType: { eventId: params.eventId, pluginType: "AI_APPROVALS" } },
    update: {},
    create: { eventId: params.eventId, pluginType: "AI_APPROVALS", enabled: true, config: JSON.stringify({ items: [] }) },
  });
  let items: Array<Record<string, unknown>> = [];
  try {
    const parsed = JSON.parse(plugin.config) as { items?: Array<Record<string, unknown>> };
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } catch { items = []; }
  const item = {
    id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actionType: params.actionType,
    title: params.title,
    status: "PENDING",
    payload: params.payload,
    requestedBy: "event_flow_runtime",
    createdAt: new Date().toISOString(),
  };
  await prisma.eventPlugin.update({
    where: { id: plugin.id },
    data: { config: JSON.stringify({ items: [item, ...items].slice(0, 100) }) },
  });
}

// ── Main runtime ───────────────────────────────────────────────────────────────

export async function runEventFlowTrigger(ctx: TriggerContext) {
  const flowPlugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: ctx.eventId, pluginType: "EVENT_FLOW" } },
  });
  const flow = parseFlow(flowPlugin?.config ?? null);
  if (!flow) return null;
  if (!ctx.force && flow.status !== "PUBLISHED") return null;
  const policy = await readFlowPolicy(ctx.eventId);

  const event = await prisma.event.findUnique({ where: { id: ctx.eventId }, select: { id: true, title: true } });
  if (!event) return;

  const registration = ctx.registrationId
    ? await prisma.registration.findUnique({
        where: { id: ctx.registrationId },
        select: { id: true, firstName: true, lastName: true, email: true, status: true, groupId: true, eventId: true,
          fields: { select: { fieldId: true, value: true } } },
      })
    : null;

  const eventGroups = await prisma.eventGroup.findMany({
    where: { eventId: ctx.eventId }, orderBy: { order: "asc" }, select: { id: true, name: true },
  });
  const pathPlugin = await prisma.eventPlugin.findUnique({
    where: { eventId_pluginType: { eventId: ctx.eventId, pluginType: "REGISTRATION_PATHS" } },
  });
  const registrationPaths = parseRegistrationPathsConfig(pathPlugin?.config ?? null, eventGroups).paths;

  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of flow.edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  const queue = flow.nodes
    .filter((n) => n.active !== false && triggerMatches(n, ctx.trigger) && matchesRegistrationPath(n, registration))
    .map((n) => n.id);
  const visited = new Set<string>();
  const executedNodes: string[] = [];
  const notes: string[] = [];
  let sentEmails = 0;

  while (queue.length) {
    const nodeId = queue.shift() as string;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node || node.active === false) continue;
    if (!matchesRegistrationPath(node, registration)) continue;

    executedNodes.push(node.label);

    // ── end node ──────────────────────────────────────────────────────────────
    if (node.type === "end") {
      notes.push(`[END] ${node.label}`);
      break; // stop processing this path
    }

    // ── condition node ────────────────────────────────────────────────────────
    if (node.type === "condition") {
      const condType = String(node.config?.condType ?? "email_behavior");
      const nextEdges = outgoing.get(node.id) ?? [];

      // ── group condition: yes/no based on single groupId ─────────────────
      if (condType === "group") {
        const targetGroupId = String(node.config?.groupId ?? "").trim();
        const inGroup = targetGroupId ? registration?.groupId === targetGroupId : false;
        for (const e of nextEdges) {
          const handle = e.sourceHandle ?? "";
          if ((inGroup && handle === "yes") || (!inGroup && handle === "no") || handle === "else") {
            queue.push(e.target);
          }
        }
        continue;
      }

      // ── field / email_behavior condition ─────────────────────────────────
      const key = String(node.config?.templateKey ?? "").toLowerCase();
      let pass = true;

      const conditionMode = String(node.config?.conditionMode ?? (node.config?.conditionSource || condType === "field" ? "RULE" : "PRESET")).toUpperCase();
      if (conditionMode === "RULE" || node.config?.condType) {
        pass = evaluateConditionRules({ node, registration, registrationPaths });
      } else if (key === "if_vip") {
        pass = String(registration?.groupId ?? "").toLowerCase().includes("vip");
      } else if (key === "if_capacity") {
        const ev = await prisma.event.findUnique({
          where: { id: ctx.eventId }, select: { capacity: true, currentCount: true },
        });
        pass = !!ev?.capacity && ev.currentCount >= ev.capacity;
      }

      if (nextEdges.length) {
        for (const e of nextEdges) {
          const handle = e.sourceHandle ?? "";
          const label = String(e.label ?? "").toLowerCase();
          // v2 condition handles: "yes"/"no"/"else" for field, "completed"/"clicked"/"opened"/"no_action" for email
          if (handle) {
            if ((pass && (handle === "yes" || handle === "completed" || handle === "clicked" || handle === "opened")) ||
                (!pass && (handle === "no" || handle === "no_action")) ||
                handle === "else") {
              queue.push(e.target);
            }
          } else if (nextEdges.length === 1) {
            if (pass) queue.push(e.target);
          } else {
            if (!label || (pass && label !== "false") || (!pass && label !== "true")) {
              queue.push(e.target);
            }
          }
        }
      }
      continue;
    }

    // ── wait node ─────────────────────────────────────────────────────────────
    if (node.type === "wait") {
      try {
        const waitType = String(node.config?.waitType ?? "duration");
        let blockedReason = "wait_duration";
        if (waitType === "duration") {
          const amount = Number(node.config?.amount ?? node.config?.waitAmount ?? 1);
          const unit = String(node.config?.unit ?? node.config?.waitUnit ?? "hours");
          blockedReason = `wait_${amount}_${unit}`;
        } else if (waitType === "until_date") {
          blockedReason = `wait_until_${node.config?.untilDate ?? node.config?.waitUntil ?? ""}`;
        } else if (waitType === "until_event") {
          blockedReason = `wait_event_${node.config?.untilEvent ?? node.config?.waitEvent ?? "form_submitted"}`;
        }
        if (ctx.registrationId) {
          await prisma.flowNodeInstance.upsert({
            where: { nodeId_registrationId: { nodeId: node.id, registrationId: ctx.registrationId } },
            create: { eventId: ctx.eventId, nodeId: node.id, registrationId: ctx.registrationId, status: "BLOCKED", blockedReason, startedAt: new Date() },
            update: { status: "BLOCKED", blockedReason, startedAt: new Date() },
          });
        }
        notes.push(`[WAIT] ${node.label} — blocked: ${blockedReason}`);
      } catch { /* non-blocking */ }
      continue;
    }

    // ── manual node ───────────────────────────────────────────────────────────
    if ((node.type === "manual" || node.type === "manual_action") && ctx.registrationId) {
      try {
        const nodeInstance = await prisma.flowNodeInstance.upsert({
          where: { nodeId_registrationId: { nodeId: node.id, registrationId: ctx.registrationId } },
          create: { eventId: ctx.eventId, nodeId: node.id, registrationId: ctx.registrationId, status: "BLOCKED", blockedReason: "manual_task_pending", startedAt: new Date() },
          update: { status: "BLOCKED", blockedReason: "manual_task_pending" },
        });
        const taskTitle = String(node.config?.task ?? node.config?.taskTitle ?? node.label)
          .replace(/\{\{firstName\}\}/g, registration?.firstName ?? "")
          .replace(/\{\{lastName\}\}/g, registration?.lastName ?? "");
        const daysToAdd = Number(node.config?.dueDays ?? node.config?.taskDueDays ?? 0);
        const dueAt = daysToAdd > 0 ? new Date(Date.now() + daysToAdd * 86400000) : null;
        await prisma.manualActionTask.create({
          data: {
            eventId: ctx.eventId,
            nodeInstanceId: nodeInstance.id,
            registrationId: ctx.registrationId,
            title: taskTitle,
            description: String(node.config?.note ?? node.config?.taskDescription ?? ""),
            priority: String(node.config?.priority ?? node.config?.taskPriority ?? "MEDIUM").toUpperCase(),
            dueAt,
            status: "OPEN",
          },
        });
        notes.push(`[MANUAL] Task creato per ${registration?.firstName ?? "partecipante"}: ${taskTitle}`);
      } catch { /* non-blocking */ }
      continue;
    }

    // ── masterlist node ───────────────────────────────────────────────────────
    if ((node.type === "masterlist" || node.type === "update_masterlist") && ctx.registrationId && registration) {
      // v2 masterlist config: { action, fields: [{field, value, valueSource}], status }
      const masterAction = String(node.config?.action ?? "").toLowerCase();
      if (masterAction === "mark_no_show") {
        await prisma.registration.update({ where: { id: registration.id }, data: { status: "NO_SHOW" } }).catch(() => null);
        notes.push(`[MASTERLIST] Marked no-show`);
      } else if (masterAction === "confirm_registration") {
        await prisma.registration.update({ where: { id: registration.id }, data: { status: "CONFIRMED" } }).catch(() => null);
        notes.push(`[MASTERLIST] Confirmed registration`);
      } else if (masterAction === "update_field" || masterAction === "") {
        const fieldUpdates = Array.isArray(node.config?.fields) ? (node.config.fields as Array<{ field: string; value: string; valueSource?: string }>) :
          Array.isArray(node.config?.fieldUpdates) ? (node.config.fieldUpdates as Array<{ field: string; value: string; valueSource?: string }>) : [];
        const allowedFields = ["status", "notes", "groupId", "company", "jobTitle"];
        for (const upd of fieldUpdates) {
          if (!allowedFields.includes(upd.field)) continue;
          const finalValue = upd.valueSource === "form_field"
            ? (registration.fields?.find((f) => f.fieldId === upd.value)?.value ?? upd.value)
            : upd.value;
          await prisma.registration.update({
            where: { id: ctx.registrationId },
            data: { [upd.field]: finalValue } as Parameters<typeof prisma.registration.update>[0]["data"],
          }).catch(() => null);
          notes.push(`[MASTERLIST] ${upd.field} = ${finalValue}`);
        }
      }
    }

    // ── email node (v2) ───────────────────────────────────────────────────────
    if (node.type === "email" && registration) {
      const approveFirst = node.config?.approveFirst === true || policy.approveFirstCritical;
      const templateId = String(node.config?.emailTemplateId ?? "").trim() || null;
      const selectedTemplate = templateId
        ? await prisma.emailTemplate.findFirst({
            where: { id: templateId, eventId: ctx.eventId },
            select: { id: true, name: true, subject: true, body: true },
          })
        : null;
      const subject = String(selectedTemplate?.subject ?? node.config?.subject ?? `Aggiornamento evento - ${event.title}`);
      const body = String(selectedTemplate?.body ?? node.config?.body ?? "Ciao {{firstName}}, abbiamo un aggiornamento sul tuo evento {{eventTitle}}.");
      if (approveFirst) {
        await enqueueApproval({
          eventId: ctx.eventId, actionType: "EMAIL_SEND",
          title: `[Flow Approval] Email - ${registration.firstName} ${registration.lastName}`,
          payload: { registrationId: registration.id, recipientEmail: registration.email, templateId: selectedTemplate?.id ?? null, subject, body },
        });
        notes.push(`Approval requested for email: ${registration.email}`);
      } else {
        await sendEmail({
          to: registration.email,
          ...buildCustomEmail({ firstName: registration.firstName, lastName: registration.lastName, eventTitle: event.title, subject, body }),
        }).catch(() => null);
        sentEmails += 1;
        await prisma.emailSendLog.create({
          data: { eventId: ctx.eventId, registrationId: registration.id, email: registration.email, subject, templateId: selectedTemplate?.id ?? null, status: "SENT" },
        }).catch(() => null);
      }
    }

    // ── form node (v2) — assign participant to path/group ─────────────────────
    if (node.type === "form" && registration) {
      const pathId = String(node.config?.pathId ?? "").trim() || null;
      if (pathId) {
        const path = resolveRegistrationPathById(registrationPaths, pathId);
        if (path?.groupId) {
          await prisma.registration.update({ where: { id: registration.id }, data: { groupId: path.groupId } }).catch(() => null);
          notes.push(`[FORM] Assigned to path ${path.name}`);
        }
      }
    }

    // ── agent node (v2) ───────────────────────────────────────────────────────
    if ((node.type === "agent" || node.type === "ai_action")) {
      const agentType = node.agentType ?? String(node.config?.templateKey ?? "");
      const mode = String(node.config?.mode ?? "suggest").toLowerCase();
      const approveFirst = mode === "hitl" || node.config?.approveFirst === true || policy.approveFirstCritical;
      if (approveFirst) {
        await enqueueApproval({
          eventId: ctx.eventId, actionType: "FLOW_ACTION",
          title: `[Flow Approval] Agente AI - ${node.label}`,
          payload: { registrationId: registration?.id, agentType, node: node.label },
        });
      } else {
        notes.push(`[AGENT] ${node.label} (${agentType}) — mode: ${mode}`);
      }
    }

    // ── v1 legacy action node ─────────────────────────────────────────────────
    if (node.type === "action" && registration) {
      const key = String(node.config?.templateKey ?? "").toLowerCase();
      const approveFirstNode = node.config?.approveFirst === true || (policy.approveFirstCritical && (key === "send_email" || key === "update_guest_status" || key === "assign_hotel" || key === "send_transport_request"));

      if (key === "send_email") {
        const sendMode = String(node.config?.sendMode ?? "").toUpperCase();
        let templateId = String(node.config?.templateId ?? "").trim() || null;
        if (sendMode === "PATH") {
          const configuredPath =
            resolveRegistrationPathById(registrationPaths, String(node.config?.pathId ?? "").trim() || null) ??
            resolveRegistrationPathByGroup(registrationPaths, registration?.groupId ?? null);
          const pathEmailTemplateKey = String(node.config?.pathEmailTemplateKey ?? "").trim();
          if (configuredPath && pathEmailTemplateKey) {
            const emailMap = configuredPath.emailTemplateIds as Record<string, string | null | undefined>;
            templateId = String(emailMap[pathEmailTemplateKey] ?? "").trim() || null;
          }
        }
        const selectedTemplate = (sendMode === "TEMPLATE" || sendMode === "PATH") && templateId
          ? await prisma.emailTemplate.findFirst({ where: { id: templateId, eventId: ctx.eventId }, select: { id: true, name: true, subject: true, body: true } })
          : null;
        const subject = String(selectedTemplate?.subject ?? node.config?.subject ?? `Aggiornamento evento - ${event.title}`);
        const body = String(selectedTemplate?.body ?? node.config?.body ?? "Ciao {{firstName}}, abbiamo un aggiornamento.");
        if (approveFirstNode) {
          await enqueueApproval({ eventId: ctx.eventId, actionType: "EMAIL_SEND", title: `[Flow Approval] Send Email - ${registration.firstName}`, payload: { registrationId: registration.id, subject, body } });
          notes.push(`Approval requested for email: ${registration.email}`);
        } else {
          await sendEmail({ to: registration.email, ...buildCustomEmail({ firstName: registration.firstName, lastName: registration.lastName, eventTitle: event.title, subject, body }) }).catch(() => null);
          sentEmails += 1;
        }
      }

      if (key === "update_guest_status") {
        const nextStatus = String(node.config?.status ?? "PENDING");
        if (approveFirstNode) {
          await enqueueApproval({ eventId: ctx.eventId, actionType: "FLOW_ACTION", title: `[Flow Approval] Update status to ${nextStatus}`, payload: { registrationId: registration.id, nextStatus } });
        } else {
          await prisma.registration.update({ where: { id: registration.id }, data: { status: nextStatus } }).catch(() => null);
        }
      }
    }

    // ── follow edges ──────────────────────────────────────────────────────────
    for (const edge of outgoing.get(node.id) ?? []) {
      queue.push(edge.target);
    }
  }

  const run: RuntimeRun = {
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    eventId: ctx.eventId,
    trigger: ctx.trigger,
    registrationId: ctx.registrationId,
    executedNodes,
    sentEmails,
    notes,
  };
  await appendRuntimeRun(ctx.eventId, run);
  return run;
}
