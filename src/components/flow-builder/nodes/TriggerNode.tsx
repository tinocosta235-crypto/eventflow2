"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData } from "../types"

const TRIGGER_LABELS: Record<string, string> = {
  invite_sent:          "Invio invito email",
  guest_imported:       "Import partecipanti",
  guest_group_assigned: "Aggiunto a un gruppo",
  registration_submitted: "Form compilato",
  checkin_completed:    "Check-in completato",
  date_reached:         "Data raggiunta",
  scheduled_daily:      "Ogni giorno",
}

function humanizeTriggerKey(key?: string): string {
  if (!key) return ""
  return TRIGGER_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TriggerNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, nodeKey } = data
  const subtextLabel = humanizeTriggerKey(nodeKey)

  return (
    <BaseNode
      nodeType="trigger"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget={false}
      hasSource
    >
      {subtextLabel && (
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{subtextLabel}</span>
      )}
    </BaseNode>
  )
}
