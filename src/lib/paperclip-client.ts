// Paperclip HTTP client — wrappa le chiamate all'API di Paperclip (porta 3100)
// Usato da: flow builder, sezioni agente standalone, sistema HiTL
// Docs: https://github.com/paperclipai/paperclip

const PAPERCLIP_URL = process.env.PAPERCLIP_URL ?? "http://localhost:3100"
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY ?? ""
export const PAPERCLIP_INTERNAL_KEY = process.env.PAPERCLIP_INTERNAL_KEY ?? ""

// Budget di default per company evento: €50 = 5000 centesimi
const DEFAULT_EVENT_BUDGET_CENTS = 5000
// Budget di default per agente: €10 = 1000 centesimi
const DEFAULT_AGENT_BUDGET_CENTS = 1000

export type PhormaAgentKey = "flow_consultant" | "report" | "email_analyst" | "form_audit"

function authHeaders() {
  return {
    "content-type": "application/json",
    Authorization: `Bearer ${PAPERCLIP_API_KEY}`,
  }
}

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${PAPERCLIP_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Paperclip API ${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Company (= Evento) ────────────────────────────────────────────────────────

export interface PaperclipCompany {
  id: string
  name: string
  issuePrefix: string
}

export async function createCompany(params: {
  eventId: string
  name: string
  description?: string
  budgetCents?: number
}): Promise<PaperclipCompany> {
  const issuePrefix = params.eventId
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase()
  return call<PaperclipCompany>("/api/companies", "POST", {
    name: params.name,
    description: params.description ?? `Segreteria organizzativa: ${params.name}`,
    issuePrefix,
    budgetMonthlyCents: params.budgetCents ?? DEFAULT_EVENT_BUDGET_CENTS,
  })
}

// ── Agents ────────────────────────────────────────────────────────────────────

export interface PaperclipAgent {
  id: string
  name: string
  role: string
}

export async function createAgent(params: {
  companyId: string
  name: string
  role: string
  title: string
  capabilities: string
  adapterUrl: string
  payloadTemplate: Record<string, string>
  reportsTo?: string | null
  budgetCents?: number
}): Promise<PaperclipAgent> {
  return call<PaperclipAgent>(`/api/companies/${params.companyId}/agents`, "POST", {
    name: params.name,
    role: params.role,
    title: params.title,
    capabilities: params.capabilities,
    adapterType: "http",
    adapterConfig: {
      url: params.adapterUrl,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paperclip-internal-key": PAPERCLIP_INTERNAL_KEY,
      },
      payloadTemplate: params.payloadTemplate,
    },
    budgetMonthlyCents: params.budgetCents ?? DEFAULT_AGENT_BUDGET_CENTS,
    reportsTo: params.reportsTo ?? null,
  })
}

// ── Init company per evento — crea la Company + 4 agenti ─────────────────────

export interface PhormaCompanySetup {
  companyId: string
  agentIds: Record<PhormaAgentKey, string>
}

export async function initEventCompany(params: {
  eventId: string
  orgId: string
  eventTitle: string
  clientName?: string | null
  phormaBaseUrl: string
}): Promise<PhormaCompanySetup> {
  const { eventId, orgId, eventTitle, clientName, phormaBaseUrl } = params

  const company = await createCompany({
    eventId,
    name: `${eventTitle}${clientName ? ` — ${clientName}` : ""}`,
    description: `Gestione segreteria per: ${eventTitle}. Organizzazione event ID: ${orgId}.`,
  })

  const baseUrl = `${phormaBaseUrl}/api/events/${eventId}/ai/agents`

  // CEO: Agente Phorma — Flow Strategist (non riporta a nessuno)
  const flowAgent = await createAgent({
    companyId: company.id,
    name: "Agente Phorma",
    role: "ceo",
    title: "Flow Strategist",
    capabilities:
      "Analisi flow registrazione, ottimizzazione percorsi, gap logici, pattern eventi simili",
    adapterUrl: `${baseUrl}/flow-consultant`,
    payloadTemplate: { eventId, orgId },
    reportsTo: null,
  })

  // Ops Lead: Agente Report — riporta al CEO
  const reportAgent = await createAgent({
    companyId: company.id,
    name: "Agente Report",
    role: "engineer",
    title: "Operations Lead",
    capabilities:
      "Report di segreteria, masterlist, dati evento, hospitality, travel, campagne email",
    adapterUrl: `${baseUrl}/report`,
    payloadTemplate: { eventId, orgId },
    reportsTo: flowAgent.id,
  })

  // Comms Manager: Agente Email — riporta al CEO
  const emailAgent = await createAgent({
    companyId: company.id,
    name: "Agente Email",
    role: "engineer",
    title: "Communications Manager",
    capabilities:
      "Analisi campagne email, open rate, bounce tracking, follow-up proposals, reinvii",
    adapterUrl: `${baseUrl}/email-tracker`,
    payloadTemplate: { eventId, orgId },
    reportsTo: flowAgent.id,
  })

  // Data Analyst: Agente Form — riporta al CEO
  const formAgent = await createAgent({
    companyId: company.id,
    name: "Agente Form",
    role: "engineer",
    title: "Data Analyst",
    capabilities:
      "Audit form registrazione, UX campi, follow-up mapping, segmentazione masterlist",
    adapterUrl: `${baseUrl}/form-audit`,
    payloadTemplate: { eventId, orgId },
    reportsTo: flowAgent.id,
  })

  return {
    companyId: company.id,
    agentIds: {
      flow_consultant: flowAgent.id,
      report: reportAgent.id,
      email_analyst: emailAgent.id,
      form_audit: formAgent.id,
    },
  }
}

// ── Issues (Tasks) ────────────────────────────────────────────────────────────

export interface PaperclipIssue {
  id: string
  identifier: string
  title: string
  status: string
}

export async function createIssue(params: {
  companyId: string
  title: string
  description?: string
  assigneeAgentId?: string | null
  priority?: "critical" | "high" | "medium" | "low"
}): Promise<PaperclipIssue> {
  return call<PaperclipIssue>(`/api/companies/${params.companyId}/issues`, "POST", {
    title: params.title,
    description: params.description ?? "",
    assigneeAgentId: params.assigneeAgentId ?? null,
    priority: params.priority ?? "medium",
    status: "todo",
  })
}

export async function updateIssue(
  issueId: string,
  update: {
    status?: string
    comment?: string
    title?: string
    priority?: string
  }
): Promise<void> {
  await call(`/api/issues/${issueId}`, "PATCH", update)
}

// ── Wake agent on demand ──────────────────────────────────────────────────────

export async function wakeAgent(
  agentId: string,
  params?: { reason?: string; taskId?: string }
): Promise<void> {
  await call(`/api/agents/${agentId}/wake`, "POST", {
    reason: params?.reason ?? "on_demand",
    ...(params?.taskId ? { taskId: params.taskId } : {}),
  })
}

// ── Crea task + sveglia agente (pattern comune) ───────────────────────────────

export async function dispatchAgentTask(params: {
  companyId: string
  agentId: string
  title: string
  description?: string
  priority?: "critical" | "high" | "medium" | "low"
}): Promise<PaperclipIssue> {
  const issue = await createIssue({
    companyId: params.companyId,
    title: params.title,
    description: params.description,
    assigneeAgentId: params.agentId,
    priority: params.priority,
  })
  await wakeAgent(params.agentId, { reason: "assignment", taskId: issue.id })
  return issue
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export interface PaperclipApproval {
  id: string
  type: string
  status: string
  decisionNote?: string
}

export async function getPendingApprovals(companyId: string): Promise<PaperclipApproval[]> {
  return call<PaperclipApproval[]>(`/api/companies/${companyId}/approvals?status=pending`)
}

export async function resolveApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  note?: string
): Promise<void> {
  await call(`/api/approvals/${approvalId}`, "PATCH", {
    status: decision,
    decisionNote: note ?? "",
  })
}

// ── Costi ─────────────────────────────────────────────────────────────────────

export interface CostSummary {
  totalCents: number
  windowSpend?: Record<string, number>
}

export async function getCompanyCosts(companyId: string): Promise<CostSummary> {
  return call<CostSummary>(`/api/companies/${companyId}/costs/summary`)
}

export async function getCompanyDashboard(companyId: string): Promise<Record<string, unknown>> {
  return call<Record<string, unknown>>(`/api/companies/${companyId}/dashboard`)
}

// ── Verifica se Paperclip è disponibile ───────────────────────────────────────

export async function isPaperclipAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${PAPERCLIP_URL}/api/health`, { method: "GET" })
    return res.ok
  } catch {
    return false
  }
}
