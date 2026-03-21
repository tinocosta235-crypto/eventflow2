"use client"

import React from "react"
import { LIBRARY, NODE_COLORS, NODE_ICONS, AGENT_TYPE_LABELS } from "@/components/flow-builder/constants"
import type { LibraryNode } from "@/components/flow-builder/constants"

interface FlowSidebarProps {
  className?: string
}

function SidebarChip({ node }: { node: LibraryNode }) {
  const colors = NODE_COLORS[node.nodeType]
  const icon = NODE_ICONS[node.nodeType]

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "copy"
    e.dataTransfer.setData(
      "application/phorma-node",
      JSON.stringify({
        nodeType: node.nodeType,
        nodeKey: node.nodeKey ?? null,
        agentType: node.agentType ?? null,
        label: node.label,
      })
    )
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group flex flex-col px-3 py-2.5 rounded-lg cursor-grab select-none transition-colors hover:bg-white/5 active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 rounded-full"
          style={{
            width: 8,
            height: 8,
            background: node.agentType
              ? NODE_COLORS.agent.bg
              : colors.bg,
          }}
        />
        <span className="text-sm" style={{ lineHeight: 1 }}>
          {icon}
        </span>
        <span className="text-[13px] text-gray-200 leading-tight">{node.label}</span>
      </div>
      {node.agentType && (
        <span className="mt-0.5 ml-[22px] text-[10px] text-gray-500 leading-tight">
          {AGENT_TYPE_LABELS[node.agentType]}
        </span>
      )}
    </div>
  )
}

export function FlowSidebar({ className }: FlowSidebarProps) {
  return (
    <aside
      className={className}
      style={{
        width: 220,
        flexShrink: 0,
        background: "rgba(255,255,255,0.02)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {LIBRARY.map((section) => (
        <div key={section.title}>
          <div
            className="px-4 py-2 text-xs text-gray-500 uppercase tracking-widest"
            style={{ letterSpacing: "0.1em" }}
          >
            {section.title}
          </div>
          <div className="px-1 pb-1">
            {section.nodes.map((node, i) => (
              <SidebarChip
                key={`${node.nodeType}-${node.nodeKey ?? node.agentType ?? i}`}
                node={node}
              />
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}

export default FlowSidebar
