"use client"

import { useState, useEffect, useRef } from "react"
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

const TASK_VARIABLES = [
  { key: "{{firstName}}", label: "Nome" },
  { key: "{{lastName}}",  label: "Cognome" },
]

export function ManualPanel({
  node,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const config = (node.data.config ?? {}) as Record<string, unknown>
  const taskTitleRef = useRef<HTMLInputElement>(null)

  const [label, setLabel]       = useState(node.data.label ?? "")
  const [task, setTask]         = useState((config.task as string) ?? "")
  const [taskDesc, setTaskDesc] = useState((config.taskDesc as string) ?? "")
  const [assignee, setAssignee] = useState<string>((config.assignee as string) ?? "Segreteria")
  const [priority, setPriority] = useState<string>((config.priority as string) ?? "media")
  const [dueDays, setDueDays]   = useState<number>((config.dueDays as number) ?? 3)
  const [note, setNote]         = useState((config.note as string) ?? "")

  // Sync label
  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync config
  useEffect(() => {
    const t = setTimeout(() => {
      onUpdateConfig({ task, taskDesc, assignee, priority, dueDays, note })
    }, 300)
    return () => clearTimeout(t)
  }, [task, taskDesc, assignee, priority, dueDays, note]) // eslint-disable-line react-hooks/exhaustive-deps

  function insertTaskVariable(variable: string) {
    const input = taskTitleRef.current
    if (!input) {
      setTask(prev => prev + variable)
      return
    }
    const start  = input.selectionStart ?? task.length
    const end    = input.selectionEnd   ?? task.length
    const newVal = task.slice(0, start) + variable + task.slice(end)
    setTask(newVal)
    requestAnimationFrame(() => {
      input.selectionStart = input.selectionEnd = start + variable.length
      input.focus()
    })
  }

  const PRIORITY_COLORS: Record<string, string> = {
    alta:  "text-red-400",
    media: "text-yellow-400",
    bassa: "text-green-400",
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

      {/* Info box */}
      <div className="text-xs text-[#F97316]/80 bg-[#F97316]/10 border border-[#F97316]/20 rounded-lg px-3 py-2 leading-relaxed">
        Quando il flow arriva qui, si blocca finché un operatore approva o rifiuta il task.
      </div>

      {/* Task title */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Titolo task</label>
        <input
          ref={taskTitleRef}
          value={task}
          onChange={e => setTask(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          placeholder="Approva registrazione di {{firstName}}..."
        />
        {/* Variable chips */}
        <div className="flex gap-1.5 mt-1.5">
          {TASK_VARIABLES.map(v => (
            <button
              key={v.key}
              onClick={() => insertTaskVariable(v.key)}
              className="text-xs px-2 py-0.5 rounded-full bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 hover:bg-[#F97316]/20 transition-colors"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task description */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Descrizione task</label>
        <textarea
          value={taskDesc}
          onChange={e => setTaskDesc(e.target.value)}
          rows={3}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 resize-none"
          placeholder="Istruzioni per l'operatore..."
        />
      </div>

      {/* Assignee */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Assegna a</label>
        <select
          value={assignee}
          onChange={e => setAssignee(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
        >
          {["Segreteria", "Admin", "Organizzatore"].map(a => (
            <option key={a} value={a} className="bg-gray-900">{a}</option>
          ))}
        </select>
      </div>

      {/* Priority + due days row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Priorità</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className={`bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 ${PRIORITY_COLORS[priority] ?? "text-white"}`}
          >
            <option value="alta"  className="bg-gray-900 text-white">Alta</option>
            <option value="media" className="bg-gray-900 text-white">Media</option>
            <option value="bassa" className="bg-gray-900 text-white">Bassa</option>
          </select>
        </div>
        <div className="w-24">
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Giorni</label>
          <input
            type="number"
            min={1}
            value={dueDays}
            onChange={e => setDueDays(Math.max(1, Number(e.target.value)))}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Note interne</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 resize-none"
          placeholder="Note aggiuntive per l'operatore..."
        />
      </div>

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#F97316]" : "bg-white/10"
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
