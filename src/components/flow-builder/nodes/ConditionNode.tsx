"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, ConditionConfig } from "../types"
import { CONDITION_HANDLES_EMAIL, CONDITION_HANDLES_FIELD } from "../constants"

const COND_TYPE_LABELS: Record<string, string> = {
  email_behavior: "Comportamento email",
  field:          "Valore campo",
  group:          "Gruppo",
}

export function ConditionNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, config } = data
  const condConfig = (config ?? {}) as unknown as ConditionConfig
  const condType = condConfig.condType ?? "email_behavior"

  const groupName = condType === "group" ? (condConfig.groupName as string | undefined) ?? (condConfig.groupId as string | undefined) ?? "" : ""

  const groupHandles = condType === "group"
    ? [
        { id: "yes", label: groupName ? `Sì: ${groupName}` : "Sì — nel gruppo", color: "#34D399" },
        { id: "no",  label: "No — non nel gruppo", color: "#FB7185" },
      ]
    : []

  const handles =
    condType === "field" ? CONDITION_HANDLES_FIELD
    : condType === "group" ? groupHandles
    : CONDITION_HANDLES_EMAIL

  const condTypeLabel = COND_TYPE_LABELS[condType] ?? condType

  return (
    <BaseNode
      nodeType="condition"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget
      hasSource={false}
      sourceHandles={handles}
    >
      <span
        style={{
          fontSize: 11,
          background: "rgba(251,191,36,0.15)",
          color: "#FBBF24",
          borderRadius: 4,
          padding: "1px 5px",
        }}
      >
        {condType === "group" && groupName ? groupName : condTypeLabel}
      </span>
    </BaseNode>
  )
}
