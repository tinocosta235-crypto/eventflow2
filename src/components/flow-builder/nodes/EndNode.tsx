"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, EndConfig } from "../types"

export function EndNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, config } = data
  const endConfig = (config ?? {}) as EndConfig
  const message = endConfig.message

  return (
    <BaseNode
      nodeType="end"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget
      hasSource={false}
    >
      <span style={{ fontSize: 12, color: "#9ca3af" }}>
        {message ?? "Fine del percorso"}
      </span>
    </BaseNode>
  )
}
