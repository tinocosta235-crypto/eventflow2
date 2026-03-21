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

const TRIGGER_OPTIONS = [
  { value: "invite_sent",          label: "Invio invito email",       desc: "Quando viene inviata un'email di invito" },
  { value: "guest_imported",       label: "Import partecipanti",      desc: "Quando un partecipante viene importato in lista" },
  { value: "guest_group_assigned", label: "Aggiunto a un gruppo",     desc: "Quando viene assegnato a un guest group specifico" },
  { value: "registration_submitted", label: "Form compilato",         desc: "Quando il partecipante completa il form di registrazione" },
  { value: "checkin_completed",    label: "Check-in completato",      desc: "Quando il partecipante fa check-in all'evento" },
  { value: "date_reached",         label: "Data raggiunta",           desc: "Quando si raggiunge una data specifica" },
  { value: "scheduled_daily",      label: "Ogni giorno (schedulato)", desc: "Trigger ripetuto ogni giorno all'orario impostato" },
]

export function TriggerPanel({
  node,
  eventGroups,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const config = (node.data.config ?? {}) as Record<string, unknown>

  // Infer initial trigger from nodeKey (when dropped from sidebar) or saved config
  const initialTrigger = (config.trigger as string)
    ?? (node.data.nodeKey as string)
    ?? "guest_imported"

  const [label, setLabel]               = useState(node.data.label ?? "")
  const [trigger, setTrigger]           = useState(initialTrigger)
  const [description, setDescription]   = useState((config.description as string) ?? "")
  const [targetGroupId, setTargetGroupId] = useState((config.targetGroupId as string) ?? "")
  const [scheduledTime, setScheduledTime] = useState((config.scheduledTime as string) ?? "09:00")

  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => onUpdateConfig({ trigger, description, targetGroupId, scheduledTime }), 300)
    return () => clearTimeout(t)
  }, [trigger, description, targetGroupId, scheduledTime]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOption = TRIGGER_OPTIONS.find(o => o.value === trigger)

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

      {/* Trigger type */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Tipo trigger</label>
        <select
          value={trigger}
          onChange={e => setTrigger(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
        >
          {TRIGGER_OPTIONS.map(o => (
            <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
          ))}
        </select>
        {selectedOption && (
          <p className="mt-1.5 text-[11px] text-gray-500 leading-snug">{selectedOption.desc}</p>
        )}
      </div>

      {/* Guest group filter — only for guest_group_assigned */}
      {trigger === "guest_group_assigned" && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Gruppo specifico</label>
          <select
            value={targetGroupId}
            onChange={e => setTargetGroupId(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          >
            <option value="" className="bg-gray-900">— Qualsiasi gruppo —</option>
            {eventGroups.map(g => (
              <option key={g.id} value={g.id} className="bg-gray-900">{g.name}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-gray-500 leading-snug">
            Lascia vuoto per attivarsi con qualsiasi gruppo. Seleziona un gruppo per filtrare solo quei partecipanti.
          </p>
        </div>
      )}

      {/* Scheduled time — only for scheduled_daily */}
      {trigger === "scheduled_daily" && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Orario esecuzione</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          />
          <p className="mt-1.5 text-[11px] text-gray-500 leading-snug">
            Il flow verrà eseguito ogni giorno all&apos;orario indicato su tutti i partecipanti attivi.
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Note</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 resize-none"
          placeholder="Note opzionali su questo trigger..."
        />
      </div>

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#9D8DF5]" : "bg-white/10"
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
