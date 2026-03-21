"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, ManualConfig } from "../types"

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  alta:  { bg: "rgba(251,113,133,0.15)", color: "#FB7185" },
  media: { bg: "rgba(251,191,36,0.15)",  color: "#FBBF24" },
  bassa: { bg: "rgba(148,163,184,0.15)", color: "#94A3B8" },
}

const APPROVED_HANDLE = [
  { id: "approved", label: "Approvato", color: "#34D399" },
  { id: "rejected", label: "Rifiutato", color: "#FB7185" },
]

export function ManualNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, config } = data
  const manualConfig = (config ?? {}) as ManualConfig
  const task = manualConfig.task
  const priority = manualConfig.priority

  const priorityStyle = priority ? PRIORITY_COLORS[priority] : null

  return (
    <BaseNode
      nodeType="manual"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget
      hasSource={false}
      sourceHandles={APPROVED_HANDLE}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        {priority && priorityStyle && (
          <span
            style={{
              fontSize: 11,
              background: priorityStyle.bg,
              color: priorityStyle.color,
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        )}
        {task && (
          <span
            style={{
              fontSize: 12,
              color: "#9ca3af",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 160,
            }}
          >
            {task}
          </span>
        )}
      </div>
    </BaseNode>
  )
}
