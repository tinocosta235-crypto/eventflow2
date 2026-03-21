"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, AgentConfig, AgentMode } from "../types"

const MODE_STYLES: Record<AgentMode, { bg: string; color: string; label: string }> = {
  hitl:    { bg: "rgba(251,191,36,0.15)",  color: "#FBBF24", label: "HiTL" },
  auto:    { bg: "rgba(251,113,133,0.15)", color: "#FB7185", label: "Auto" },
  suggest: { bg: "rgba(52,211,153,0.15)",  color: "#34D399", label: "Suggest" },
}

export function AgentNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, agentType, config } = data
  const agentConfig = (config ?? {}) as AgentConfig
  const mode = agentConfig.mode as AgentMode | undefined

  const modeStyle = mode ? MODE_STYLES[mode] : null

  return (
    <BaseNode
      nodeType="agent"
      label={label}
      active={active}
      selected={!!selected}
      agentType={agentType}
      hasTarget
      hasSource
    >
      {modeStyle && (
        <span
          style={{
            fontSize: 11,
            background: modeStyle.bg,
            color: modeStyle.color,
            borderRadius: 4,
            padding: "1px 5px",
          }}
        >
          {modeStyle.label}
        </span>
      )}
    </BaseNode>
  )
}
