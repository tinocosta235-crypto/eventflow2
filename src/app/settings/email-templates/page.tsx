"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { EmailCanvasBuilder } from "@/components/email-builder/EmailCanvasBuilder";
import {
  parseBuilderPayload,
  serializeBuilderPayload,
  createDefaultBuilderPayload,
  type EmailBuilderPayload,
} from "@/lib/email-builder";
import { Loader2, Save, Trash2, FileText, LayoutTemplate } from "lucide-react";

type TemplateType = "HEADER" | "FOOTER";

function TemplateEditor({ type, label, description, icon: Icon }: { type: TemplateType; label: string; description: string; icon: React.ElementType }) {
  const [builder, setBuilder] = useState<EmailBuilderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasTemplate, setHasTemplate] = useState(false);

  useEffect(() => {
    fetch(`/api/org/email-template?type=${type}`)
      .then(r => r.json())
      .then(d => {
        if (d.payload) {
          const parsed = parseBuilderPayload(d.payload);
          if (parsed) { setBuilder(parsed); setHasTemplate(true); }
          else startEmpty();
        } else {
          startEmpty();
        }
        setLoading(false);
      })
      .catch(() => { startEmpty(); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function startEmpty() {
    const base = createDefaultBuilderPayload("Template");
    setBuilder({ ...base, blocks: [] });
    setHasTemplate(false);
  }

  async function save() {
    if (!builder) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/org/email-template?type=${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: serializeBuilderPayload(builder) }),
      });
      if (res.ok) {
        toast(`${label} salvato`, { variant: "success" });
        setHasTemplate(true);
      } else {
        toast("Errore salvataggio", { variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await fetch(`/api/org/email-template?type=${type}`, { method: "DELETE" });
      startEmpty();
      toast(`${label} rimosso`, { variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--depth-1)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: "var(--border-dim)" }}
      >
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(112,96,204,0.10)", color: "var(--accent)" }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</h3>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{description}</p>
        </div>
        {hasTemplate && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(29,158,117,0.10)", color: "#1D9E75" }}
          >
            Attivo
          </span>
        )}
        <div className="flex gap-2">
          {hasTemplate && (
            <Button variant="ghost" size="sm" onClick={remove} disabled={saving} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Rimuovi
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving || !builder}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Salva {label}
          </Button>
        </div>
      </div>

      {/* Builder */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : builder ? (
          <EmailCanvasBuilder
            builder={builder}
            setBuilder={setBuilder as React.Dispatch<React.SetStateAction<EmailBuilderPayload>>}
            eventTitle="Anteprima"
          />
        ) : null}
      </div>

      {/* Info banner */}
      <div
        className="mx-4 mb-4 rounded-xl border px-4 py-2.5 text-xs"
        style={{ background: "rgba(112,96,204,0.06)", borderColor: "rgba(112,96,204,0.16)", color: "var(--text-secondary)" }}
      >
        Il {label.toLowerCase()} viene automaticamente aggiunto a tutte le email dell&apos;organizzazione al momento dell&apos;invio.
        Puoi sovrascriverlo per singola email nel builder.
      </div>
    </div>
  );
}

export default function EmailTemplatesPage() {
  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Template email organizzazione
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Definisci header e footer globali che verranno inclusi in tutte le email dei tuoi eventi.
        </p>
      </div>

      <TemplateEditor
        type="HEADER"
        label="Header"
        description="Blocchi mostrati in cima a ogni email (logo, immagine di apertura)"
        icon={LayoutTemplate}
      />

      <TemplateEditor
        type="FOOTER"
        label="Footer"
        description="Blocchi mostrati in fondo a ogni email (social, recapiti, unsubscribe)"
        icon={FileText}
      />
    </div>
  );
}
