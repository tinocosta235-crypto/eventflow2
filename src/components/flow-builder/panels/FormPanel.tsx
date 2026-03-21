"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

const FIELD_TYPE_COLORS: Record<string, string> = {
  text:     "bg-blue-500/20 text-blue-300",
  email:    "bg-cyan-500/20 text-cyan-300",
  phone:    "bg-green-500/20 text-green-300",
  select:   "bg-purple-500/20 text-purple-300",
  checkbox: "bg-yellow-500/20 text-yellow-300",
  textarea: "bg-gray-500/20 text-gray-300",
  number:   "bg-orange-500/20 text-orange-300",
  date:     "bg-pink-500/20 text-pink-300",
}

const EMAIL_TEMPLATE_SLOTS: Array<{ key: keyof NonNullable<RegistrationPath["emailTemplateIds"]>; label: string }> = [
  { key: "inviteTemplateId",        label: "Invito" },
  { key: "confirmationTemplateId",  label: "Conferma" },
  { key: "waitlistTemplateId",      label: "Waitlist" },
  { key: "reminderTemplateId",      label: "Reminder" },
  { key: "updateTemplateId",        label: "Aggiornamento" },
  { key: "followupTemplateId",      label: "Follow-up" },
]

export function FormPanel({
  node,
  eventId,
  emailTemplates,
  registrationPaths,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const router  = useRouter()
  const config  = (node.data.config ?? {}) as Record<string, unknown>

  const [label, setLabel]         = useState(node.data.label ?? "")
  const [pathId, setPathId]       = useState((config.pathId as string) ?? "")
  const [thankYou, setThankYou]   = useState((config.thankYou as string) ?? "")
  const [liveFields, setLiveFields] = useState<FormField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [noPathWarning, setNoPathWarning] = useState(false)

  // Sync label
  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync config
  useEffect(() => {
    const t = setTimeout(() => {
      const path = registrationPaths.find(p => p.id === pathId)
      onUpdateConfig({
        pathId: pathId || null,
        formId: path ? pathId : null,
        thankYou,
      })
    }, 300)
    return () => clearTimeout(t)
  }, [pathId, thankYou]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch live form fields when pathId changes
  useEffect(() => {
    if (!pathId) {
      setLiveFields([])
      return
    }
    setLoadingFields(true)
    fetch(`/api/events/${eventId}/form?pathId=${pathId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLiveFields(data)
        else if (Array.isArray(data.fields)) setLiveFields(data.fields)
        else setLiveFields([])
      })
      .catch(() => setLiveFields([]))
      .finally(() => setLoadingFields(false))
  }, [pathId, eventId])

  const selectedPath = registrationPaths.find(p => p.id === pathId)

  function handleOpenFormBuilder() {
    if (!pathId) {
      setNoPathWarning(true)
      return
    }
    setNoPathWarning(false)
    sessionStorage.setItem("phorma_flow_return", JSON.stringify({ eventId, nodeId: node.id, pathId }))
    router.push(`/events/${eventId}/form?fromFlow=1&nodeId=${node.id}&pathId=${pathId}`)
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

      {/* Registration path selector */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Percorso registrazione</label>
        <select
          value={pathId}
          onChange={e => { setPathId(e.target.value); setNoPathWarning(false) }}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
        >
          <option value="" className="bg-gray-900">Seleziona percorso...</option>
          {registrationPaths.map(path => (
            <option key={path.id} value={path.id} className="bg-gray-900">
              {path.name} {path.active ? "✓" : ""}
            </option>
          ))}
        </select>
        {/* Active badges */}
        {pathId && selectedPath && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              selectedPath.active
                ? "bg-green-500/20 text-green-300"
                : "bg-gray-500/20 text-gray-400"
            }`}>
              {selectedPath.active ? "Attivo" : "Non attivo"}
            </span>
            {selectedPath.description && (
              <span className="text-gray-500 text-xs truncate">{selectedPath.description}</span>
            )}
          </div>
        )}
      </div>

      {/* Live form fields */}
      {pathId && (
        <div>
          <div className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Campi form</span>
            {loadingFields ? (
              <span className="text-gray-500 text-xs normal-case">Caricamento...</span>
            ) : (
              <span className="text-[#A78BFA] text-xs normal-case font-medium">
                {liveFields.length} {liveFields.length === 1 ? "campo" : "campi"} configurati
              </span>
            )}
          </div>
          {loadingFields ? (
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-6 w-20 bg-white/5 rounded-full animate-pulse" />
              ))}
            </div>
          ) : liveFields.length === 0 ? (
            <div className="text-gray-500 text-xs italic py-1">Nessun campo nel form</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {liveFields.map(field => (
                <span
                  key={field.id}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300"
                >
                  <span className={`text-[10px] px-1 rounded ${FIELD_TYPE_COLORS[field.type] ?? "bg-gray-500/20 text-gray-300"}`}>
                    {field.type}
                  </span>
                  {field.label}
                  {field.required && <span className="text-[#A78BFA] font-bold">*</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Linked email templates */}
      {pathId && selectedPath?.emailTemplateIds && (
        <>
          <div className="border-t border-white/10" />
          <div>
            <div className="text-white/70 text-xs uppercase tracking-wider mb-2">Email collegate</div>
            <div className="space-y-1">
              {EMAIL_TEMPLATE_SLOTS.map(slot => {
                const tplId    = selectedPath.emailTemplateIds?.[slot.key]
                const linked   = Boolean(tplId)
                const tplName  = linked ? emailTemplates.find(t => t.id === tplId)?.name : null
                return (
                  <div key={slot.key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{slot.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                      linked
                        ? "bg-green-500/20 text-green-300"
                        : "bg-white/5 text-gray-500"
                    }`}>
                      {linked ? (tplName ?? "Collegato") : "Non collegato"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-white/10" />

      {/* Thank you message */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Messaggio di ringraziamento</label>
        <textarea
          value={thankYou}
          onChange={e => setThankYou(e.target.value)}
          rows={3}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 resize-none"
          placeholder="Grazie per la registrazione..."
        />
      </div>

      {/* Warning */}
      {noPathWarning && (
        <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
          Seleziona un percorso prima di aprire il builder
        </div>
      )}

      {/* BIG open form builder button */}
      <button
        onClick={handleOpenFormBuilder}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#A78BFA]/20 hover:bg-[#A78BFA]/30 border border-[#A78BFA]/30 hover:border-[#A78BFA]/50 text-[#A78BFA] hover:text-white transition-all font-medium text-sm group"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">◻</span>
          <span>Apri Form Builder</span>
        </span>
        <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
      </button>

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#A78BFA]" : "bg-white/10"
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
