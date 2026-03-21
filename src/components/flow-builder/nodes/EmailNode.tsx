"use client"

import React from "react"
import type { NodeProps } from "@xyflow/react"
import { BaseNode } from "./BaseNode"
import type { PhormaNode, PhormaNodeData, EmailConfig } from "../types"

export function EmailNode({ data, selected }: NodeProps<PhormaNode>) {
  const { label, active, config } = data
  const emailConfig = (config ?? {}) as EmailConfig
  const subject = emailConfig.subject
  const emailTemplateId = emailConfig.emailTemplateId

  const subjectText = subject
    ? subject.length > 40
      ? subject.slice(0, 40) + "…"
      : subject
    : "Nessun template"

  return (
    <BaseNode
      nodeType="email"
      label={label}
      active={active}
      selected={!!selected}
      hasTarget
      hasSource
    >
      <div className="flex items-center gap-1.5">
        {emailTemplateId && (
          <span
            style={{
              fontSize: 11,
              background: "rgba(34,211,238,0.15)",
              color: "#22D3EE",
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            ✉ Template
          </span>
        )}
        <span
          style={{
            fontSize: 12,
            color: "#9ca3af",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subjectText}
        </span>
      </div>
    </BaseNode>
  )
}
