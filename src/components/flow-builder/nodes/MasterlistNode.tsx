"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, MasterlistConfig } from "../types"

const ACTION_LABELS: Record<string, string> = {
  confirm_registration: "Conferma iscrizione",
  update_field:         "Aggiorna campo",
  mark_no_show:         "Segna assente",
  add_note:             "Aggiungi nota",
}

export function MasterlistNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, config } = data
  const masterlistConfig = (config ?? {}) as MasterlistConfig
  const action = masterlistConfig.action
  const actionLabel = action ? (ACTION_LABELS[action] ?? action) : null

  return (
    <BaseNode
      nodeType="masterlist"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget
      hasSource
    >
      {actionLabel && (
        <span
          style={{
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          {actionLabel}
        </span>
      )}
    </BaseNode>
  )
}
