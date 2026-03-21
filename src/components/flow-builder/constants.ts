import type { PhormaNodeType, AgentType } from "./types"

// ── Colori per tipo nodo (spec) ───────────────────────────────────────────────

export const NODE_COLORS: Record<PhormaNodeType, { bg: string; border: string; glow: string; text: string }> = {
  trigger:    { bg: "#9D8DF5", border: "#9D8DF5", glow: "rgba(157,141,245,0.3)", text: "#fff" },
  email:      { bg: "#22D3EE", border: "#22D3EE", glow: "rgba(34,211,238,0.3)",  text: "#fff" },
  form:       { bg: "#A78BFA", border: "#A78BFA", glow: "rgba(167,139,250,0.3)", text: "#fff" },
  condition:  { bg: "#FBBF24", border: "#FBBF24", glow: "rgba(251,191,36,0.3)",  text: "#1a1a1a" },
  wait:       { bg: "#94A3B8", border: "#94A3B8", glow: "rgba(148,163,184,0.3)", text: "#fff" },
  manual:     { bg: "#F97316", border: "#F97316", glow: "rgba(249,115,22,0.3)",  text: "#fff" },
  masterlist: { bg: "#34D399", border: "#34D399", glow: "rgba(52,211,153,0.3)",  text: "#fff" },
  agent:      { bg: "#818CF8", border: "#818CF8", glow: "rgba(129,140,248,0.3)", text: "#fff" },
  end:        { bg: "#FB7185", border: "#FB7185", glow: "rgba(251,113,133,0.3)", text: "#fff" },
}

// Colori specifici per tipo agente
export const AGENT_COLORS: Record<AgentType, { bg: string; glow: string }> = {
  report:          { bg: "#F472B6", glow: "rgba(244,114,182,0.3)" },
  email_tracker:   { bg: "#06B6D4", glow: "rgba(6,182,212,0.3)" },
  form_audit:      { bg: "#818CF8", glow: "rgba(129,140,248,0.3)" },
  flow_consultant: { bg: "#A78BFA", glow: "rgba(167,139,250,0.3)" },
}

// ── Etichette leggibili ───────────────────────────────────────────────────────

export const NODE_TYPE_LABELS: Record<PhormaNodeType, string> = {
  trigger:    "Trigger",
  email:      "Email",
  form:       "Form",
  condition:  "Condizione",
  wait:       "Attendi",
  manual:     "Azione manuale",
  masterlist: "Masterlist",
  agent:      "Agente AI",
  end:        "Fine",
}

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  report:          "Agente Report",
  email_tracker:   "Agente Email",
  form_audit:      "Agente Form",
  flow_consultant: "Agente Phorma",
}

// ── Icone (emoji) per tipo nodo ───────────────────────────────────────────────

export const NODE_ICONS: Record<PhormaNodeType, string> = {
  trigger:    "⚡",
  email:      "✉",
  form:       "◻",
  condition:  "◇",
  wait:       "⏱",
  manual:     "🔒",
  masterlist: "📋",
  agent:      "✦",
  end:        "⏹",
}

// ── Library sidebar ───────────────────────────────────────────────────────────

export interface LibraryNode {
  nodeType: PhormaNodeType
  nodeKey?: string
  label: string
  description?: string
  agentType?: AgentType
}

export interface LibrarySection {
  title: string
  nodes: LibraryNode[]
}

export const LIBRARY: LibrarySection[] = [
  {
    title: "Trigger",
    nodes: [
      { nodeType: "trigger", nodeKey: "invite_sent",          label: "Invio invito email",          description: "Quando viene inviata un'email di invito" },
      { nodeType: "trigger", nodeKey: "guest_imported",       label: "Import partecipanti",         description: "Quando un partecipante viene importato in lista" },
      { nodeType: "trigger", nodeKey: "guest_group_assigned", label: "Aggiunto a un gruppo",        description: "Quando un partecipante viene assegnato a un guest group" },
      { nodeType: "trigger", nodeKey: "registration_submitted", label: "Form compilato",            description: "Quando il partecipante completa il form di registrazione" },
      { nodeType: "trigger", nodeKey: "checkin_completed",    label: "Check-in completato",         description: "Quando il partecipante fa check-in all'evento" },
      { nodeType: "trigger", nodeKey: "date_reached",         label: "Data raggiunta",              description: "Quando si raggiunge una data specifica" },
      { nodeType: "trigger", nodeKey: "scheduled_daily",      label: "Ogni giorno (schedulato)",    description: "Trigger ripetuto ogni giorno all'orario impostato" },
    ],
  },
  {
    title: "Comunicazioni",
    nodes: [
      { nodeType: "email", label: "Invia email" },
      { nodeType: "form",  label: "Assegna form / percorso" },
    ],
  },
  {
    title: "Controllo flusso",
    nodes: [
      { nodeType: "condition",  label: "Condizione" },
      { nodeType: "wait",       label: "Attendi" },
      { nodeType: "manual",     label: "Azione manuale" },
      { nodeType: "masterlist", label: "Aggiorna masterlist" },
      { nodeType: "end",        label: "Fine flow" },
    ],
  },
  {
    title: "Agenti AI",
    nodes: [
      { nodeType: "agent", agentType: "report",          label: "Agente Report",  description: "Genera report di segreteria" },
      { nodeType: "agent", agentType: "email_tracker",   label: "Agente Email",   description: "Analizza campagne email" },
      { nodeType: "agent", agentType: "form_audit",      label: "Agente Form",    description: "Audit qualità form" },
      { nodeType: "agent", agentType: "flow_consultant", label: "Agente Phorma",  description: "Ottimizza il flow" },
    ],
  },
]

// ── Handle IDs per condition node ─────────────────────────────────────────────

export const CONDITION_HANDLES_EMAIL = [
  { id: "completed", label: "Compilato form", color: "#34D399" },
  { id: "clicked",   label: "Cliccato link",  color: "#FBBF24" },
  { id: "opened",    label: "Solo aperta",    color: "#22D3EE" },
  { id: "no_action", label: "Nessuna azione", color: "#FB7185" },
]

export const CONDITION_HANDLES_FIELD = [
  { id: "yes",  label: "Sì",   color: "#34D399" },
  { id: "no",   label: "No",   color: "#FB7185" },
  { id: "else", label: "Altro",color: "#94A3B8" },
]

// Handles dinamici per condizione gruppo — generati dal ConditionPanel in base ai gruppi selezionati
// Base: yes (nel gruppo) / no (non nel gruppo) / else (gruppo sconosciuto)
export const CONDITION_HANDLES_GROUP_BASE = [
  { id: "yes",  label: "Nel gruppo",       color: "#34D399" },
  { id: "no",   label: "Non nel gruppo",   color: "#FB7185" },
  { id: "else", label: "Gruppo sconosciuto", color: "#94A3B8" },
]

// ── Variabili template email ──────────────────────────────────────────────────

export const EMAIL_VARIABLES = [
  { key: "{{firstName}}",         label: "Nome" },
  { key: "{{lastName}}",          label: "Cognome" },
  { key: "{{eventName}}",         label: "Nome evento" },
  { key: "{{eventDate}}",         label: "Data evento" },
  { key: "{{registrationLink}}", label: "Link registrazione" },
  { key: "{{deadline}}",          label: "Scadenza" },
]

// ── Dimensioni nodo default ───────────────────────────────────────────────────

export const NODE_WIDTH  = 220
export const NODE_HEIGHT = 80
