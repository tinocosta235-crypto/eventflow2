"use client"

import { useState, useEffect } from "react"
import type { PhormaNode, EmailTemplate, FormField, EventGroup, RegistrationPath } from "../types"

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

type Action = "confirm_registration" | "update_field" | "mark_no_show" | "add_note"

const ACTION_LABELS: Record<Action, string> = {
  confirm_registration: "Conferma iscrizione",
  update_field:         "Aggiorna campo",
  mark_no_show:         "Segna come assente",
  add_note:             "Aggiungi nota",
}

const FIELD_OPTIONS = [
  { value: "status",   label: "Stato" },
  { value: "notes",    label: "Note" },
  { value: "groupId",  label: "Gruppo" },
  { value: "company",  label: "Azienda" },
  { value: "jobTitle", label: "Ruolo" },
]

const STATUS_OPTIONS = [
  { value: "PENDING",   label: "In attesa" },
  { value: "CONFIRMED", label: "Confermato" },
  { value: "WAITLIST",  label: "In lista d'attesa" },
  { value: "CANCELLED", label: "Annullato" },
]

interface FieldRow {
  id: string
  field: string
  value: string
}

export function MasterlistPanel({
  node,
  eventGroups,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const config = (node.data.config ?? {}) as Record<string, unknown>

  const [label, setLabel]   = useState(node.data.label ?? "")
  const [action, setAction] = useState<Action>((config.action as Action) ?? "confirm_registration")
  const [status, setStatus] = useState((config.status as string) ?? "CONFIRMED")
  const [fieldRows, setFieldRows] = useState<FieldRow[]>(() => {
    const existing = config.fields as Array<{ field: string; value: string }> | undefined
    if (Array.isArray(existing) && existing.length > 0) {
      return existing.map((r, i) => ({ id: String(i), field: r.field, value: r.value }))
    }
    return [{ id: "0", field: "status", value: "" }]
  })

  // Sync label
  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync config
  useEffect(() => {
    const t = setTimeout(() => {
      onUpdateConfig({
        action,
        status: action === "confirm_registration" ? status : undefined,
        fields: action === "update_field"
          ? fieldRows.map(({ field, value }) => ({ field, value }))
          : undefined,
      })
    }, 300)
    return () => clearTimeout(t)
  }, [action, status, fieldRows]) // eslint-disable-line react-hooks/exhaustive-deps

  function addRow() {
    setFieldRows(prev => [...prev, { id: Date.now().toString(), field: "status", value: "" }])
  }

  function removeRow(id: string) {
    setFieldRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, key: "field" | "value", val: string) {
    setFieldRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
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

      {/* Action select */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Azione</label>
        <select
          value={action}
          onChange={e => setAction(e.target.value as Action)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
        >
          {Object.entries(ACTION_LABELS).map(([val, lbl]) => (
            <option key={val} value={val} className="bg-gray-900">{lbl}</option>
          ))}
        </select>
      </div>

      {/* confirm_registration: status */}
      {action === "confirm_registration" && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Stato da impostare</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value} className="bg-gray-900">{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* update_field: dynamic field editor */}
      {action === "update_field" && (
        <div>
          <div className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Campi da aggiornare</span>
            <button
              onClick={addRow}
              className="text-[#34D399] text-xs hover:text-white transition-colors flex items-center gap-1"
            >
              <span className="text-base leading-none">+</span>
              <span>Aggiungi</span>
            </button>
          </div>
          <div className="space-y-2">
            {fieldRows.map(row => (
              <div key={row.id} className="flex items-center gap-2">
                {/* Field select */}
                <select
                  value={row.field}
                  onChange={e => updateRow(row.id, "field", e.target.value)}
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs flex-1 focus:outline-none focus:border-white/30"
                >
                  {FIELD_OPTIONS.map(f => (
                    <option key={f.value} value={f.value} className="bg-gray-900">{f.label}</option>
                  ))}
                </select>

                {/* Value: group select or text input */}
                {row.field === "groupId" ? (
                  <select
                    value={row.value}
                    onChange={e => updateRow(row.id, "value", e.target.value)}
                    className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs flex-1 focus:outline-none focus:border-white/30"
                  >
                    <option value="" className="bg-gray-900">Nessun gruppo</option>
                    {eventGroups.map(g => (
                      <option key={g.id} value={g.id} className="bg-gray-900">{g.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={row.value}
                    onChange={e => updateRow(row.id, "value", e.target.value)}
                    placeholder="Valore..."
                    className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs flex-1 focus:outline-none focus:border-white/30"
                  />
                )}

                {/* Remove */}
                <button
                  onClick={() => removeRow(row.id)}
                  className="text-red-400/50 hover:text-red-400 transition-colors text-sm flex-shrink-0 w-6 h-6 flex items-center justify-center"
                  title="Rimuovi"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#34D399]" : "bg-white/10"
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
