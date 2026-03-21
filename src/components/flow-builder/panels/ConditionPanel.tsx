"use client"

import { useState, useEffect } from "react"
import type { PhormaNode, EmailTemplate, FormField, EventGroup, RegistrationPath } from "../types"
import { CONDITION_HANDLES_EMAIL, CONDITION_HANDLES_FIELD } from "../constants"

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

const OPERATOR_LABELS: Record<string, string> = {
  equals:        "Uguale a",
  not_equals:    "Diverso da",
  contains:      "Contiene",
  not_contains:  "Non contiene",
  is_empty:      "È vuoto",
  is_not_empty:  "Non è vuoto",
  greater_than:  "Maggiore di",
  less_than:     "Minore di",
}

const TIMEOUT_OPTIONS = [
  { value: 24,  label: "24 ore" },
  { value: 48,  label: "48 ore" },
  { value: 72,  label: "72 ore" },
  { value: 168, label: "7 giorni" },
]

export function ConditionPanel({
  node,
  formFields,
  eventGroups,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const config = (node.data.config ?? {}) as Record<string, unknown>

  const [label, setLabel]           = useState(node.data.label ?? "")
  const [condType, setCondType]     = useState<"email_behavior" | "field" | "group">(
    (config.condType as "email_behavior" | "field" | "group") ?? "email_behavior"
  )
  const [timeoutHours, setTimeoutHours] = useState<number>((config.timeoutHours as number) ?? 24)
  const [field, setField]           = useState((config.field as string) ?? "")
  const [operator, setOperator]     = useState<string>((config.operator as string) ?? "equals")
  const [value, setValue]           = useState((config.value as string) ?? "")
  const [selectedGroupId, setSelectedGroupId] = useState<string>((config.groupId as string) ?? "")

  // Sync label
  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync config
  useEffect(() => {
    const t = setTimeout(() => {
      const group = eventGroups.find(g => g.id === selectedGroupId)
      onUpdateConfig({ condType, timeoutHours, field, operator, value, groupId: selectedGroupId || null, groupName: group?.name ?? "" })
    }, 300)
    return () => clearTimeout(t)
  }, [condType, timeoutHours, field, operator, value, selectedGroupId]) // eslint-disable-line react-hooks/exhaustive-deps

  const valueInputNeeded = !["is_empty", "is_not_empty"].includes(operator)

  const COND_LABELS: Record<string, string> = {
    email_behavior: "Email",
    field: "Campo form",
    group: "Gruppo",
  }

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

      {/* Condition type toggle */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-2">Tipo condizione</label>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(["email_behavior", "field", "group"] as const).map(ct => (
            <button
              key={ct}
              onClick={() => setCondType(ct)}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                condType === ct
                  ? "bg-[#FBBF24]/20 text-[#FBBF24]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {COND_LABELS[ct]}
            </button>
          ))}
        </div>
      </div>

      {/* email_behavior branch */}
      {condType === "email_behavior" && (
        <>
          <div className="text-xs text-gray-500 bg-white/3 border border-white/8 rounded-lg px-3 py-2">
            Collega automaticamente al nodo Email precedente nel flow
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Timeout attesa</label>
            <select
              value={timeoutHours}
              onChange={e => setTimeoutHours(Number(e.target.value))}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
            >
              {TIMEOUT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
              ))}
            </select>
          </div>

          {/* Output branches info */}
          <div>
            <div className="text-white/70 text-xs uppercase tracking-wider mb-2">Rami di uscita</div>
            <div className="space-y-1.5">
              {CONDITION_HANDLES_EMAIL.map(h => (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: h.color }}
                  />
                  <span className="text-gray-400 font-mono">{h.id}</span>
                  <span className="text-gray-300">— {h.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* field branch */}
      {condType === "field" && (
        <>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Campo</label>
            <select
              value={field}
              onChange={e => setField(e.target.value)}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
            >
              <option value="" className="bg-gray-900">Seleziona campo...</option>
              {formFields.map(f => (
                <option key={f.id} value={f.id} className="bg-gray-900">
                  {f.label} ({f.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Operatore</label>
            <select
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
            >
              {Object.entries(OPERATOR_LABELS).map(([val, lbl]) => (
                <option key={val} value={val} className="bg-gray-900">{lbl}</option>
              ))}
            </select>
          </div>

          {valueInputNeeded && (
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Valore</label>
              <input
                value={value}
                onChange={e => setValue(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
                placeholder="Valore da confrontare..."
              />
            </div>
          )}

          {/* Output branches info */}
          <div>
            <div className="text-white/70 text-xs uppercase tracking-wider mb-2">Rami di uscita</div>
            <div className="space-y-1.5">
              {CONDITION_HANDLES_FIELD.map(h => (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: h.color }}
                  />
                  <span className="text-gray-400 font-mono">{h.id}</span>
                  <span className="text-gray-300">— {h.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* group branch */}
      {condType === "group" && (
        <>
          <div className="text-xs text-gray-500 bg-white/3 border border-white/8 rounded-lg px-3 py-2">
            Seleziona un gruppo. Aggiungi più nodi condizione in parallelo per gestire gruppi diversi.
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Gruppo</label>
            {eventGroups.length === 0 ? (
              <div className="text-xs text-gray-500 italic">Nessun gruppo creato per questo evento</div>
            ) : (
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
              >
                <option value="" className="bg-gray-900">Seleziona gruppo...</option>
                {eventGroups.map(g => (
                  <option key={g.id} value={g.id} className="bg-gray-900">{g.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Output handles info */}
          <div>
            <div className="text-white/70 text-xs uppercase tracking-wider mb-2">Rami di uscita</div>
            <div className="space-y-1.5">
              {[
                { id: "yes", label: `Sì — nel gruppo`, color: "#34D399" },
                { id: "no",  label: "No — non nel gruppo", color: "#FB7185" },
              ].map(h => (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                  <span className="text-gray-300">{h.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#FBBF24]" : "bg-white/10"
          }`}
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
