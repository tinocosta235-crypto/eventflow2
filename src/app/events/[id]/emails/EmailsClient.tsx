"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail, Plus, Send, Pencil, Trash2, Loader2, Bell, Users, ChevronLeft,
} from "lucide-react";
import Link from "next/link";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
};

type Props = {
  eventId: string;
  eventTitle: string;
  templates: Template[];
  statusCounts: Record<string, number>;
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confermati",
  PENDING: "In attesa",
  WAITLIST: "Lista d'attesa",
  CANCELLED: "Annullati",
};
const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  WAITLIST: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PLACEHOLDERS = ["{{firstName}}", "{{lastName}}", "{{eventTitle}}"];

export function EmailsClient({ eventId, eventTitle, templates: initialTemplates, statusCounts }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);

  // Send dialog
  const [sendOpen, setSendOpen] = useState(false);
  const [sendMode, setSendMode] = useState<"reminder" | "custom" | "template">("reminder");
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendFilter, setSendFilter] = useState<string[]>(["CONFIRMED", "PENDING"]);
  const [sending, setSending] = useState(false);

  // Template editor
  const [editOpen, setEditOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Partial<Template>>({});
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  const totalRecipients = sendFilter.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0);

  async function sendEmails() {
    setSending(true);
    try {
      const body: Record<string, unknown> = { statusFilter: sendFilter };
      if (sendMode === "reminder") {
        body.type = "reminder";
      } else if (sendMode === "template") {
        body.templateId = sendTemplateId;
      } else {
        body.type = "custom";
        body.subject = sendSubject;
        body.body = sendBody;
      }

      const res = await fetch(`/api/events/${eventId}/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Errore", { variant: "error" }); return; }
      toast(`${data.sent} email inviate`, { variant: "success" });
      setSendOpen(false);
    } finally {
      setSending(false);
    }
  }

  async function saveTemplate() {
    if (!editTemplate.name || !editTemplate.subject || !editTemplate.body) {
      toast("Tutti i campi sono obbligatori", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const isNew = !editTemplate.id;
      const url = isNew
        ? `/api/events/${eventId}/emails`
        : `/api/events/${eventId}/emails/${editTemplate.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTemplate),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Errore", { variant: "error" }); return; }
      if (isNew) setTemplates((t) => [data, ...t]);
      else setTemplates((t) => t.map((tmpl) => (tmpl.id === data.id ? data : tmpl)));
      toast(isNew ? "Template creato" : "Template aggiornato", { variant: "success" });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(tmpl: Template) {
    const res = await fetch(`/api/events/${eventId}/emails/${tmpl.id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((t) => t.filter((x) => x.id !== tmpl.id));
      toast("Template eliminato", { variant: "success" });
      setDeleteTarget(null);
    } else {
      toast("Errore eliminazione", { variant: "error" });
    }
  }

  function toggleStatusFilter(s: string) {
    setSendFilter((f) => f.includes(s) ? f.filter((x) => x !== s) : [...f, s]);
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Comunicazioni email
          </h1>
          <p className="text-sm text-gray-500">{eventTitle}</p>
        </div>
        <Button onClick={() => setSendOpen(true)} className="gap-2">
          <Send className="h-4 w-4" />
          Invia email
        </Button>
      </div>

      {/* Audience overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <p className={`text-xs font-medium mt-1 inline-flex px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[status] ?? status}
            </p>
          </div>
        ))}
      </div>

      {/* Quick send buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invio rapido</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setSendMode("reminder"); setSendFilter(["CONFIRMED", "PENDING"]); setSendOpen(true); }}
          >
            <Bell className="h-4 w-4 text-purple-500" />
            Invia promemoria
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setSendMode("custom"); setSendSubject(""); setSendBody(""); setSendFilter(["CONFIRMED", "PENDING"]); setSendOpen(true); }}
          >
            <Mail className="h-4 w-4 text-blue-500" />
            Messaggio personalizzato
          </Button>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Template salvati</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8"
              onClick={() => { setEditTemplate({ type: "CUSTOM" }); setEditOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Nuovo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nessun template. Crea il primo per riutilizzarlo.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{tmpl.name}</p>
                    <p className="text-xs text-gray-500 truncate">Oggetto: {tmpl.subject}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{tmpl.body.slice(0, 80)}…</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setSendMode("template"); setSendTemplateId(tmpl.id); setSendFilter(["CONFIRMED", "PENDING"]); setSendOpen(true); }}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Invia"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditTemplate(tmpl); setEditOpen(true); }}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Modifica"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tmpl)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SEND DIALOG ── */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              Invia email
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Audience filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destinatari</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_LABELS).map(([s, label]) => (
                  <button
                    key={s}
                    onClick={() => toggleStatusFilter(s)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      sendFilter.includes(s)
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    {label} ({statusCounts[s] ?? 0})
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{totalRecipients} destinatari selezionati</p>
            </div>

            {/* Mode selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo email</label>
              <div className="flex gap-2">
                {[
                  { value: "reminder", label: "Promemoria" },
                  { value: "template", label: "Da template" },
                  { value: "custom", label: "Personalizzata" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSendMode(value as typeof sendMode)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      sendMode === value
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {sendMode === "template" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Seleziona template</label>
                <select
                  value={sendTemplateId}
                  onChange={(e) => setSendTemplateId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Scegli un template...</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            {sendMode === "custom" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Oggetto</label>
                  <Input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} placeholder="Oggetto dell'email" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">Messaggio</label>
                    <div className="flex gap-1">
                      {PLACEHOLDERS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSendBody((b) => b + p)}
                          className="text-[10px] font-mono bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 px-1.5 py-0.5 rounded transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={sendBody}
                    onChange={(e) => setSendBody(e.target.value)}
                    placeholder="Scrivi il tuo messaggio..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </>
            )}

            {sendMode === "reminder" && (
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700">
                Verrà inviato il promemoria standard con le informazioni dell&apos;evento e il codice di registrazione.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Annulla</Button>
            <Button
              onClick={sendEmails}
              disabled={sending || totalRecipients === 0}
              className="gap-2"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Invia a {totalRecipients} partecipanti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TEMPLATE EDITOR ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTemplate.id ? "Modifica template" : "Nuovo template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome template</label>
              <Input
                value={editTemplate.name ?? ""}
                onChange={(e) => setEditTemplate((t) => ({ ...t, name: e.target.value }))}
                placeholder="es. Benvenuto iscritti"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Oggetto</label>
              <Input
                value={editTemplate.subject ?? ""}
                onChange={(e) => setEditTemplate((t) => ({ ...t, subject: e.target.value }))}
                placeholder="{{firstName}}, ti aspettiamo a {{eventTitle}}"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Corpo</label>
                <div className="flex gap-1">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditTemplate((t) => ({ ...t, body: (t.body ?? "") + p }))}
                      className="text-[10px] font-mono bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 px-1.5 py-0.5 rounded transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={8}
                value={editTemplate.body ?? ""}
                onChange={(e) => setEditTemplate((t) => ({ ...t, body: e.target.value }))}
                placeholder="Caro {{firstName}}, ti ricordiamo..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annulla</Button>
            <Button onClick={saveTemplate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salva template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Sei sicuro di voler eliminare il template <strong>{deleteTarget?.name}</strong>? L&apos;azione è irreversibile.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annulla</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteTemplate(deleteTarget)}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
