"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  CopyPlus,
  Minus,
  Plus,
  Redo2,
  Save,
  ShieldAlert,
  Trash2,
  Undo2,
} from "lucide-react";

type FlowNodeType = "trigger" | "condition" | "action" | "ai_action";
type FlowStatus = "DRAFT" | "PUBLISHED";

type FlowNode = {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number;
  y: number;
  active: boolean;
  config?: Record<string, unknown>;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type FlowConfig = {
  version: 1;
  status: FlowStatus;
  nodes: FlowNode[];
  edges: FlowEdge[];
  updatedAt: string;
};

type NodeTemplate = {
  key: string;
  label: string;
  type: FlowNodeType;
};

type ValidationItem = {
  nodeId?: string;
  level: "error" | "warning";
  message: string;
};

type FlowRun = {
  id: string;
  at: string;
  trigger: string;
  registrationId?: string;
  executedNodes: string[];
  sentEmails: number;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  type: string;
  isDefault: boolean;
};

type DemoPack = "AUTO" | "PIRELLI" | "KFC_RGM_2026" | "WURTH_KICKOFF";

const CANVAS_W = 2400;
const CANVAS_H = 1400;
const NODE_W = 210;
const NODE_H = 88;

const LIBRARY: { title: string; nodes: NodeTemplate[] }[] = [
  {
    title: "Triggers",
    nodes: [
      { key: "event_created", label: "Event Created", type: "trigger" },
      { key: "guest_imported", label: "Guest Imported", type: "trigger" },
      { key: "registration_submitted", label: "Registration Submitted", type: "trigger" },
      { key: "rsvp_confirmed", label: "RSVP Confirmed", type: "trigger" },
      { key: "checkin_completed", label: "Check-in Completed", type: "trigger" },
      { key: "guest_status_updated", label: "Guest Status Updated", type: "trigger" },
      { key: "email_sent", label: "Email Sent", type: "trigger" },
      { key: "date_reached", label: "Date Reached", type: "trigger" },
    ],
  },
  {
    title: "Conditions",
    nodes: [
      { key: "if_vip", label: "If VIP", type: "condition" },
      { key: "if_hospitality", label: "If Hospitality Required", type: "condition" },
      { key: "if_capacity", label: "If Capacity Exceeded", type: "condition" },
      { key: "if_no_reply", label: "If No Response in X days", type: "condition" },
    ],
  },
  {
    title: "Actions",
    nodes: [
      { key: "send_email", label: "Send Email", type: "action" },
      { key: "assign_form", label: "Assign Registration Path", type: "action" },
      { key: "update_guest_status", label: "Update Guest Status", type: "action" },
      { key: "notify_team", label: "Notify Internal Team", type: "action" },
      { key: "assign_hotel", label: "Assign Hotel Offer", type: "action" },
      { key: "send_transport_request", label: "Send Transport Request", type: "action" },
      { key: "open_travel_form", label: "Open Travel Form", type: "action" },
      { key: "activate_checkin", label: "Activate Check-in", type: "action" },
      { key: "end_flow", label: "End Flow", type: "action" },
    ],
  },
  {
    title: "AI Actions",
    nodes: [
      { key: "ai_invite_copy", label: "Generate Invite Copy", type: "ai_action" },
      { key: "ai_guest_classify", label: "Classify Guests", type: "ai_action" },
      { key: "ai_missing_data", label: "Detect Missing Data", type: "ai_action" },
      { key: "ai_next_action", label: "Suggest Next Action", type: "ai_action" },
    ],
  },
];

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyFlow(): FlowConfig {
  return { version: 1, status: "DRAFT", nodes: [], edges: [], updatedAt: new Date().toISOString() };
}

function validateFlow(flow: FlowConfig): ValidationItem[] {
  const items: ValidationItem[] = [];
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  for (const node of flow.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, 0);
  }
  for (const edge of flow.edges) {
    if (!incoming.has(edge.target) || !outgoing.has(edge.source)) {
      items.push({ level: "error", message: "Flow contiene connessioni verso nodi inesistenti." });
      continue;
    }
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
  }

  const triggers = flow.nodes.filter((n) => n.type === "trigger");
  if (!triggers.length) items.push({ level: "error", message: "Aggiungi almeno un trigger di ingresso." });

  for (const node of flow.nodes) {
    const inCount = incoming.get(node.id) ?? 0;
    const outCount = outgoing.get(node.id) ?? 0;

    if (node.type !== "trigger" && inCount === 0) {
      items.push({ level: "warning", nodeId: node.id, message: `"${node.label}" non riceve input.` });
    }
    if (node.type === "trigger" && outCount === 0) {
      items.push({ level: "warning", nodeId: node.id, message: `"${node.label}" non ha azioni collegate.` });
    }
    if (node.type === "condition" && outCount < 2) {
      items.push({ level: "warning", nodeId: node.id, message: `"${node.label}" dovrebbe avere almeno 2 rami (true/false).` });
    }
    const key = String(node.config?.templateKey ?? "");
    if (node.type === "action" && key === "send_email") {
      const mode =
        String(node.config?.sendMode ?? "").toUpperCase() === "TEMPLATE" ||
        String(node.config?.templateId ?? "").trim()
          ? "TEMPLATE"
          : "CUSTOM";
      if (mode === "TEMPLATE") {
        if (!String(node.config?.templateId ?? "").trim()) {
          items.push({ level: "warning", nodeId: node.id, message: `"${node.label}" richiede un template selezionato.` });
        }
      } else if (!String(node.config?.subject ?? "").trim() || !String(node.config?.body ?? "").trim()) {
        items.push({ level: "warning", nodeId: node.id, message: `"${node.label}" richiede subject e body custom.` });
      }
    }
  }

  return items;
}

function toneByType(type: FlowNodeType) {
  if (type === "trigger") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (type === "condition") return "border-amber-300 bg-amber-50 text-amber-700";
  if (type === "ai_action") return "border-violet-300 bg-violet-50 text-violet-700";
  return "border-cyan-300 bg-cyan-50 text-cyan-700";
}

export function EventFlowBuilder({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [flow, setFlow] = useState<FlowConfig>(emptyFlow());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [approveFirstCritical, setApproveFirstCritical] = useState(false);
  const [manualTrigger, setManualTrigger] = useState("registration_submitted");
  const [manualRegId, setManualRegId] = useState("");
  const [testingTrigger, setTestingTrigger] = useState(false);
  const [demoPack, setDemoPack] = useState<DemoPack>("AUTO");
  const [loadingPack, setLoadingPack] = useState(false);

  const historyRef = useRef<FlowConfig[]>([emptyFlow()]);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const validations = useMemo(() => validateFlow(flow), [flow]);
  const nodeErrorMap = useMemo(() => {
    const map = new Map<string, ValidationItem[]>();
    for (const item of validations) {
      if (!item.nodeId) continue;
      map.set(item.nodeId, [...(map.get(item.nodeId) ?? []), item]);
    }
    return map;
  }, [validations]);

  const selectedNode = flow.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedNodeTemplateKey = String(selectedNode?.config?.templateKey ?? "");
  const selectedSendMode =
    selectedNodeTemplateKey === "send_email" &&
    (String(selectedNode?.config?.sendMode ?? "").toUpperCase() === "TEMPLATE" ||
      String(selectedNode?.config?.templateId ?? "").trim())
      ? "TEMPLATE"
      : "CUSTOM";

  const pushHistory = useCallback((next: FlowConfig) => {
    const trimmed = historyRef.current.slice(0, historyIndex + 1);
    const withNext = [...trimmed, next];
    historyRef.current = withNext.slice(-50);
    setHistoryIndex(historyRef.current.length - 1);
  }, [historyIndex]);

  const setFlowWithHistory = useCallback((updater: (prev: FlowConfig) => FlowConfig) => {
    setFlow((prev) => {
      const next = updater(prev);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${eventId}/flow`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: FlowConfig) => {
        if (cancelled) return;
        const loaded: FlowConfig = {
          version: 1 as const,
          status: data.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
          nodes: Array.isArray(data.nodes) ? data.nodes : [],
          edges: Array.isArray(data.edges) ? data.edges : [],
          updatedAt: data.updatedAt ?? new Date().toISOString(),
        };
        setFlow(loaded);
        historyRef.current = [loaded];
        setHistoryIndex(0);
      })
      .catch(() => {
        if (!cancelled) toast("Errore caricando Event Flow", { variant: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventId]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/flow/policy`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setApproveFirstCritical(data.approveFirstCritical === true);
      })
      .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTemplates(true);
    fetch(`/api/events/${eventId}/emails`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((rows: EmailTemplate[]) => {
        if (cancelled) return;
        setEmailTemplates(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setEmailTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/flow/runs`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRuns(Array.isArray(data.runs) ? data.runs.slice(0, 8) : []);
      })
      .catch(() => {});
  }, [eventId, flow.updatedAt]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const wrap = canvasWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const x = (e.clientX - rect.left + wrap.scrollLeft) / zoom - draggingRef.current.offsetX;
      const y = (e.clientY - rect.top + wrap.scrollTop) / zoom - draggingRef.current.offsetY;
      setFlow((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === draggingRef.current?.nodeId
            ? { ...n, x: Math.max(10, Math.min(CANVAS_W - NODE_W - 10, x)), y: Math.max(10, Math.min(CANVAS_H - NODE_H - 10, y)) }
            : n
        ),
      }));
    }
    function onMouseUp() {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      setFlow((prev) => {
        pushHistory(prev);
        return prev;
      });
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [pushHistory, zoom]);

  async function persist(status?: FlowStatus) {
    setSaving(true);
    try {
      const payload: FlowConfig = {
        ...flow,
        status: status ?? flow.status,
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch(`/api/events/${eventId}/flow`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as FlowConfig;
      await fetch(`/api/events/${eventId}/flow/policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveFirstCritical }),
      });
      setFlow(data);
      historyRef.current = [data];
      setHistoryIndex(0);
      toast(status === "PUBLISHED" ? "Flow pubblicato" : "Flow salvato", { variant: "success" });
    } catch {
      toast("Errore nel salvataggio del flow", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function undo() {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setFlow(historyRef.current[nextIndex]);
  }

  function redo() {
    if (historyIndex >= historyRef.current.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setFlow(historyRef.current[nextIndex]);
  }

  function onCanvasDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/eventflow-node-template");
    if (!raw) return;
    const tpl = JSON.parse(raw) as NodeTemplate;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left + e.currentTarget.scrollLeft) / zoom - NODE_W / 2;
    const y = (e.clientY - rect.top + e.currentTarget.scrollTop) / zoom - NODE_H / 2;
    setFlowWithHistory((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: newId("node"),
          type: tpl.type,
          label: tpl.label,
          x: Math.max(10, Math.min(CANVAS_W - NODE_W - 10, x)),
          y: Math.max(10, Math.min(CANVAS_H - NODE_H - 10, y)),
          active: true,
          config: { templateKey: tpl.key },
        },
      ],
    }));
  }

  function onCanvasDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function addConnection(source: string, target: string) {
    if (source === target) return;
    setFlowWithHistory((prev) => {
      if (prev.edges.some((e) => e.source === source && e.target === target)) return prev;
      return {
        ...prev,
        edges: [...prev.edges, { id: newId("edge"), source, target }],
      };
    });
  }

  function deleteNode(nodeId: string) {
    setFlowWithHistory((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (connectFrom === nodeId) setConnectFrom(null);
  }

  function duplicateNode(nodeId: string) {
    setFlowWithHistory((prev) => {
      const node = prev.nodes.find((n) => n.id === nodeId);
      if (!node) return prev;
      const nextId = newId("node");
      const cloned: FlowNode = {
        ...node,
        id: nextId,
        x: Math.max(10, Math.min(CANVAS_W - NODE_W - 10, node.x + 48)),
        y: Math.max(10, Math.min(CANVAS_H - NODE_H - 10, node.y + 48)),
      };
      return {
        ...prev,
        nodes: [...prev.nodes, cloned],
        edges: [...prev.edges, { id: newId("edge"), source: node.id, target: nextId, label: "" }],
      };
    });
  }

  function updateSelectedNodeConfig(patch: Record<string, unknown>) {
    if (!selectedNode) return;
    setFlowWithHistory((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === selectedNode.id
          ? { ...n, config: { ...(n.config ?? {}), ...patch } }
          : n
      ),
    }));
  }

  function testFlow() {
    const errors = validations.filter((v) => v.level === "error").length;
    const warnings = validations.filter((v) => v.level === "warning").length;
    if (!errors && !warnings) {
      toast("Flow valido. Pronto per la pubblicazione.", { variant: "success" });
      return;
    }
    if (errors) {
      toast(`Flow con ${errors} errori e ${warnings} warning`, { variant: "warning" });
    } else {
      toast(`Flow con ${warnings} warning`, { variant: "default" });
    }
  }

  async function runManualTriggerTest() {
    setTestingTrigger(true);
    try {
      const res = await fetch(`/api/events/${eventId}/flow/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: manualTrigger,
          registrationId: manualRegId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Errore test trigger", { variant: "error" });
        return;
      }
      toast(`Trigger "${manualTrigger}" eseguito`, { variant: "success" });
      const refresh = await fetch(`/api/events/${eventId}/flow/runs`);
      if (refresh.ok) {
        const payload = await refresh.json();
        setRuns(Array.isArray(payload.runs) ? payload.runs.slice(0, 8) : []);
      }
    } catch {
      toast("Errore di connessione", { variant: "error" });
    } finally {
      setTestingTrigger(false);
    }
  }

  async function loadDemoPack() {
    setLoadingPack(true);
    try {
      const res = await fetch(`/api/events/${eventId}/flow/demo-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: demoPack }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Errore caricando demo pack", { variant: "error" });
        return;
      }
      const loaded = data.config as FlowConfig;
      setFlow(loaded);
      historyRef.current = [loaded];
      setHistoryIndex(0);
      setApproveFirstCritical(true);
      toast(`Demo pack caricato: ${data.pack}`, { variant: "success" });
    } catch {
      toast("Errore di connessione", { variant: "error" });
    } finally {
      setLoadingPack(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-gray-500">Caricamento Event Flow...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded-lg px-2.5 text-xs"
          style={{ background: "rgba(14,21,38,0.90)", border: "1px solid rgba(109,98,243,0.22)", color: "var(--text-primary)" }}
          value={demoPack}
          onChange={(e) => setDemoPack(e.target.value as DemoPack)}
        >
          <option value="AUTO">Demo Pack Auto</option>
          <option value="PIRELLI">Pirelli</option>
          <option value="KFC_RGM_2026">KFC RGM 2026</option>
          <option value="WURTH_KICKOFF">Wurth Kick-Off</option>
        </select>
        <Button size="sm" variant="outline" onClick={loadDemoPack} disabled={loadingPack}>
          {loadingPack ? "Loading..." : "Load Demo Pack"}
        </Button>

        <Button size="sm" variant="outline" className="gap-1.5" onClick={undo} disabled={historyIndex <= 0}>
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={redo} disabled={historyIndex >= historyRef.current.length - 1}>
          <Redo2 className="h-3.5 w-3.5" /> Redo
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={testFlow}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Test
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => persist("DRAFT")} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => persist("PUBLISHED")} disabled={saving}>
          <CopyPlus className="h-3.5 w-3.5" /> Publish
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-gray-600 flex items-center gap-1.5 mr-2">
            <input
              type="checkbox"
              checked={approveFirstCritical}
              onChange={(e) => setApproveFirstCritical(e.target.checked)}
            />
            Approve-first critical
          </label>
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}><Minus className="h-3.5 w-3.5" /></Button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Block Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {LIBRARY.map((section) => (
              <div key={section.title}>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{section.title}</p>
                <div className="space-y-1.5">
                  {section.nodes.map((node) => (
                    <div
                      key={node.key}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("application/eventflow-node-template", JSON.stringify(node))
                      }
                      className={`rounded-lg border px-2.5 py-2 text-xs cursor-grab active:cursor-grabbing ${toneByType(node.type)}`}
                    >
                      {node.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Event Flow Canvas · {eventTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasWrapRef}
              className="relative border border-cyan-100 rounded-xl bg-slate-900/5 overflow-auto"
              style={{ height: 620 }}
              onDrop={onCanvasDrop}
              onDragOver={onCanvasDragOver}
            >
              <div
                className="relative origin-top-left"
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${zoom})`,
                  transformOrigin: "0 0",
                  backgroundImage:
                    "linear-gradient(rgba(6,182,212,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.08) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              >
                {flow.nodes.length === 0 && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="max-w-sm rounded-xl border border-cyan-200 bg-white/90 px-4 py-3 text-center shadow-sm">
                      <p className="text-sm font-semibold text-cyan-900">Inizia dal trigger</p>
                      <p className="mt-1 text-xs text-gray-600">
                        Trascina un blocco da sinistra e collega i nodi con <strong>Connect</strong> per creare il flow.
                      </p>
                    </div>
                  </div>
                )}
                <svg width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 pointer-events-none">
                  {flow.edges.map((edge) => {
                    const source = flow.nodes.find((n) => n.id === edge.source);
                    const target = flow.nodes.find((n) => n.id === edge.target);
                    if (!source || !target) return null;
                    const x1 = source.x + NODE_W;
                    const y1 = source.y + NODE_H / 2;
                    const x2 = target.x;
                    const y2 = target.y + NODE_H / 2;
                    const cx = (x1 + x2) / 2;
                    return (
                      <path
                        key={edge.id}
                        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                    );
                  })}
                </svg>

                {flow.nodes.map((node) => {
                  const selected = selectedNodeId === node.id;
                  const hasIssue = nodeErrorMap.has(node.id);
                  return (
                    <div
                      key={node.id}
                      className={`absolute rounded-xl border select-none ${selected ? "ring-2 ring-[rgba(109,98,243,0.60)] border-[rgba(139,128,255,0.50)]" : hasIssue ? "border-amber-500/50" : "border-[rgba(109,98,243,0.22)]"}`}
                      style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H, background: "linear-gradient(160deg,rgba(14,21,38,0.96),rgba(9,13,26,0.92))", boxShadow: "0 4px 16px rgba(6,8,15,0.40)" }}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        draggingRef.current = {
                          nodeId: node.id,
                          offsetX: (e.clientX - rect.left) / zoom,
                          offsetY: (e.clientY - rect.top) / zoom,
                        };
                      }}
                      onClick={() => {
                        if (connectFrom && connectFrom !== node.id) {
                          addConnection(connectFrom, node.id);
                          setConnectFrom(null);
                        }
                        setSelectedNodeId(node.id);
                      }}
                    >
                      <div className="px-2.5 py-2 border-b border-[rgba(109,98,243,0.12)] flex items-center gap-2">
                        <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${toneByType(node.type)}`}>
                          {node.type}
                        </span>
                        <span className="text-xs font-semibold truncate" style={{ color: "#edeef6" }}>{node.label}</span>
                        {!node.active && <span className="text-[10px] ml-auto" style={{ color: "#8590a8" }}>OFF</span>}
                      </div>
                      <div className="px-2.5 py-2 flex items-center justify-between">
                        <button
                          className={`h-6 px-2 rounded-md text-[10px] border ${connectFrom === node.id ? "border-[rgba(109,98,243,0.50)] bg-[rgba(109,98,243,0.12)] text-[#c4beff]" : "border-[rgba(109,98,243,0.20)] text-[#8590a8]"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConnectFrom((prev) => (prev === node.id ? null : node.id));
                          }}
                        >
                          Connect
                        </button>
                        <button
                          className="h-6 w-6 rounded-md border border-red-200 text-red-600 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Inspector</CardTitle>
              <button className="text-xs text-cyan-600 flex items-center gap-1" onClick={() => setShowMiniMap((v) => !v)}>
                Mini-map {showMiniMap ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedNode && <p className="text-xs text-gray-500">Seleziona un nodo per configurarlo.</p>}
            {selectedNode && (
              <>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50/60 p-2.5">
                  <p className="text-[11px] font-semibold text-cyan-800">Guida rapida nodo</p>
                  <p className="mt-1 text-xs text-cyan-900/80">
                    {selectedNode.type === "trigger"
                      ? "Questo blocco avvia il flow quando accade l'evento indicato."
                      : selectedNode.type === "condition"
                        ? "Questo blocco decide il percorso (true/false). Collega almeno due uscite."
                        : selectedNode.type === "ai_action"
                          ? "Questo blocco usa AI per generare output o classificare dati."
                          : selectedNodeTemplateKey === "send_email"
                            ? "Scegli se inviare un template esistente o una email custom."
                            : "Questo blocco esegue un'azione operativa nel workflow."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Label nodo</label>
                  <Input
                    value={selectedNode.label}
                    onChange={(e) =>
                      setFlowWithHistory((prev) => ({
                        ...prev,
                        nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, label: e.target.value } : n)),
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Nodo attivo</span>
                  <button
                    className={`h-6 px-2 rounded-md border ${selectedNode.active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500"}`}
                    onClick={() =>
                      setFlowWithHistory((prev) => ({
                        ...prev,
                        nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, active: !n.active } : n)),
                      }))
                    }
                  >
                    {selectedNode.active ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Quick actions</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => duplicateNode(selectedNode.id)}
                  >
                    Duplica + collega
                  </Button>
                </div>

                {(selectedNode.type === "action" || selectedNode.type === "ai_action") && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Require approval</span>
                    <button
                      className={`h-6 px-2 rounded-md border ${(selectedNode.config?.approveFirst === true) ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500"}`}
                      onClick={() =>
                        setFlowWithHistory((prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, config: { ...(n.config ?? {}), approveFirst: !(n.config?.approveFirst === true) } }
                              : n
                          ),
                        }))
                      }
                    >
                      {selectedNode.config?.approveFirst === true ? "ON" : "OFF"}
                    </button>
                  </div>
                )}

                {selectedNode.type === "action" && String(selectedNode.config?.templateKey ?? "") === "send_email" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs text-gray-600">Fonte email</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={`h-8 rounded-lg border text-xs ${
                          selectedSendMode === "TEMPLATE"
                            ? "border-cyan-300 bg-cyan-50 text-cyan-700"
                            : "border-gray-200 text-gray-500"
                        }`}
                        onClick={() => updateSelectedNodeConfig({ sendMode: "TEMPLATE" })}
                      >
                        Da Template
                      </button>
                      <button
                        className={`h-8 rounded-lg border text-xs ${
                          selectedSendMode === "CUSTOM"
                            ? "border-cyan-300 bg-cyan-50 text-cyan-700"
                            : "border-gray-200 text-gray-500"
                        }`}
                        onClick={() => updateSelectedNodeConfig({ sendMode: "CUSTOM" })}
                      >
                        Email Custom
                      </button>
                    </div>

                    {selectedSendMode === "TEMPLATE" ? (
                      <>
                        <label className="block text-xs text-gray-600 mt-1">Template</label>
                        <select
                          className="h-8 w-full rounded-lg px-2.5 text-xs" style={{ background: "rgba(14,21,38,0.90)", border: "1px solid rgba(109,98,243,0.22)", color: "var(--text-primary)" }}
                          value={String(selectedNode.config?.templateId ?? "")}
                          onChange={(e) => updateSelectedNodeConfig({ templateId: e.target.value })}
                          disabled={loadingTemplates}
                        >
                          <option value="">
                            {loadingTemplates ? "Caricamento template..." : "Seleziona template"}
                          </option>
                          {emailTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} {template.isDefault ? "• default" : ""}
                            </option>
                          ))}
                        </select>
                        {!loadingTemplates && emailTemplates.length === 0 && (
                          <p className="text-[11px] text-amber-700">
                            Nessun template disponibile in evento. Creane uno nella sezione Email.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="block text-xs text-gray-600">Email Subject</label>
                        <Input
                          value={String(selectedNode.config?.subject ?? "")}
                          onChange={(e) => updateSelectedNodeConfig({ subject: e.target.value })}
                          placeholder="Oggetto email"
                        />
                        <label className="block text-xs text-gray-600">Email Body</label>
                        <textarea
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                          rows={4}
                          value={String(selectedNode.config?.body ?? "")}
                          onChange={(e) => updateSelectedNodeConfig({ body: e.target.value })}
                          placeholder="Testo email con {{firstName}} e {{eventTitle}}"
                        />
                      </>
                    )}
                  </div>
                )}

                {selectedNode.type === "action" && String(selectedNode.config?.templateKey ?? "") === "update_guest_status" && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Target status</label>
                    <select
                      className="h-8 rounded-lg px-2.5 text-xs" style={{ background: "rgba(14,21,38,0.90)", border: "1px solid rgba(109,98,243,0.22)", color: "var(--text-primary)" }}
                      value={String(selectedNode.config?.status ?? "PENDING")}
                      onChange={(e) =>
                        setFlowWithHistory((prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, config: { ...(n.config ?? {}), status: e.target.value } }
                              : n
                          ),
                        }))
                      }
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="WAITLIST">WAITLIST</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {showMiniMap && (
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-[11px] font-semibold text-gray-600 mb-2">Mini-map</p>
                <svg width="100%" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="bg-slate-900/5 rounded">
                  {flow.edges.map((edge) => {
                    const source = flow.nodes.find((n) => n.id === edge.source);
                    const target = flow.nodes.find((n) => n.id === edge.target);
                    if (!source || !target) return null;
                    return (
                      <line
                        key={edge.id}
                        x1={source.x + NODE_W / 2}
                        y1={source.y + NODE_H / 2}
                        x2={target.x + NODE_W / 2}
                        y2={target.y + NODE_H / 2}
                        stroke="#94a3b8"
                        strokeWidth="8"
                        opacity="0.6"
                      />
                    );
                  })}
                  {flow.nodes.map((node) => (
                    <rect
                      key={node.id}
                      x={node.x}
                      y={node.y}
                      width={NODE_W}
                      height={NODE_H}
                      rx="18"
                      fill={node.type === "trigger" ? "#34d399" : node.type === "condition" ? "#fbbf24" : node.type === "ai_action" ? "#a78bfa" : "#22d3ee"}
                      opacity={node.active ? 0.9 : 0.45}
                    />
                  ))}
                </svg>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 p-2.5">
              <p className="text-[11px] font-semibold text-gray-600 mb-2">Validation</p>
              {validations.length === 0 && (
                <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Nessun problema rilevato.
                </p>
              )}
              <div className="space-y-1.5">
                {validations.map((v, idx) => (
                  <button
                    key={`${v.message}-${idx}`}
                    className={`w-full text-left text-xs flex items-start gap-1.5 ${v.level === "error" ? "text-red-600" : "text-amber-700"} ${v.nodeId ? "hover:underline" : ""}`}
                    onClick={() => v.nodeId && setSelectedNodeId(v.nodeId)}
                  >
                    {v.level === "error" ? <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> : <CircleDashed className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
                    <span>{v.message}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-gray-500">
              Status: <strong>{flow.status}</strong> · Nodes: <strong>{flow.nodes.length}</strong> · Edges: <strong>{flow.edges.length}</strong>
            </div>

            <div className="rounded-lg border border-gray-200 p-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-gray-600">Manual trigger test</p>
              <select
                className="h-8 w-full rounded-lg px-2.5 text-xs" style={{ background: "rgba(14,21,38,0.90)", border: "1px solid rgba(109,98,243,0.22)", color: "var(--text-primary)" }}
                value={manualTrigger}
                onChange={(e) => setManualTrigger(e.target.value)}
              >
                <option value="registration_submitted">registration_submitted</option>
                <option value="guest_imported">guest_imported</option>
                <option value="guest_status_updated">guest_status_updated</option>
                <option value="checkin_completed">checkin_completed</option>
                <option value="email_sent">email_sent</option>
              </select>
              <Input
                value={manualRegId}
                onChange={(e) => setManualRegId(e.target.value)}
                placeholder="registrationId (opzionale)"
              />
              <Button size="sm" variant="outline" onClick={runManualTriggerTest} disabled={testingTrigger} className="w-full">
                {testingTrigger ? "Testing..." : "Run trigger test"}
              </Button>
            </div>

            <div className="rounded-lg border border-gray-200 p-2.5">
              <p className="text-[11px] font-semibold text-gray-600 mb-2">Execution state sync</p>
              {runs.length === 0 ? (
                <p className="text-xs text-gray-500">Nessuna esecuzione recente.</p>
              ) : (
                <div className="space-y-1.5">
                  {runs.map((run) => (
                    <div key={run.id} className="text-[11px] text-gray-600">
                      <p>
                        {new Date(run.at).toLocaleString("it-IT")} · <strong>{run.trigger}</strong> · nodes {run.executedNodes.length} · email {run.sentEmails}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
