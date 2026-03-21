"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Send, RefreshCw, ChevronDown, ChevronUp, Bot, User } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

function MarkdownText({ text }: { text: string }) {
  // Minimal markdown: **bold**, ## heading, - bullet, newlines
  const lines = text.split("\n")
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="font-semibold text-gray-900 mt-3 mb-1 text-sm">
              {line.slice(3)}
            </p>
          )
        }
        if (line.startsWith("### ")) {
          return (
            <p key={i} className="font-medium text-gray-800 mt-2 text-sm">
              {line.slice(4)}
            </p>
          )
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const content = line.slice(2)
          return (
            <div key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: bold(content) }} />
            </div>
          )
        }
        if (line.trim() === "") return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: bold(line) }} />
        )
      })}
    </div>
  )
}

function bold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
}

// Pannello analisi KPI con streaming
export function AIAnalyzePanel({ eventId }: { eventId: string }) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function analyze() {
    setOpen(true)
    setContent("")
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/analyze`, { method: "POST" })
      if (!res.ok || !res.body) { setContent("Errore nel caricamento."); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setContent((prev) => prev + decoder.decode(value))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm text-purple-900">Analisi AI — d*motion</CardTitle>
          </div>
          <div className="flex gap-2">
            {content && (
              <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="h-7 px-2">
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              size="sm"
              onClick={analyze}
              disabled={loading}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white h-7 px-3 text-xs"
            >
              {loading ? (
                <><RefreshCw className="h-3 w-3 animate-spin" />Analisi in corso...</>
              ) : (
                <><Sparkles className="h-3 w-3" />{content ? "Rigenera" : "Analizza con AI"}</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && content && (
        <CardContent className="pt-0">
          <div className="bg-white rounded-lg border border-purple-100 p-4">
            <MarkdownText text={content} />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Email quality scorer
export function AIEmailScorer({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function score() {
    if (!subject.trim() || !body.trim()) return
    setOpen(true)
    setResult("")
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/ai/email-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, eventTitle }),
      })
      if (!res.ok || !res.body) { setResult("Errore nel caricamento."); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setResult((prev) => prev + decoder.decode(value))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm text-blue-900">Email Quality Scorer</CardTitle>
        </div>
        <p className="text-xs text-blue-700 mt-1">
          Incolla un&apos;email e ricevi un&apos;analisi AI con score e suggerimenti di riscrittura
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Oggetto email</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Es: Conferma iscrizione — EventName 2026"
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Corpo email</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Incolla qui il testo dell'email..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
        <Button
          size="sm"
          onClick={score}
          disabled={loading || !subject.trim() || !body.trim()}
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Analisi...</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" />Analizza email</>
          )}
        </Button>

        {open && result && (
          <div className="bg-white rounded-lg border border-blue-100 p-4 mt-2">
            <MarkdownText text={result} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Chat contestuale
export function AIChatPanel({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: "user", content: text }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`/api/events/${eventId}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Errore nel caricamento." }])
        return
      }

      // Streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "" }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    "Come posso migliorare il tasso di conferma?",
    "Quali email invio per ridurre l'abbandono?",
    "Come ottimizzare il form di registrazione?",
    "Cosa fare per aumentare il check-in rate?",
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-gray-600" />
          <CardTitle className="text-sm">Assistente evento</CardTitle>
        </div>
        <p className="text-xs text-gray-500">Fai domande sui dati, chiedi suggerimenti, analizza trend</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messaggi */}
        <div className="h-72 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 text-center py-4">Inizia una conversazione o scegli un suggerimento</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s) }}
                    className="text-left text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-purple-600" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.role === "assistant" ? (
                  <MarkdownText text={m.content || "▋"} />
                ) : (
                  m.content
                )}
              </div>
              {m.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Scrivi un messaggio..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            disabled={loading}
          />
          <Button size="sm" onClick={send} disabled={loading || !input.trim()} className="px-3">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
