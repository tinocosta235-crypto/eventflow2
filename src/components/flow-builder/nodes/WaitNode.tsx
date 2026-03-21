"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, WaitConfig } from "../types"

function formatWaitDuration(config: WaitConfig): string {
  if (config.hours !== undefined) {
    return config.hours === 1 ? "1h" : `${config.hours}h`
  }
  if (config.amount !== undefined && config.unit) {
    const unit = config.unit === "minutes"
      ? "min"
      : config.unit === "hours"
      ? "h"
      : config.amount === 1
      ? " giorno"
      : " giorni"
    return `${config.amount}${unit}`
  }
  if (config.waitType === "until_date" && config.untilDate) {
    return `Fino al ${config.untilDate}`
  }
  if (config.waitType === "until_event" && config.untilEvent) {
    return `Fino a: ${config.untilEvent}`
  }
  return ""
}

export function WaitNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, config } = data
  const waitConfig = (config ?? {}) as WaitConfig
  const duration = formatWaitDuration(waitConfig)
  const description = waitConfig.description

  return (
    <BaseNode
      nodeType="wait"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget
      hasSource
    >
      <div className="flex flex-col gap-0.5">
        {duration && (
          <span
            style={{
              fontSize: 12,
              color: "#94A3B8",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {duration}
          </span>
        )}
        {description && (
          <span
            style={{
              fontSize: 11,
              color: "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 180,
            }}
          >
            {description}
          </span>
        )}
      </div>
    </BaseNode>
  )
}
