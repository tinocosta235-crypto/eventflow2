"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import {
  X, Sparkles, Send, Loader2, RotateCcw,
  FileText, Mail, ClipboardList, GitBranch, Bot,
  ChevronRight,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType = "report" | "email" | "form" | "flow" | "general"

interface Message {
  role: "user" | "assistant"
  content: string
  id: string
}

interface Suggestion {
  label: string
  prompt: string
}

// ── Agent config ──────────────────────────────────────────────────────────────

const AGENTS: Record<AgentType, {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  glow: string
  description: string
}> = {
  report:  { label: "Report",  icon: FileText,     color: "#F472B6", glow: "rgba(244,114,182,0.3)", description: "Genera report e analytics" },
  email:   { label: "Email",   icon: Mail,         color: "#22D3EE", glow: "rgba(34,211,238,0.3)",  description: "Analizza campagne email" },
  form:    { label: "Form",    icon: ClipboardList, color: "#A78BFA", glow: "rgba(167,139,250,0.3)", description: "Audit form registrazione" },
  flow:    { label: "Flow",    icon: GitBranch,    color: "#34D399", glow: "rgba(52,211,153,0.3)",  description: "Ottimizza workflow" },
  general: { label: "Phorma", icon: Bot,           color: "#9D8DF5", glow: "rgba(157,141,245,0.3)", description: "Assistente generale" },
}

// ── Contextual suggestions ────────────────────────────────────────────────────

function getSuggestions(agent: AgentType, hasEvent: boolean): Suggestion[] {
  if (!hasEvent) {
    return [
      { label: "Come creo un evento?", prompt: "Come si crea un nuovo evento su Phorma?" },
      { label: "Funzionalità principali", prompt: "Quali sono le funzionalità principali di Phorma?" },
    ]
  }
  const map: Record<AgentType, Suggestion[]> = {
    report: [
      { label: "Genera report completo", prompt: "Genera un report completo per questo evento" },
      { label: "Analisi iscrizioni", prompt: "Come stanno andando le iscrizioni? Analizza i dati" },
      { label: "KPI principali", prompt: "Quali sono i KPI più critici da monitorare?" },
    ],
    email: [
      { label: "Analizza aperture email", prompt: "Analizza i tassi di apertura delle email inviate" },
      { label: "Migliora oggetto email", prompt: "Suggerisci come migliorare l'oggetto delle email" },
      { label: "Campagna promemoria", prompt: "Scrivi un'email di promemoria per i partecipanti" },
    ],
    form: [
      { label: "Audit form registrazione", prompt: "Fai un audit del form di registrazione" },
      { label: "Campi da aggiungere", prompt: "Quali campi mancano nel form di registrazione?" },
      { label: "Migliora conversioni", prompt: "Come posso migliorare il tasso di completamento del form?" },
    ],
    flow: [
      { label: "Ottimizza il flow", prompt: "Analizza e ottimizza il workflow dell'evento" },
      { label: "Automazioni consigliate", prompt: "Quali automazioni dovrei aggiungere?" },
      { label: "Trigger mancanti", prompt: "Ci sono trigger importanti che non ho configurato?" },
    ],
    general: [
      { label: "Panoramica evento", prompt: "Dammi una panoramica generale di questo evento" },
      { label: "Cosa fare ora?", prompt: "Cosa dovrei fare adesso per migliorare l'evento?" },
      { label: "Azioni prioritarie", prompt: "Quali sono le azioni più urgenti per questo evento?" },
    ],
  }
  return map[agent]
}

// ── Agent icon helper ─────────────────────────────────────────────────────────

function AgentIcon({ agent, size, color }: { agent: AgentType; size: number; color: string }) {
  const icons: Record<AgentType, React.ReactNode> = {
    report:  <FileText size={size} style={{ color }} />,
    email:   <Mail size={size} style={{ color }} />,
    form:    <ClipboardList size={size} style={{ color }} />,
    flow:    <GitBranch size={size} style={{ color }} />,
    general: <Bot size={size} style={{ color }} />,
  }
  return <>{icons[agent]}</>
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, agentColor }: { msg: Message; agentColor: string }) {
  const isUser = msg.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-[10px]"
          style={{ background: agentColor, boxShadow: `0 0 8px ${agentColor}60` }}
        >
          ✦
        </div>
      )}
      <div
        className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
        style={isUser ? {
          background: "rgba(112,96,204,0.25)",
          border: "1px solid rgba(112,96,204,0.3)",
          color: "#e2e0f5",
        } : {
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#d4d0ee",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function extractEventId(pathname: string): string | null {
  const match = pathname.match(/\/events\/([^/]+)/)
  return match ? match[1] : null
}

export function FloatingAgentPanel() {
  const pathname = usePathname()
  const eventId = extractEventId(pathname)

  const [open, setOpen] = useState(false)
  const [activeAgent, setActiveAgent] = useState<AgentType>("general")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const agentConfig = AGENTS[activeAgent]
  const suggestions = getSuggestions(activeAgent, !!eventId)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // Reset chat on agent change
  const switchAgent = useCallback((agent: AgentType) => {
    setActiveAgent(agent)
    setMessages([])
    setInput("")
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    const userMsg: Message = { role: "user", content: text.trim(), id: Date.now().toString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setStreaming(true)

    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId }])

    abortRef.current = new AbortController()
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          agentType: activeAgent,
          eventId: eventId ?? undefined,
        }),
      })
      if (!res.ok || !res.body) throw new Error("Errore risposta")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: accumulated } : m
        ))
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: "Errore nella risposta. Riprova." } : m
        ))
      }
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming, activeAgent, eventId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Apri agenti AI"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 99999,
          display: "flex", alignItems: "center", gap: 8,
          background: open
            ? "rgba(112,96,204,0.2)"
            : "linear-gradient(135deg, #7060CC 0%, #9D8DF5 100%)",
          color: "#fff",
          border: open ? "1px solid rgba(157,141,245,0.4)" : "none",
          borderRadius: 999,
          padding: "11px 20px",
          fontSize: 14, fontWeight: 600,
          cursor: "pointer",
          boxShadow: open ? "none" : "0 4px 24px rgba(112,96,204,0.5), 0 0 0 1px rgba(157,141,245,0.2)",
          transition: "all 0.2s ease",
        }}
      >
        {open
          ? <X size={16} />
          : <Sparkles size={16} style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))" }} />
        }
        {open ? "Chiudi" : "✦ Agenti"}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 76, right: 24, zIndex: 99998,
            width: 400, height: 580,
            borderRadius: 20,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            background: "linear-gradient(180deg, #130830 0%, #0D0522 100%)",
            border: "1px solid rgba(157,141,245,0.2)",
            boxShadow: "0 16px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(157,141,245,0.1)",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "14px 16px 0",
            background: "linear-gradient(180deg, rgba(112,96,204,0.12) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            {/* Agent tabs */}
            <div style={{ display: "flex", gap: 4, paddingBottom: 12, overflowX: "auto" }}>
              {(Object.entries(AGENTS) as [AgentType, typeof AGENTS[AgentType]][])
                .filter(([k]) => k !== "general")
                .concat([["general", AGENTS.general]])
                .map(([key, cfg]) => {
                  const Icon = cfg.icon
                  const active = activeAgent === key
                  return (
                    <button
                      key={key}
                      onClick={() => switchAgent(key as AgentType)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 11px",
                        borderRadius: 999,
                        border: active
                          ? `1px solid ${cfg.color}60`
                          : "1px solid rgba(255,255,255,0.08)",
                        background: active
                          ? `${cfg.color}18`
                          : "rgba(255,255,255,0.04)",
                        color: active ? cfg.color : "rgba(255,255,255,0.45)",
                        fontSize: 12, fontWeight: active ? 600 : 400,
                        cursor: "pointer", whiteSpace: "nowrap",
                        transition: "all 0.15s",
                        boxShadow: active ? `0 0 12px ${cfg.glow}` : "none",
                      }}
                    >
                      <Icon size={12} />
                      {cfg.label}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 24 }}>
                {/* Agent avatar */}
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `${agentConfig.color}20`,
                  border: `1.5px solid ${agentConfig.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 10px",
                  boxShadow: `0 0 24px ${agentConfig.glow}`,
                }}>
                  <AgentIcon agent={activeAgent} size={22} color={agentConfig.color} />
                </div>
                <p style={{ color: "#e2e0f5", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  Agente {agentConfig.label}
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 20 }}>
                  {agentConfig.description}
                  {eventId ? "" : " — apri un evento per accedere ai dati"}
                </p>

                {/* Suggestions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.prompt)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: `1px solid ${agentConfig.color}25`,
                        background: `${agentConfig.color}08`,
                        color: "rgba(255,255,255,0.65)",
                        fontSize: 12, fontWeight: 400,
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${agentConfig.color}18`
                        ;(e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)"
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${agentConfig.color}08`
                        ;(e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"
                      }}
                    >
                      <span>{s.label}</span>
                      <ChevronRight size={12} style={{ color: agentConfig.color, flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} agentColor={agentConfig.color} />
                ))}
                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="flex justify-start mb-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
                      style={{ background: agentConfig.color }}>
                      ✦
                    </div>
                    <div style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16, padding: "8px 12px",
                    }}>
                      <Loader2 size={14} style={{ color: agentConfig.color, animation: "spin 1s linear infinite" }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div style={{
            padding: "10px 12px 12px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.2)",
          }}>
            {/* Quick suggestions on active chat */}
            {messages.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
                {suggestions.slice(0, 2).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.prompt)}
                    disabled={streaming}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: `1px solid ${agentConfig.color}30`,
                      background: `${agentConfig.color}10`,
                      color: streaming ? "rgba(255,255,255,0.2)" : agentConfig.color,
                      fontSize: 11, cursor: streaming ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap", flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => { setMessages([]); setInput("") }}
                  style={{
                    padding: "4px 8px", borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 11, cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <RotateCcw size={10} /> Reset
                </button>
              </div>
            )}

            {/* Text input */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Scrivi a ${agentConfig.label}...`}
                rows={1}
                disabled={streaming}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${input ? agentConfig.color + "50" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 12,
                  padding: "9px 12px",
                  color: "#e2e0f5",
                  fontSize: 13,
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  maxHeight: 96,
                  overflowY: "auto",
                  transition: "border-color 0.15s",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: !input.trim() || streaming
                    ? "rgba(255,255,255,0.08)"
                    : `linear-gradient(135deg, ${agentConfig.color}, ${agentConfig.color}cc)`,
                  border: "none", cursor: !input.trim() || streaming ? "not-allowed" : "pointer",
                  color: !input.trim() || streaming ? "rgba(255,255,255,0.2)" : "#fff",
                  transition: "all 0.15s",
                  boxShadow: !input.trim() || streaming ? "none" : `0 2px 12px ${agentConfig.glow}`,
                }}
              >
                {streaming
                  ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                  : <Send size={15} />
                }
              </button>
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 6, textAlign: "center" }}>
              Enter per inviare · Shift+Enter per andare a capo
            </p>
          </div>
        </div>
      )}
    </>
  )
}
