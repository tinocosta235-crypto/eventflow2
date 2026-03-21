"use client"

import React, { useCallback } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { PhormaNode, PhormaEdge } from "@/components/flow-builder/types"
import { nodeTypes } from "@/components/flow-builder/nodes/index"

export interface FlowCanvasProps {
  nodes: PhormaNode[]
  edges: PhormaEdge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onNodeClick: (nodeId: string) => void
  onDrop: (event: React.DragEvent) => void
  onDragOver: (event: React.DragEvent) => void
  selectedNodeId: string | null
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onDrop,
  onDragOver,
  selectedNodeId,
}: FlowCanvasProps) {
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeClick(node.id)
    },
    [onNodeClick]
  )

  return (
    <div
      style={{ position: "absolute", inset: 0 }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        style={{ background: "#07070F", width: "100%", height: "100%" }}
        defaultEdgeOptions={{
          style: { stroke: "rgba(255,255,255,0.2)", strokeWidth: 2 },
          animated: false,
        }}
        connectionLineStyle={{ stroke: "#6d62f3", strokeWidth: 2 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="rgba(255,255,255,0.06)"
          gap={28}
          size={1}
        />
        <MiniMap
          position="bottom-right"
          style={{
            background: "#0d0d1a",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <Controls
          position="bottom-left"
          style={{
            background: "#0d0d1a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        />
      </ReactFlow>
    </div>
  )
}

export default FlowCanvas
