"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { PhormaNode, PhormaEdge, FlowConfig } from "@/components/flow-builder/types"
import { toast } from "@/components/ui/toaster"

const defaultNodes: PhormaNode[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 200, y: 200 },
    data: { label: "Registrazione inviata", active: true, nodeKey: "registration_submitted" },
  },
]

const emptyFlow = {
  nodes: defaultNodes,
  edges: [] as PhormaEdge[],
  viewport: { x: 0, y: 0, zoom: 1 },
  status: "DRAFT" as const,
}

export function useFlowData(eventId: string) {
  const [nodes, setNodes] = useState<PhormaNode[]>(emptyFlow.nodes)
  const [edges, setEdges] = useState<PhormaEdge[]>(emptyFlow.edges)
  const [viewport, setViewport] = useState<{ x: number; y: number; zoom: number }>(emptyFlow.viewport)
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const statusRef = useRef(status)

  nodesRef.current = nodes
  edgesRef.current = edges
  statusRef.current = status

  // Load on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/events/${eventId}/flow`)
        if (!res.ok) throw new Error("fetch failed")
        const data = await res.json()
        if (cancelled) return
        if (data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes)
        } else {
          setNodes(emptyFlow.nodes)
        }
        if (data.edges && Array.isArray(data.edges)) {
          setEdges(data.edges)
        }
        if (data.viewport) setViewport(data.viewport)
        if (data.status) setStatus(data.status)
        setLastSaved(data.updatedAt ? new Date(data.updatedAt) : null)
        initializedRef.current = true
      } catch {
        // silently use empty flow
        initializedRef.current = true
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [eventId])

  const saveNow = useCallback(async (
    currentNodes?: PhormaNode[],
    currentEdges?: PhormaEdge[],
    currentStatus?: "DRAFT" | "PUBLISHED"
  ) => {
    const n = currentNodes ?? nodesRef.current
    const e = currentEdges ?? edgesRef.current
    const s = currentStatus ?? statusRef.current
    setSaving(true)
    try {
      const payload: Partial<FlowConfig> = {
        version: 2,
        status: s,
        nodes: n,
        edges: e,
        viewport,
        updatedAt: new Date().toISOString(),
      }
      const res = await fetch(`/api/events/${eventId}/flow`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("save failed")
      setLastSaved(new Date())
    } catch {
      toast("Errore salvataggio", { description: "Impossibile salvare il flow.", variant: "error" })
    } finally {
      setSaving(false)
    }
  }, [eventId, viewport])

  // Auto-save: debounced 800ms
  useEffect(() => {
    if (!initializedRef.current || loading) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveNow(nodes, edges, status)
    }, 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const toggleStatus = useCallback(async () => {
    const next = statusRef.current === "DRAFT" ? "PUBLISHED" : "DRAFT"
    setStatus(next)
    await saveNow(nodesRef.current, edgesRef.current, next)
  }, [saveNow])

  return {
    nodes,
    edges,
    viewport,
    loading,
    saving,
    lastSaved,
    status,
    setNodes,
    setEdges,
    setViewport,
    saveNow,
    toggleStatus,
  }
}
