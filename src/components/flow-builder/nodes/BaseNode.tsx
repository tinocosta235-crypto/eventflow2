"use client"

import React from "react"
import { Handle, Position } from "@xyflow/react"
import type { PhormaNodeType, AgentType } from "../types"
import { NODE_COLORS, NODE_ICONS, AGENT_COLORS, NODE_TYPE_LABELS, AGENT_TYPE_LABELS } from "../constants"

interface SourceHandle {
  id: string
  label: string
  color: string
}

interface BaseNodeProps {
  nodeType: PhormaNodeType
  label: string
  active: boolean
  selected: boolean
  agentType?: AgentType
  children?: React.ReactNode
  sourceHandles?: SourceHandle[]
  hasTarget?: boolean
  hasSource?: boolean
}

export function BaseNode({
  nodeType,
  label,
  active,
  selected,
  agentType,
  children,
  sourceHandles,
  hasTarget = true,
  hasSource = true,
}: BaseNodeProps) {
  const nodeColor = NODE_COLORS[nodeType]
  const agentColor = agentType ? AGENT_COLORS[agentType] : null
  const accentBg = agentColor ? agentColor.bg : nodeColor.bg
  const accentGlow = agentColor ? agentColor.glow : nodeColor.glow

  const typeLabel = agentType ? AGENT_TYPE_LABELS[agentType] : NODE_TYPE_LABELS[nodeType]
  const icon = NODE_ICONS[nodeType]

  const containerStyle: React.CSSProperties = {
    minWidth: 220,
    borderRadius: 12,
    padding: 12,
    background: "#0d0d1a",
    border: selected
      ? `2px solid ${accentBg}`
      : `1px solid ${accentBg}4D`,
    boxShadow: selected
      ? `0 0 0 3px ${accentGlow}, 0 4px 24px ${accentGlow}`
      : "0 2px 8px rgba(0,0,0,0.4)",
    opacity: active ? 1 : 0.45,
    filter: active ? "none" : "grayscale(0.7)",
    position: "relative",
    transition: "border 0.15s, box-shadow 0.15s",
  }

  const handleStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    background: accentBg,
    border: `2px solid #0d0d1a`,
    borderRadius: "50%",
  }

  return (
    <div style={containerStyle}>
      {/* Target handle — top center */}
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ ...handleStyle, top: -5, left: "50%", transform: "translateX(-50%)" }}
        />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Colored dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accentBg,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          {/* Icon */}
          <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>
          {/* Type label */}
          <span
            style={{
              fontSize: 11,
              color: "#9ca3af",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Inactive badge */}
        {!active && (
          <span
            style={{
              fontSize: 10,
              color: "#6b7280",
              background: "rgba(107,114,128,0.15)",
              borderRadius: 4,
              padding: "1px 5px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            inattivo
          </span>
        )}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#ffffff",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginBottom: children ? 6 : 0,
        }}
      >
        {label}
      </div>

      {/* Children (subtext/badge area) */}
      {children && (
        <div style={{ fontSize: 12, color: "#9ca3af" }}>{children}</div>
      )}

      {/* Multiple source handles — right side */}
      {sourceHandles && sourceHandles.length > 0 && (
        <div
          style={{
            position: "absolute",
            right: -56,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          {sourceHandles.map((sh, i) => (
            <div
              key={sh.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}
            >
              <Handle
                type="source"
                position={Position.Right}
                id={sh.id}
                style={{
                  width: 10,
                  height: 10,
                  background: sh.color,
                  border: "2px solid #0d0d1a",
                  borderRadius: "50%",
                  position: "static",
                  transform: "none",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: sh.color,
                  whiteSpace: "nowrap",
                  marginTop: 2,
                  lineHeight: 1,
                }}
              >
                {sh.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Default source handle — bottom center */}
      {hasSource && !sourceHandles?.length && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ ...handleStyle, bottom: -5, left: "50%", transform: "translateX(-50%)" }}
        />
      )}
    </div>
  )
}
