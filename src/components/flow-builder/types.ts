import type { Node, Edge } from "@xyflow/react"

// ── Tipi nodo ─────────────────────────────────────────────────────────────────

export type PhormaNodeType =
  | "trigger"
  | "email"
  | "form"
  | "condition"
  | "wait"
  | "manual"
  | "masterlist"
  | "agent"
  | "end"

export type AgentType = "report" | "email_tracker" | "form_audit" | "flow_consultant"

export type AgentMode = "hitl" | "auto" | "suggest"

export interface PhormaNodeData extends Record<string, unknown> {
  label: string
  active: boolean
  nodeKey?: string // template key (es. "event_created", "date_reached")
  agentType?: AgentType
  config?: Record<string, unknown>
}

export type PhormaNode = Node<PhormaNodeData, PhormaNodeType>
export type PhormaEdge = Edge

// ── Config tipizzate per ogni tipo nodo ───────────────────────────────────────

export interface TriggerConfig {
  trigger: "invite_sent" | "guest_imported" | "guest_group_assigned" | "registration_submitted" | "checkin_completed" | "date_reached" | "scheduled_daily"
  targetGroupId?: string // for guest_group_assigned: filter by specific group
  scheduledTime?: string // for scheduled_daily: HH:MM
  description?: string
}

export interface EmailConfig {
  from?: string
  subject?: string
  body?: string
  emailTemplateId?: string | null
  mode?: "template" | "custom" // template = da libreria, custom = scritto qui
  timeoutHours?: number
}

export interface FormConfig {
  pathId?: string | null
  formId?: string | null
  thankYou?: string
}

export interface ConditionConfig {
  condType: "email_behavior" | "field" | "group"
  emailNodeId?: string | null
  field?: string
  operator?: "equals" | "not_equals" | "contains" | "not_contains" | "is_empty" | "is_not_empty" | "greater_than" | "less_than"
  value?: string
  timeoutHours?: number
  groupId?: string   // for condType === "group": single group
  groupName?: string // display name (saved at config time)
}

export interface WaitConfig {
  hours?: number
  waitType?: "duration" | "until_date" | "until_event"
  amount?: number
  unit?: "minutes" | "hours" | "days"
  untilDate?: string
  untilEvent?: string
  description?: string
}

export interface ManualConfig {
  task?: string
  assignee?: "Segreteria" | "Admin" | "Organizzatore"
  priority?: "alta" | "media" | "bassa"
  note?: string
  dueDays?: number
}

export interface MasterlistConfig {
  action?: "confirm_registration" | "update_field" | "mark_no_show" | "add_note"
  fields?: Array<{ field: string; value: string; valueSource?: "literal" | "form_field" }>
  status?: string
}

export interface AgentConfig {
  mode?: AgentMode
  task?: string
  output?: "suggestion" | "email_draft" | "form_draft" | "report" | "data"
}

export interface EndConfig {
  message?: string
  redirect?: string
}

// ── Flow config salvata in EventPlugin.config ─────────────────────────────────

export interface FlowConfig {
  version: 2
  status: "DRAFT" | "PUBLISHED"
  nodes: PhormaNode[]
  edges: PhormaEdge[]
  viewport?: { x: number; y: number; zoom: number }
  updatedAt: string
}

// ── Supporting data (loaded from API) ─────────────────────────────────────────

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body?: string
  type: string
  isDefault: boolean
}

export interface EventGroup {
  id: string
  name: string
  color: string
}

export interface FormField {
  id: string
  label: string
  type: string
  required: boolean
}

export interface RegistrationPath {
  id: string
  name: string
  description: string
  groupId: string | null
  active: boolean
  emailTemplateIds?: {
    inviteTemplateId?: string | null
    confirmationTemplateId?: string | null
    waitlistTemplateId?: string | null
    reminderTemplateId?: string | null
    updateTemplateId?: string | null
    followupTemplateId?: string | null
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationItem {
  level: "error" | "warning"
  nodeId?: string
  message: string
}
