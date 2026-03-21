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

const UNIT_LABELS = [
  { value: "minutes", label: "Minuti" },
  { value: "hours",   label: "Ore" },
  { value: "days",    label: "Giorni" },
]

const UNTIL_EVENT_OPTIONS = [
  { value: "registration_submitted", label: "Registrazione inviata" },
  { value: "rsvp_confirmed",         label: "RSVP confermato" },
  { value: "checkin_completed",      label: "Check-in completato" },
]

type WaitType = "duration" | "until_date" | "until_event"

export function WaitPanel({
  node,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const config = (node.data.config ?? {}) as Record<string, unknown>

  const [label, setLabel]           = useState(node.data.label ?? "")
  const [waitType, setWaitType]     = useState<WaitType>((config.waitType as WaitType) ?? "duration")
  const [amount, setAmount]         = useState<number>((config.amount as number) ?? 1)
  const [unit, setUnit]             = useState<string>((config.unit as string) ?? "hours")
  const [untilDate, setUntilDate]   = useState((config.untilDate as string) ?? "")
  const [untilEvent, setUntilEvent] = useState((config.untilEvent as string) ?? "registration_submitted")
  const [description, setDescription] = useState((config.description as string) ?? "")

  // Sync label
  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync config
  useEffect(() => {
    const t = setTimeout(() => {
      onUpdateConfig({ waitType, amount, unit, untilDate, untilEvent, description })
    }, 300)
    return () => clearTimeout(t)
  }, [waitType, amount, unit, untilDate, untilEvent, description]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Wait type radio */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-2">Tipo attesa</label>
        <div className="space-y-1.5">
          {([
            ["duration",    "Durata"],
            ["until_date",  "Fino a data"],
            ["until_event", "Fino a evento"],
          ] as [WaitType, string][]).map(([wt, wl]) => (
            <label key={wt} className="flex items-center gap-2.5 cursor-pointer group">
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  waitType === wt
                    ? "border-[#94A3B8] bg-[#94A3B8]/20"
                    : "border-white/20 group-hover:border-white/40"
                }`}
                onClick={() => setWaitType(wt)}
              >
                {waitType === wt && (
                  <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                )}
              </span>
              <span
                className={`text-sm cursor-pointer ${waitType === wt ? "text-white" : "text-gray-400"}`}
                onClick={() => setWaitType(wt)}
              >
                {wl}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* duration */}
      {waitType === "duration" && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Durata</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Math.max(1, Number(e.target.value)))}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:border-white/30"
            />
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-white/30"
            >
              {UNIT_LABELS.map(u => (
                <option key={u.value} value={u.value} className="bg-gray-900">{u.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* until_date */}
      {waitType === "until_date" && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Data</label>
          <input
            type="date"
            value={untilDate}
            onChange={e => setUntilDate(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          />
        </div>
      )}

      {/* until_event */}
      {waitType === "until_event" && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Evento</label>
          <select
            value={untilEvent}
            onChange={e => setUntilEvent(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          >
            {UNTIL_EVENT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Descrizione</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 resize-none"
          placeholder="Note sull'attesa..."
        />
      </div>

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#94A3B8]" : "bg-white/10"
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
