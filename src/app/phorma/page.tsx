"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Loader2, Copy, Download, Eye, Wand2, RefreshCw,
  Sparkles, Layout, FileText, Globe,
} from "lucide-react";

const TEMPLATES = [
  { id: "conference", label: "Conferenza", icon: "🎤", prompt: "Landing page per conferenza business con agenda, speaker e form iscrizione" },
  { id: "workshop", label: "Workshop", icon: "🛠", prompt: "Pagina workshop tecnico con orari, argomenti, form e costo partecipazione" },
  { id: "webinar", label: "Webinar", icon: "💻", prompt: "Landing page webinar online gratuito con countdown, relatori e form registrazione" },
  { id: "gala", label: "Gala / Cena", icon: "🥂", prompt: "Pagina elegante per cena di gala aziendale con dress code e RSVP" },
  { id: "hackathon", label: "Hackathon", icon: "⚡", prompt: "Landing page hackathon con premi, regole, team formation e form iscrizione" },
  { id: "course", label: "Corso", icon: "📚", prompt: "Pagina corso formativo con programma, docenti, costo e form iscrizione" },
];

const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Forum Innovazione 2025</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 font-sans">
  <!-- Hero -->
  <section class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20 px-4">
    <div class="max-w-4xl mx-auto text-center">
      <span class="inline-block bg-white/20 text-white text-sm px-4 py-1 rounded-full mb-4">📅 15 Marzo 2025 · Milano</span>
      <h1 class="text-5xl font-bold mb-4">Forum Nazionale<br/>Innovazione 2025</h1>
      <p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">Il principale appuntamento annuale sull'innovazione tecnologica in Italia. Due giorni di keynote, workshop e networking.</p>
      <div class="flex gap-4 justify-center flex-wrap">
        <a href="#register" class="bg-white text-blue-700 px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition">Iscriviti Ora →</a>
        <a href="#agenda" class="border-2 border-white/50 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/10 transition">Vedi Agenda</a>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="bg-white border-b">
    <div class="max-w-4xl mx-auto py-8 px-4 grid grid-cols-3 gap-6 text-center">
      <div><p class="text-3xl font-bold text-blue-600">500+</p><p class="text-gray-500 text-sm mt-1">Partecipanti</p></div>
      <div><p class="text-3xl font-bold text-blue-600">40+</p><p class="text-gray-500 text-sm mt-1">Speaker</p></div>
      <div><p class="text-3xl font-bold text-blue-600">20+</p><p class="text-gray-500 text-sm mt-1">Workshop</p></div>
    </div>
  </section>

  <!-- Agenda -->
  <section id="agenda" class="max-w-4xl mx-auto py-16 px-4">
    <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">Agenda</h2>
    <div class="space-y-4">
      <div class="bg-white rounded-xl p-5 border flex gap-4">
        <span class="text-blue-600 font-bold text-sm whitespace-nowrap mt-0.5">09:00</span>
        <div><p class="font-semibold text-gray-900">Apertura e Welcome Coffee</p><p class="text-sm text-gray-500">Registrazione e networking iniziale</p></div>
      </div>
      <div class="bg-white rounded-xl p-5 border flex gap-4">
        <span class="text-blue-600 font-bold text-sm whitespace-nowrap mt-0.5">10:00</span>
        <div><p class="font-semibold text-gray-900">Keynote: Il Futuro dell'AI in Italia</p><p class="text-sm text-gray-500">Marco Bianchi, CEO TechItalia</p></div>
      </div>
      <div class="bg-white rounded-xl p-5 border flex gap-4">
        <span class="text-blue-600 font-bold text-sm whitespace-nowrap mt-0.5">14:00</span>
        <div><p class="font-semibold text-gray-900">Workshop Paralleli</p><p class="text-sm text-gray-500">AI, Cloud, Cybersecurity, Blockchain</p></div>
      </div>
    </div>
  </section>

  <!-- Registration Form -->
  <section id="register" class="bg-gradient-to-br from-gray-900 to-blue-900 py-16 px-4">
    <div class="max-w-xl mx-auto">
      <h2 class="text-3xl font-bold text-white text-center mb-2">Iscriviti Ora</h2>
      <p class="text-blue-200 text-center mb-8">Posti limitati — assicurati il tuo posto</p>
      <form class="bg-white rounded-2xl p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Nome" class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Cognome" class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <input type="email" placeholder="Email aziendale" class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Azienda" class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Ruolo / Job Title" class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" class="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition">Invia Iscrizione →</button>
        <p class="text-xs text-gray-400 text-center">Iscrizione gratuita · Posti limitati a 500</p>
      </form>
    </div>
  </section>
</body>
</html>`;

export default function PhormaPage() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [html, setHtml] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setHtml("");
    try {
      const res = await fetch("/api/phorma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setHtml(data.html || EXAMPLE_HTML);
    } catch {
      // Fallback to example
      setHtml(EXAMPLE_HTML);
    } finally {
      setGenerating(false);
    }
  }

  function applyTemplate(t: (typeof TEMPLATES)[0]) {
    setSelectedTemplate(t.id);
    setPrompt(t.prompt);
  }

  function copyHtml() {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "landing-page.html";
    a.click();
  }

  return (
    <DashboardLayout>
      <Header
        title="Phorma AI"
        subtitle="Genera landing page e form di iscrizione con l'AI"
        actions={
          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 gap-1">
            <Sparkles className="h-3 w-3" />
            AI Powered
          </Badge>
        }
      />

      <div className="p-6">
        <div className={`grid gap-6 ${html ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"}`}>
          {/* Input panel */}
          <div className="space-y-4">
            {/* Templates */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layout className="h-4 w-4 text-blue-500" />Template Rapidi</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                        selectedTemplate === t.id
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Prompt */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-500" />
                  Descrivi il tuo evento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={5}
                  placeholder="Es: Crea una landing page professionale per un forum tecnologico a Milano il 15 marzo 2025, con sezione agenda, speaker, sponsor e modulo di iscrizione gratuita..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={generate}
                    disabled={generating || !prompt.trim()}
                    className="flex-1 gap-2"
                  >
                    {generating
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Generazione in corso...</>
                      : <><Zap className="h-4 w-4" />Genera con AI</>}
                  </Button>
                  {html && (
                    <Button variant="outline" size="icon" onClick={() => { setHtml(""); }} title="Reset">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {generating && (
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-600 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                    L&apos;AI sta creando la tua landing page su misura...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How it works */}
            {!html && (
              <Card className="bg-gradient-to-br from-gray-50 to-blue-50 border-blue-100">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" />Come funziona</h3>
                  <ol className="space-y-2 text-sm text-gray-600">
                    {[
                      "Scegli un template o descrivi il tuo evento",
                      "L'AI genera una landing page HTML completa",
                      "Visualizza l'anteprima e personalizza",
                      "Scarica o copia il codice HTML",
                      "Pubblica con un clic su EventFlow",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* HTML code panel */}
            {html && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Codice HTML</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyHtml} className="gap-2 text-xs">
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "Copiato!" : "Copia"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadHtml} className="gap-2 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      Scarica
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-950 text-green-400 p-4 rounded-lg overflow-auto max-h-60 font-mono">
                    {html.slice(0, 2000)}{html.length > 2000 ? "\n... (codice troncato)" : ""}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview */}
          {html && (
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-500" />
                  Anteprima Live
                </CardTitle>
                <Badge className="bg-green-100 text-green-700">Generato ✓</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t border-gray-100 bg-gray-100 px-3 py-1.5 flex items-center gap-2">
                  <div className="flex gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400" /><div className="h-3 w-3 rounded-full bg-yellow-400" /><div className="h-3 w-3 rounded-full bg-green-400" /></div>
                  <div className="flex-1 bg-white rounded px-3 py-0.5 text-xs text-gray-400 truncate">eventflow.it/e/il-tuo-evento</div>
                </div>
                <iframe
                  srcDoc={html}
                  className="w-full h-[600px] border-0"
                  title="Anteprima landing page"
                  sandbox="allow-same-origin"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
