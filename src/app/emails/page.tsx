"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Plus, Eye, Wand2, Loader2 } from "lucide-react";

const DEFAULT_TEMPLATES = [
  {
    id: "confirmation",
    name: "Conferma Iscrizione",
    type: "CONFIRMATION",
    subject: "Iscrizione confermata — {{event_title}}",
    body: `Ciao {{first_name}},

La tua iscrizione a **{{event_title}}** è confermata!

📅 **Data:** {{event_date}}
📍 **Luogo:** {{event_location}}
🎫 **Codice iscrizione:** {{registration_code}}

Ti aspettiamo!

Il team di EventFlow`,
  },
  {
    id: "reminder",
    name: "Promemoria Evento",
    type: "REMINDER",
    subject: "Reminder: {{event_title}} è tra poco!",
    body: `Ciao {{first_name}},

Ti ricordiamo che **{{event_title}}** si terrà tra 24 ore.

📅 {{event_date}}
📍 {{event_location}}

Non dimenticare di portare il tuo codice: **{{registration_code}}**

A domani!`,
  },
  {
    id: "waitlist",
    name: "Lista d'Attesa",
    type: "WAITLIST",
    subject: "Sei in lista d'attesa — {{event_title}}",
    body: `Ciao {{first_name}},

Hai aggiunto il tuo nome alla lista d'attesa per **{{event_title}}**.

Ti contatteremo appena si libera un posto. Grazie per la pazienza!`,
  },
];

export default function EmailsPage() {
  const [selected, setSelected] = useState(DEFAULT_TEMPLATES[0]);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [body, setBody] = useState(DEFAULT_TEMPLATES[0].body);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);

  function selectTemplate(t: (typeof DEFAULT_TEMPLATES)[0]) {
    setSelected(t);
    setSubject(t.subject);
    setBody(t.body);
    setEditing(false);
    setPreview(false);
  }

  function renderPreview(text: string) {
    return text
      .replace(/{{first_name}}/g, "Mario")
      .replace(/{{event_title}}/g, "Forum Innovazione 2025")
      .replace(/{{event_date}}/g, "15 Marzo 2025")
      .replace(/{{event_location}}/g, "Milano, MiCo Convention Center")
      .replace(/{{registration_code}}/g, "REG-ABC12345");
  }

  const typeColors: Record<string, string> = {
    CONFIRMATION: "bg-green-100 text-green-700",
    REMINDER: "bg-blue-100 text-blue-700",
    WAITLIST: "bg-yellow-100 text-yellow-700",
    CUSTOM: "bg-purple-100 text-purple-700",
  };

  const typeLabels: Record<string, string> = {
    CONFIRMATION: "Conferma", REMINDER: "Promemoria", WAITLIST: "Lista Attesa", CUSTOM: "Personalizzata",
  };

  return (
    <DashboardLayout>
      <Header
        title="Email Templates"
        subtitle="Gestisci le email automatiche per i tuoi eventi"
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Template
          </Button>
        }
      />

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Template list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Template</p>
          {DEFAULT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                selected.id === t.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Mail className={`h-4 w-4 ${selected.id === t.id ? "text-blue-600" : "text-gray-400"}`} />
                <span className="font-medium text-sm text-gray-900">{t.name}</span>
              </div>
              <Badge className={typeColors[t.type]}>{typeLabels[t.type]}</Badge>
            </button>
          ))}
          <button className="w-full text-left rounded-xl border-2 border-dashed border-gray-200 p-3.5 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center gap-2 text-gray-400 hover:text-blue-600">
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Nuovo Template</span>
          </button>
        </div>

        {/* Editor / Preview */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{selected.name}</CardTitle>
                <Badge className={typeColors[selected.type]}>{typeLabels[selected.type]}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPreview(!preview); setEditing(false); }} className="gap-2 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  {preview ? "Modifica" : "Anteprima"}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <Wand2 className="h-3.5 w-3.5" />
                  AI Enhance
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview ? (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 border-b px-4 py-3">
                    <p className="text-xs text-gray-500">Da: <span className="font-medium">EventFlow &lt;no-reply@eventflow.it&gt;</span></p>
                    <p className="text-xs text-gray-500">A: <span className="font-medium">mario.rossi@example.it</span></p>
                    <p className="text-xs text-gray-500">Oggetto: <span className="font-medium">{renderPreview(subject)}</span></p>
                  </div>
                  <div className="p-5 bg-white whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {renderPreview(body)}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Oggetto</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Corpo Email</label>
                    <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm" />
                  </div>
                </>
              )}

              {/* Variables */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">Variabili disponibili:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["{{first_name}}", "{{last_name}}", "{{event_title}}", "{{event_date}}", "{{event_location}}", "{{registration_code}}"].map((v) => (
                    <code key={v} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100"
                      onClick={() => !preview && setBody((b) => b + ` ${v}`)}>
                      {v}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="gap-2">
                  <Send className="h-4 w-4" />
                  Salva Template
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setSending(true)}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Invia Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
