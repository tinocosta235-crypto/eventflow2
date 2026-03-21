"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { PhormaNode, PhormaEdge, ValidationItem } from "@/components/flow-builder/types"
import { LIBRARY } from "./constants"
import { useFlowData } from "./hooks/useFlowData"
import { useFlowSync } from "./hooks/useFlowSync"
import { FlowSidebar } from "./FlowSidebar"
import { FlowCanvas } from "./FlowCanvas"
import { FlowPanel } from "./FlowPanel"

// ── Validation ─────────────────────────────────────────────────────────────────

function validateFlow(nodes: PhormaNode[], edges: PhormaEdge[]): ValidationItem[] {
  const items: ValidationItem[] = []
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const n of nodes) { incoming.set(n.id, 0); outgoing.set(n.id, 0) }
  for (const e of edges) {
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1)
    outgoing.set(e.source, (outgoing.get(e.source) ?? 0) + 1)
  }
  const triggers = nodes.filter(n => n.type === "trigger")
  if (!triggers.length)
    items.push({ level: "error", message: "Aggiungi almeno un trigger di ingresso." })
  for (const n of nodes) {
    if (n.type !== "trigger" && (incoming.get(n.id) ?? 0) === 0)
      items.push({ level: "warning", nodeId: n.id, message: `"${n.data.label}" non riceve input.` })
    if (n.type === "trigger" && (outgoing.get(n.id) ?? 0) === 0)
      items.push({ level: "warning", nodeId: n.id, message: `"${n.data.label}" non ha azioni collegate.` })
    if (n.type === "condition" && (outgoing.get(n.id) ?? 0) < 2)
      items.push({ level: "warning", nodeId: n.id, message: `"${n.data.label}" dovrebbe avere almeno 2 rami.` })
  }
  return items
}

// ── Time ago formatter ─────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 10) return "ora"
  if (diff < 60) return `${diff}s fa`
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`
  return `${Math.floor(diff / 3600)}h fa`
}

// ── Inner component (needs ReactFlowProvider context) ─────────────────────────

interface FlowBuilderInnerProps {
  eventId: string
  eventTitle: string
}

function FlowBuilderInner({ eventId, eventTitle }: FlowBuilderInnerProps) {
  const { screenToFlowPosition } = useReactFlow()

  // ── Flow data (persistence) ────────────────────────────────────────────────
  const {
    nodes: loadedNodes,
    edges: loadedEdges,
    loading,
    saving,
    lastSaved,
    status,
    saveNow,
    toggleStatus,
  } = useFlowData(eventId)

  // ── ReactFlow state ────────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<PhormaNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<PhormaEdge>([])
  const initializedRef = useRef(false)

  // Sync loaded data into xyflow state once
  useEffect(() => {
    if (!loading && !initializedRef.current) {
      initializedRef.current = true
      setNodes(loadedNodes)
      setEdges(loadedEdges)
    }
  }, [loading, loadedNodes, loadedEdges, setNodes, setEdges])

  // ── Supporting data ────────────────────────────────────────────────────────
  const { emailTemplates, formFields, eventGroups, registrationPaths } = useFlowSync({ eventId })

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [validationItems, setValidationItems] = useState<ValidationItem[]>([])
  const [validationOpen, setValidationOpen] = useState(false)
  const [unsaved, setUnsaved] = useState(false)

  // ── Test modal state ───────────────────────────────────────────────────────
  const [testOpen, setTestOpen] = useState(false)
  const [testTrigger, setTestTrigger] = useState("guest_imported")
  const [testSearch, setTestSearch] = useState("")
  const [testRegistrations, setTestRegistrations] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; groupId: string | null }>>([])
  const [testRegistrationId, setTestRegistrationId] = useState<string>("")
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    run?: { executedNodes: string[]; sentEmails: number; notes: string[] }
  } | null>(null)

  // ── Template state ─────────────────────────────────────────────────────────
  const [templateRunning, setTemplateRunning] = useState(false)

  // ── Generate from prompt state ─────────────────────────────────────────────
  const [genOpen, setGenOpen] = useState(false)
  const [genPrompt, setGenPrompt] = useState("")
  const [genLoading, setGenLoading] = useState(false)
  const [genResult, setGenResult] = useState<{ nodeCount: number; edgeCount: number } | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  // Fetch registrations for test modal
  useEffect(() => {
    if (!testOpen) return
    fetch(`/api/participants?eventId=${eventId}`)
      .then(r => r.json())
      .then((data: Array<{ id: string; firstName: string; lastName: string; email: string; groupId: string | null }>) => setTestRegistrations(Array.isArray(data) ? data : []))
      .catch(() => setTestRegistrations([]))
  }, [testOpen, eventId])

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save: debounced 800ms after nodes/edges change
  useEffect(() => {
    if (!initializedRef.current) return
    setUnsaved(true)
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => {
      saveNow(nodes, edges, status)
      setUnsaved(false)
    }, 800)
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // Auto-validate
  useEffect(() => {
    setValidationItems(validateFlow(nodes, edges))
  }, [nodes, edges])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge(connection, eds))
    },
    [setEdges]
  )

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    setIsPanelOpen(true)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData("application/phorma-node")
      if (!raw) return
      let parsed: { nodeType: string; nodeKey?: string; agentType?: string; label: string }
      try { parsed = JSON.parse(raw) } catch { return }

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const id = `${parsed.nodeType}-${Date.now()}`
      const newNode: PhormaNode = {
        id,
        type: parsed.nodeType as PhormaNode["type"],
        position,
        data: {
          label: parsed.label,
          active: true,
          nodeKey: parsed.nodeKey ?? undefined,
          agentType: parsed.agentType as PhormaNode["data"]["agentType"] ?? undefined,
        },
      }
      setNodes(nds => [...nds, newNode])
    },
    [screenToFlowPosition, setNodes]
  )

  const handleUpdateConfig = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...(n.data.config ?? {}), ...patch } } }
            : n
        )
      )
    },
    [setNodes]
  )

  const handleUpdateLabel = useCallback(
    (nodeId: string, label: string) => {
      setNodes(nds =>
        nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
      )
    },
    [setNodes]
  )

  const handleUpdateActive = useCallback(
    (nodeId: string, active: boolean) => {
      setNodes(nds =>
        nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, active } } : n))
      )
    },
    [setNodes]
  )

  const handleDelete = useCallback(
    (nodeId: string) => {
      setNodes(nds => nds.filter(n => n.id !== nodeId))
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null)
        setIsPanelOpen(false)
      }
    },
    [setNodes, setEdges, selectedNodeId]
  )

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
    setSelectedNodeId(null)
  }, [])

  const handleRunTest = useCallback(async () => {
    if (!testTrigger) return
    setTestRunning(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/events/${eventId}/flow/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: testTrigger, registrationId: testRegistrationId || undefined }),
      })
      const data = await res.json() as {
        success?: boolean
        error?: string
        run?: { executedNodes: string[]; sentEmails: number; notes: string[] }
      }
      if (data.success) {
        setTestResult({ success: true, message: "Test eseguito", run: data.run })
      } else {
        setTestResult({ success: false, message: data.error ?? "Errore" })
      }
    } catch {
      setTestResult({ success: false, message: "Errore di rete" })
    }
    setTestRunning(false)
  }, [eventId, testTrigger, testRegistrationId])

  const handleLoadTemplate = useCallback(async () => {
    if (!confirm("Questo sostituirà il flow attuale con il template standard per gruppi. Continuare?")) return
    setTemplateRunning(true)
    try {
      await fetch(`/api/events/${eventId}/flow/template`, { method: "POST" })
      window.location.reload()
    } catch {
      setTemplateRunning(false)
    }
  }, [eventId])

  const handleGenerate = useCallback(async () => {
    if (!genPrompt.trim() || genLoading) return
    setGenLoading(true)
    setGenError(null)
    setGenResult(null)
    try {
      const res = await fetch(`/api/events/${eventId}/flow/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: genPrompt }),
      })
      const data = await res.json() as { nodes?: unknown[]; edges?: unknown[]; nodeCount?: number; edgeCount?: number; error?: string }
      if (!res.ok || data.error) {
        setGenError(data.error ?? "Errore nella generazione")
        return
      }
      // Apply generated flow to canvas
      setNodes(data.nodes as PhormaNode[])
      setEdges(data.edges as PhormaEdge[])
      setGenResult({ nodeCount: data.nodeCount ?? 0, edgeCount: data.edgeCount ?? 0 })
    } catch {
      setGenError("Errore di connessione")
    } finally {
      setGenLoading(false)
    }
  }, [eventId, genPrompt, genLoading, setNodes, setEdges])

  const filteredTestRegs = testRegistrations.filter(r =>
    !testSearch || `${r.firstName} ${r.lastName} ${r.email}`.toLowerCase().includes(testSearch.toLowerCase())
  ).slice(0, 20)

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  const errorCount = validationItems.filter(v => v.level === "error").length
  const warningCount = validationItems.filter(v => v.level === "warning").length

  // ── Save status display ────────────────────────────────────────────────────
  function SaveStatus() {
    if (saving) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Salvataggio...
        </span>
      )
    }
    if (unsaved) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Modifiche non salvate
        </span>
      )
    }
    if (lastSaved) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Salvato {timeAgo(lastSaved)}
        </span>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "calc(100vh - 48px)", background: "#07070F" }}
      >
        <span className="text-gray-500 text-sm">Caricamento flow...</span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 48px)",
        background: "#07070F",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: 48,
          background: "#1a1636",
          borderBottom: "1px solid rgba(109, 98, 243, 0.30)",
          boxShadow: "0 1px 0 rgba(109,98,243,0.10)",
          position: "relative",
          zIndex: 20,
          flexShrink: 0,
          gap: 10,
        }}
      >
        {/* Left: title + status + publish */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[13px] font-semibold text-gray-100 truncate max-w-[200px]">
            {eventTitle}
          </span>
          <span
            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
              status === "PUBLISHED"
                ? "bg-emerald-500/25 text-emerald-300"
                : "bg-violet-500/20 text-violet-300"
            }`}
          >
            {status === "PUBLISHED" ? "Pubblicato" : "Bozza"}
          </span>
        </div>

        <div className="flex-1" />

        {/* Right: save status + validation + test + template + publish */}
        <div className="flex items-center gap-2">
          <SaveStatus />
          {validationItems.length > 0 && (
            <button
              onClick={() => setValidationOpen(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                errorCount > 0
                  ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              }`}
            >
              {errorCount > 0 && <span>{errorCount} {errorCount === 1 ? "errore" : "errori"}</span>}
              {warningCount > 0 && <span>{warningCount} {warningCount === 1 ? "avviso" : "avvisi"}</span>}
            </button>
          )}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.10)" }} />
          {/* Generate from prompt button */}
          <button
            onClick={() => { setGenOpen(true); setGenResult(null); setGenError(null) }}
            title="Genera flow da descrizione con AI"
            style={{
              background: "linear-gradient(135deg, rgba(112,96,204,0.35) 0%, rgba(129,140,248,0.25) 100%)",
              border: "1px solid rgba(129,140,248,0.4)",
            }}
            className="text-[11px] px-3 py-1.5 rounded-md font-semibold transition-all text-violet-200 hover:text-white flex items-center gap-1.5"
          >
            <span style={{ fontSize: 12 }}>✦</span> Genera
          </button>
          {/* Template button */}
          <button
            onClick={handleLoadTemplate}
            disabled={templateRunning}
            title="Genera flow template standard per gruppi"
            className="text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {templateRunning ? "..." : "Template"}
          </button>
          {/* Test button */}
          <button
            onClick={() => { setTestOpen(true); setTestResult(null) }}
            className="text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
          >
            Test
          </button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.10)" }} />
          <button
            onClick={toggleStatus}
            className={`text-[12px] px-4 py-1.5 rounded-md font-semibold transition-colors ${
              status === "PUBLISHED"
                ? "bg-gray-600/60 text-gray-200 hover:bg-gray-500/60"
                : "bg-violet-600 text-white hover:bg-violet-500"
            }`}
          >
            {status === "PUBLISHED" ? "Archivia" : "Pubblica"}
          </button>
        </div>
      </div>

      {/* Test modal */}
      {testOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setTestOpen(false) }}
        >
          <div
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, width: 440, maxHeight: "80vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-white font-semibold text-sm">Test flow</span>
              <button onClick={() => setTestOpen(false)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
            </div>

            {/* Trigger select */}
            <div className="mb-4">
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1.5">Trigger da simulare</label>
              <select
                value={testTrigger}
                onChange={e => setTestTrigger(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              >
                {LIBRARY[0].nodes.map(node => (
                  <option key={node.nodeKey} value={node.nodeKey ?? ""} className="bg-gray-900">{node.label}</option>
                ))}
              </select>
            </div>

            {/* Registration search */}
            <div className="mb-4">
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1.5">Partecipante (opzionale)</label>
              <input
                value={testSearch}
                onChange={e => setTestSearch(e.target.value)}
                placeholder="Cerca per nome o email..."
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 mb-2"
              />
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <button
                  onClick={() => setTestRegistrationId("")}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${!testRegistrationId ? "bg-emerald-500/20 text-emerald-300" : "text-gray-400 hover:bg-white/5"}`}
                >
                  Nessun partecipante (trigger generico)
                </button>
                {filteredTestRegs.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setTestRegistrationId(r.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${testRegistrationId === r.id ? "bg-emerald-500/20 text-emerald-300" : "text-gray-400 hover:bg-white/5"}`}
                  >
                    <span className="font-medium">{r.firstName} {r.lastName}</span>
                    <span className="text-gray-500 ml-2">{r.email}</span>
                    {r.groupId && (
                      <span className="ml-2 text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                        {eventGroups.find(g => g.id === r.groupId)?.name ?? r.groupId}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Error result */}
            {testResult && !testResult.success && (
              <div className="mb-4 px-3 py-2.5 rounded-lg text-xs bg-red-500/15 text-red-300">
                {testResult.message}
              </div>
            )}

            {/* Success trace */}
            {testResult?.success && testResult.run && (
              <div className="mb-4 rounded-lg overflow-hidden border border-emerald-500/20">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-xs text-emerald-300 font-medium">
                    {testResult.run.executedNodes.length} nodi eseguiti
                    {testResult.run.sentEmails > 0 && ` · ${testResult.run.sentEmails} email inviate`}
                  </span>
                </div>

                {/* Node trace */}
                {testResult.run.executedNodes.length > 0 && (
                  <div className="px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
                    {testResult.run.executedNodes.map((label, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="text-gray-600 w-4 shrink-0 text-right">{i + 1}</span>
                        <span className="w-px h-3 bg-gray-700 shrink-0" />
                        <span className="text-gray-300">{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {testResult.run.notes.length > 0 && (
                  <div className="px-3 py-2 border-t border-white/5 space-y-1 max-h-28 overflow-y-auto">
                    {testResult.run.notes.map((note, i) => (
                      <div key={i} className="text-[10px] text-gray-500 font-mono leading-relaxed">{note}</div>
                    ))}
                  </div>
                )}

                {testResult.run.executedNodes.length === 0 && (
                  <div className="px-3 py-3 text-xs text-gray-500">
                    Nessun nodo eseguito — controlla che ci sia un trigger corrispondente nel flow.
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRunTest}
                disabled={testRunning}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {testRunning ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Esecuzione...
                  </>
                ) : "Esegui test"}
              </button>
              <button
                onClick={() => { setTestOpen(false); setTestResult(null) }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Chiudi
              </button>
            </div>

            <p className="text-[10px] text-gray-600 mt-3">
              Il test esegue il flow anche in modalità Bozza. Le email vengono inviate realmente.
            </p>
          </div>
        </div>
      )}

      {/* Generate from prompt modal */}
      {genOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget && !genLoading) setGenOpen(false) }}
        >
          <div
            style={{
              background: "#0d0d1a",
              border: "1px solid rgba(129,140,248,0.25)",
              borderRadius: 16,
              padding: 28,
              width: 520,
              boxShadow: "0 0 60px rgba(112,96,204,0.15)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span style={{ fontSize: 16 }}>✦</span>
                  <span className="text-white font-semibold text-sm">Genera flow da prompt</span>
                </div>
                <p className="text-gray-500 text-[11px]">Descrivi il workflow in italiano. Il flow attuale verrà sostituito.</p>
              </div>
              {!genLoading && (
                <button onClick={() => setGenOpen(false)} className="text-gray-600 hover:text-gray-400 text-lg leading-none">✕</button>
              )}
            </div>

            {/* Prompt suggestions */}
            {!genResult && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  "Registrazione + email di conferma + check-in",
                  "Invito VIP con attesa 3 giorni e reminder",
                  "Workflow con condizione gruppo e percorso hospitality",
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => setGenPrompt(s)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-violet-500/25 text-violet-300/70 hover:text-violet-200 hover:border-violet-500/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            {!genResult && (
              <textarea
                value={genPrompt}
                onChange={e => setGenPrompt(e.target.value)}
                placeholder="Es: Quando un partecipante compila il form, invia una email di conferma, aspetta 2 giorni, poi controlla se ha aperto la mail. Se sì, confermalo in masterlist. Se no, invia un reminder..."
                disabled={genLoading}
                rows={5}
                className="w-full bg-white/4 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/40 resize-none placeholder:text-gray-600 disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.03)" }}
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate()
                }}
              />
            )}

            {/* Error */}
            {genError && (
              <div className="mt-3 px-3 py-2.5 rounded-lg text-xs bg-red-500/15 text-red-300">
                {genError}
              </div>
            )}

            {/* Success */}
            {genResult && (
              <div className="py-6 text-center">
                <div className="text-4xl mb-3">✦</div>
                <p className="text-white font-semibold mb-1">Flow generato</p>
                <p className="text-gray-400 text-sm">
                  {genResult.nodeCount} nodi · {genResult.edgeCount} connessioni
                </p>
                <p className="text-gray-600 text-xs mt-2">Il flow è stato applicato al canvas. Puoi modificarlo prima di pubblicare.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {!genResult ? (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={genLoading || genPrompt.trim().length < 10}
                    style={{
                      background: genLoading || genPrompt.trim().length < 10
                        ? "rgba(112,96,204,0.3)"
                        : "linear-gradient(135deg, #7060CC 0%, #818CF8 100%)",
                    }}
                    className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {genLoading ? (
                      <>
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Generazione in corso...
                      </>
                    ) : (
                      <>✦ Genera flow</>
                    )}
                  </button>
                  {!genLoading && (
                    <button
                      onClick={() => setGenOpen(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-lg transition-colors"
                    >
                      Annulla
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => { setGenOpen(false); setGenPrompt(""); setGenResult(null) }}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Chiudi e modifica flow
                </button>
              )}
            </div>

            {!genLoading && !genResult && (
              <p className="text-[10px] text-gray-600 mt-3 text-center">Cmd+Enter per generare</p>
            )}
          </div>
        </div>
      )}

      {/* Main row */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        <FlowSidebar />

        {/* Canvas wrapper */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
            onEdgesChange={onEdgesChange as (changes: EdgeChange[]) => void}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            selectedNodeId={selectedNodeId}
          />

          {/* Validation panel (bottom of canvas) */}
          {validationOpen && validationItems.length > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(13,13,26,0.97)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 20,
              }}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[11px] text-gray-400 uppercase tracking-widest">Validazione</span>
                <button
                  onClick={() => setValidationOpen(false)}
                  className="text-gray-500 hover:text-gray-300 text-xs"
                >
                  ✕
                </button>
              </div>
              <ul className="pb-3">
                {validationItems.map((item, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 px-4 py-1.5 text-[12px] cursor-default transition-colors ${
                      item.nodeId ? "hover:bg-white/5 cursor-pointer" : ""
                    } ${item.level === "error" ? "text-red-400" : "text-amber-400"}`}
                    onClick={() => {
                      if (item.nodeId) {
                        handleNodeClick(item.nodeId)
                      }
                    }}
                  >
                    <span className="mt-0.5 shrink-0">
                      {item.level === "error" ? "⬤" : "◆"}
                    </span>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right panel */}
        {isPanelOpen && (
          <FlowPanel
            node={selectedNode}
            eventId={eventId}
            emailTemplates={emailTemplates}
            formFields={formFields}
            eventGroups={eventGroups}
            registrationPaths={registrationPaths}
            onUpdateConfig={handleUpdateConfig}
            onUpdateLabel={handleUpdateLabel}
            onUpdateActive={handleUpdateActive}
            onDelete={handleDelete}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  )
}

// ── Public component wrapped in ReactFlowProvider ─────────────────────────────

export interface FlowBuilderProps {
  eventId: string
  eventTitle: string
}

export function FlowBuilder({ eventId, eventTitle }: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner eventId={eventId} eventTitle={eventTitle} />
    </ReactFlowProvider>
  )
}

export default FlowBuilder
