"use client"

import React from "react"
import { NODE_COLORS, NODE_ICONS, NODE_TYPE_LABELS } from "@/components/flow-builder/constants"
import type {
  PhormaNode,
  EmailTemplate,
  FormField,
  EventGroup,
  RegistrationPath,
} from "@/components/flow-builder/types"
import {
  TriggerPanel,
  EmailPanel,
  FormPanel,
  ConditionPanel,
  WaitPanel,
  ManualPanel,
  MasterlistPanel,
  AgentPanel,
  EndPanel,
} from "./panels/index"

export interface FlowPanelProps {
  node: PhormaNode | null
  eventId: string
  emailTemplates: EmailTemplate[]
  formFields: FormField[]
  eventGroups: EventGroup[]
  registrationPaths: RegistrationPath[]
  onUpdateConfig: (nodeId: string, patch: Record<string, unknown>) => void
  onUpdateLabel: (nodeId: string, label: string) => void
  onUpdateActive: (nodeId: string, active: boolean) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
}

function PanelBody(props: FlowPanelProps & { node: PhormaNode }) {
  const { node, ...rest } = props
  const sharedProps = {
    node,
    eventId: rest.eventId,
    emailTemplates: rest.emailTemplates,
    formFields: rest.formFields,
    eventGroups: rest.eventGroups,
    registrationPaths: rest.registrationPaths,
    onUpdateConfig: (patch: Record<string, unknown>) => rest.onUpdateConfig(node.id, patch),
    onUpdateLabel: (label: string) => rest.onUpdateLabel(node.id, label),
    onUpdateActive: (active: boolean) => rest.onUpdateActive(node.id, active),
    onDelete: () => rest.onDelete(node.id),
  }

  switch (node.type) {
    case "trigger":
      return <TriggerPanel {...sharedProps} />
    case "email":
      return <EmailPanel {...sharedProps} />
    case "form":
      return <FormPanel {...sharedProps} />
    case "condition":
      return <ConditionPanel {...sharedProps} />
    case "wait":
      return <WaitPanel {...sharedProps} />
    case "manual":
      return <ManualPanel {...sharedProps} />
    case "masterlist":
      return <MasterlistPanel {...sharedProps} />
    case "agent":
      return <AgentPanel {...sharedProps} />
    case "end":
      return <EndPanel {...sharedProps} />
    default:
      return (
        <p className="text-gray-500 text-sm">Nessuna configurazione disponibile.</p>
      )
  }
}

export function FlowPanel(props: FlowPanelProps) {
  const { node, onClose } = props

  const isOpen = node !== null

  return (
    <aside
      style={{
        width: 300,
        flexShrink: 0,
        background: "#0d0d1a",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.2s ease",
        overflow: "hidden",
      }}
    >
      {node ? (
        <>
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: 8,
                height: 8,
                background: NODE_COLORS[node.type as keyof typeof NODE_COLORS]?.bg ?? "#7060CC",
              }}
            />
            <span className="text-[11px] text-gray-400 uppercase tracking-widest shrink-0">
              {NODE_ICONS[node.type as keyof typeof NODE_ICONS] ?? ""}{" "}
              {NODE_TYPE_LABELS[node.type as keyof typeof NODE_TYPE_LABELS] ?? node.type}
            </span>
            <span
              className="ml-auto text-[10px] text-gray-600 font-mono truncate max-w-[80px]"
              title={node.id}
            >
              {node.id}
            </span>
            <button
              onClick={onClose}
              className="shrink-0 ml-1 w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
              aria-label="Chiudi pannello"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Body — key={node.id} forces remount on node change, resetting all local state */}
          <div className="flex-1 overflow-y-auto p-4">
            <PanelBody key={node.id} {...props} node={node} />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-600 text-sm text-center">
            Seleziona un nodo per configurarlo
          </p>
        </div>
      )}
    </aside>
  )
}

export default FlowPanel
