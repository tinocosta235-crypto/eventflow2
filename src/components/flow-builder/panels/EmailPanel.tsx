"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { PhormaNode, EmailTemplate, FormField, EventGroup, RegistrationPath } from "../types"
import { EMAIL_VARIABLES } from "../constants"

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

const TIMEOUT_OPTIONS = [
  { value: 24,  label: "24 ore" },
  { value: 48,  label: "48 ore" },
  { value: 72,  label: "72 ore" },
  { value: 168, label: "7 giorni" },
]

export function EmailPanel({
  node,
  eventId,
  emailTemplates,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateActive,
  onDelete,
}: PanelProps) {
  const router = useRouter()
  const config = (node.data.config ?? {}) as Record<string, unknown>
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const [label, setLabel]           = useState(node.data.label ?? "")
  const [mode, setMode]             = useState<"template" | "custom">((config.mode as "template" | "custom") ?? "custom")
  const [selectedTemplateId, setSelectedTemplateId] = useState((config.emailTemplateId as string) ?? "")
  const [subject, setSubject]       = useState((config.subject as string) ?? "")
  const [body, setBody]             = useState((config.body as string) ?? "")
  const [timeoutHours, setTimeoutHours] = useState<number>((config.timeoutHours as number) ?? 24)

  // Sync label
  useEffect(() => {
    const t = setTimeout(() => onUpdateLabel(label), 300)
    return () => clearTimeout(t)
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync config
  useEffect(() => {
    const t = setTimeout(() => {
      onUpdateConfig({ mode, emailTemplateId: selectedTemplateId || null, subject, body, timeoutHours })
    }, 300)
    return () => clearTimeout(t)
  }, [mode, selectedTemplateId, subject, body, timeoutHours]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId)
    const tpl = emailTemplates.find(t => t.id === templateId)
    if (tpl) {
      setSubject(tpl.subject)
      setBody(tpl.body ?? "")
    }
  }

  function insertVariable(variable: string) {
    const textarea = bodyRef.current
    if (!textarea) {
      setBody(prev => prev + variable)
      return
    }
    const start = textarea.selectionStart
    const end   = textarea.selectionEnd
    const newBody = body.slice(0, start) + variable + body.slice(end)
    setBody(newBody)
    // Restore cursor after re-render
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length
      textarea.focus()
    })
  }

  function handleOpenEmailEditor() {
    sessionStorage.setItem("phorma_flow_return", JSON.stringify({ eventId, nodeId: node.id }))
    router.push(`/events/${eventId}/emails?fromFlow=1&nodeId=${node.id}`)
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

      {/* Mode toggle */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-2">Modalità</label>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(["template", "custom"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-[#22D3EE]/20 text-[#22D3EE]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {m === "template" ? "Template" : "Personalizzato"}
            </button>
          ))}
        </div>
      </div>

      {/* Template selector */}
      {mode === "template" && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Template email</label>
          <select
            value={selectedTemplateId}
            onChange={e => handleTemplateSelect(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          >
            <option value="" className="bg-gray-900">Seleziona template...</option>
            {emailTemplates.map(tpl => (
              <option key={tpl.id} value={tpl.id} className="bg-gray-900">
                {tpl.name} — {tpl.subject.slice(0, 40)}{tpl.subject.length > 40 ? "…" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Subject */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Oggetto</label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30"
          placeholder="Oggetto dell'email..."
        />
      </div>

      {/* Body */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Corpo</label>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          style={{ minHeight: 120 }}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-white/30 resize-none font-mono"
          placeholder="Corpo dell'email..."
        />
      </div>

      {/* Variable chips */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-2">Inserisci variabile</label>
        <div className="flex flex-wrap gap-1.5">
          {EMAIL_VARIABLES.map(v => (
            <button
              key={v.key}
              onClick={() => insertVariable(v.key)}
              className="text-xs px-2 py-0.5 rounded-full bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20 hover:bg-[#22D3EE]/20 transition-colors"
              title={v.key}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10" />

      {/* Timeout */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Timeout invio</label>
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

      {/* Open email editor */}
      <button
        onClick={handleOpenEmailEditor}
        className="w-full text-left text-xs text-[#22D3EE] hover:text-white bg-[#22D3EE]/10 hover:bg-[#22D3EE]/20 border border-[#22D3EE]/20 rounded-lg px-3 py-2 transition-colors flex items-center justify-between"
      >
        <span>Apri Email Editor</span>
        <span>→</span>
      </button>

      <div className="border-t border-white/10" />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Attivo</span>
        <button
          onClick={() => onUpdateActive(!node.data.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            node.data.active ? "bg-[#22D3EE]" : "bg-white/10"
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
