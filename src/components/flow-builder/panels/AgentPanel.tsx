"use client"

import { useState, useEffect } from "react"
import type { PhormaNode, EmailTemplate, FormField, EventGroup, RegistrationPath, AgentType, AgentMode } from "../types"
import { AGENT_TYPE_LABELS, AGENT_COLORS } from "../constants"

interface PanelProps {
  node: PhormaNode
  eventId: string
  emailTemplates: EmailTemplate[]
  formFields: FormField[]
  eventGroups: EventGroup[]
  registrationPaths: RegistrationPath[]
  onUpdateConfig: (patch: Record<string, unknown>) => void
  onUpdateLabel: (label: string) => void
  onUpdateActive: (active: boolean) => void
  onDelete: () => void
}

const MODE_OPTIONS: Array<{ value: AgentMode; label: string; description: string }> = [
  { value: "hitl",    label: "HiTL",    description: "L'agente propone, un operatore approva" },
  { value: "auto",    label: "Auto",    description: "L'agente esegue senza approvazione" },
  { value: "suggest", label: "Suggerisci", description: "L'agente suggerisce, nessun impatto diretto" },
]

const OUTPUT_LABELS: Record<string, string> = {
  suggestion:  "Suggerimento",
  email_draft: "Bozza email",
  form_draft:  "Bozza form",
  report:      "Report",
  data:        "Dati",
}

const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  report:          "Genera report di segreteria con dati evento, masterlist, hospitality",
  email_tracker:   "Analizza le campagne email e propone follow-up",
  form_audit:      "Audit qualità del form, propone miglioramenti e follow-up mapping",
  flow_consultant: "Analizza il flow e propone ottimizzazioni strutturali (CEO)",
}

export function AgentPanel({
  node,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const config    = (node.data.config ?? {}) as Record<string, unknown>
  const agentType = (node.data.agentType ?? "report") as AgentType
  const agentColors = AGENT_COLORS[agentType]

  const defaultLabel = AGENT_TYPE_LABELS[agentType] ?? node.data.label ?? ""

  const [label, setLabel]   = useState(node.data.label || defaultLabel)
  const [mode, setMode]     = useState<AgentMode>((config.mode as AgentMode) ?? "hitl")
  const [task, setTask]     = useState((config.task as string) ?? "")
  const [output, setOutput] = useState<string>((config.output as string) ?? "suggestion")

  // Sync label
  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync config
  useEffect(() => {
    const t = setTimeout(() => {
      onUpdateConfig({ mode, task, output })
    }, 300)
    return () => clearTimeout(t)
  }, [mode, task, output]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMode = MODE_OPTIONS.find(m => m.value === mode)

  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Etichetta nodo</label>
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          placeholder="Nome del nodo..."
        />
      </div>

      <div className="border-t border-white/10" />

      {/* Agent info box */}
      <div
        className="rounded-lg px-3 py-2 text-xs border"
        style={{
          backgroundColor: `${agentColors.bg}15`,
          borderColor:      `${agentColors.bg}30`,
          color:            agentColors.bg,
        }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span>✦</span>
          <span className="font-medium">{AGENT_TYPE_LABELS[agentType]}</span>
        </div>
        <p className="text-gray-400">{AGENT_DESCRIPTIONS[agentType]}</p>
      </div>

      {/* Mode selector */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-2">Modalità</label>
        <div className="flex gap-1.5">
          {MODE_OPTIONS.map(m => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                mode === m.value
                  ? "border-white/30 text-white"
                  : "border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20"
              }`}
              style={mode === m.value ? { backgroundColor: `${agentColors.bg}25`, borderColor: `${agentColors.bg}50` } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
        {selectedMode && (
          <p className="text-gray-500 text-xs mt-1.5">{selectedMode.description}</p>
        )}
      </div>

      {/* Auto warning */}
      {mode === "auto" && (
        <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <span className="flex-shrink-0">⚠️</span>
          <span>L&apos;agente eseguirà senza approvazione umana</span>
        </div>
      )}

      {/* Task instructions */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Istruzioni per l&apos;agente</label>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          rows={4}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 resize-none"
          placeholder="Istruzioni opzionali per guidare il comportamento dell'agente..."
        />
      </div>

      {/* Output type */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Output atteso</label>
        <select
          value={output}
          onChange={e => setOutput(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
        >
          {Object.entries(OUTPUT_LABELS).map(([val, lbl]) => (
            <option key={val} value={val} className="bg-gray-900">{lbl}</option>
          ))}
        </select>
      </div>

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#818CF8]" : "bg-white/10"
          }`}
          style={node.data.active ? { backgroundColor: agentColors.bg } : {}}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              node.data.active ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="border-t border-white/10" />

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full text-center text-xs text-red-400/70 hover:text-red-400 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
      >
        Elimina nodo
      </button>
    </div>
  )
}
