"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, FormConfig } from "../types"

export function FormNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, config } = data
  const formConfig = (config ?? {}) as FormConfig
  const pathId = formConfig.pathId

  return (
    <BaseNode
      nodeType="form"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget
      hasSource
    >
      <div className="flex items-center gap-1.5">
        {pathId ? (
          <span
            style={{
              fontSize: 11,
              background: "rgba(52,211,153,0.15)",
              color: "#34D399",
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            Form attivo
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Nessun percorso</span>
        )}
      </div>
    </BaseNode>
  )
}
