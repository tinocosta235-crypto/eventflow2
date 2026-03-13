"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2,
  Eye, EyeOff, GripVertical, Type, List, CheckSquare, Calendar, Hash,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";

type FieldType = "text" | "email" | "phone" | "select" | "checkbox" | "date" | "number" | "textarea";

interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder?: string | null;
  required: boolean;
  options?: string | null;
  order: number;
}

interface Props {
  eventId: string;
  initialFields: FormField[];
  slug: string;
}

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "Testo breve", icon: Type },
  { value: "textarea", label: "Testo lungo", icon: Type },
  { value: "email", label: "Email", icon: Type },
  { value: "phone", label: "Telefono", icon: Type },
  { value: "number", label: "Numero", icon: Hash },
  { value: "select", label: "Menu a tendina", icon: List },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "date", label: "Data", icon: Calendar },
];

const STANDARD_FIELDS = [
  { label: "Nome", type: "text", required: true, note: "Incluso di default" },
  { label: "Cognome", type: "text", required: true, note: "Incluso di default" },
  { label: "Email", type: "email", required: true, note: "Incluso di default" },
  { label: "Telefono", type: "phone", required: false, note: "Incluso di default" },
  { label: "Azienda", type: "text", required: false, note: "Incluso di default" },
  { label: "Ruolo", type: "text", required: false, note: "Incluso di default" },
];

export function FormBuilder({ eventId, initialFields, slug }: Props) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [showPreview, setShowPreview] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newField, setNewField] = useState<{
    label: string; type: FieldType; placeholder: string; required: boolean; options: string;
  }>({ label: "", type: "text", placeholder: "", required: false, options: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addField() {
    if (!newField.label.trim()) {
      toast("Inserisci un'etichetta per il campo", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newField.label,
          type: newField.type,
          placeholder: newField.placeholder || null,
          required: newField.required,
          options: newField.options
            ? newField.options.split("\n").map((o) => o.trim()).filter(Boolean)
            : null,
        }),
      });
      if (!res.ok) throw new Error();
      const field = await res.json();
      setFields((f) => [...f, field]);
      setNewField({ label: "", type: "text", placeholder: "", required: false, options: "" });
      setAdding(false);
      toast("Campo aggiunto", { variant: "success" });
    } catch {
      toast("Errore nell'aggiunta del campo", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteField(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${eventId}/form/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFields((f) => f.filter((field) => field.id !== id));
      toast("Campo eliminato", { variant: "success" });
    } catch {
      toast("Errore nell'eliminazione", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  async function moveField(id: string, dir: "up" | "down") {
    const idx = fields.findIndex((f) => f.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === fields.length - 1)) return;
    const newFields = [...fields];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];
    const reordered = newFields.map((f, i) => ({ ...f, order: i }));
    setFields(reordered);

    // Persist order
    await fetch(`/api/events/${eventId}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: reordered.map((f) => ({ id: f.id, order: f.order })) }),
    });
  }

  async function toggleRequired(field: FormField) {
    const updated = { ...field, required: !field.required };
    setFields((f) => f.map((ff) => (ff.id === field.id ? updated : ff)));
    await fetch(`/api/events/${eventId}/form/${field.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ required: !field.required }),
    });
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-2">
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPreview ? "Nascondi preview" : "Preview form"}
        </Button>
        <span className="text-sm text-gray-400">
          {fields.length} campi custom + 6 campi standard
        </span>
      </div>

      <div className={`grid gap-6 ${showPreview ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* Builder */}
        <div className="space-y-4">
          {/* Standard fields (read-only) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-500">Campi standard (sempre inclusi)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STANDARD_FIELDS.map((f) => (
                <div key={f.label} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-300" />
                    <span className="text-sm font-medium text-gray-700">{f.label}</span>
                    <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {f.required && <Badge className="bg-blue-100 text-blue-700 text-xs">Obbligatorio</Badge>}
                    <Badge variant="outline" className="text-xs text-gray-400">Standard</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom fields */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Campi personalizzati</CardTitle>
              <Button size="sm" onClick={() => setAdding(!adding)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />Aggiungi campo
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {fields.length === 0 && !adding && (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nessun campo personalizzato ancora.<br />
                  <span className="text-xs">Aggiungi campi per raccogliere informazioni aggiuntive.</span>
                </p>
              )}

              {fields.map((field, idx) => {
                const TypeIcon = FIELD_TYPES.find((t) => t.value === field.type)?.icon ?? Type;
                return (
                  <div key={field.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
                    <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    <TypeIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{field.label}</p>
                      <p className="text-xs text-gray-400">{FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleRequired(field)}
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${field.required ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                      >
                        {field.required ? "Obbligatorio" : "Opzionale"}
                      </button>
                      <button onClick={() => moveField(field.id, "up")} disabled={idx === 0} className="h-7 w-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveField(field.id, "down")} disabled={idx === fields.length - 1} className="h-7 w-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteField(field.id)}
                        disabled={deletingId === field.id}
                        className="h-7 w-7 rounded border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        {deletingId === field.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add field form */}
              {adding && (
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/30 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Nuovo campo</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Etichetta *</label>
                      <Input
                        value={newField.label}
                        onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))}
                        placeholder="Es. Dieta alimentare"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                      <select
                        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newField.type}
                        onChange={(e) => setNewField((f) => ({ ...f, type: e.target.value as FieldType }))}
                      >
                        {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                    <Input
                      value={newField.placeholder}
                      onChange={(e) => setNewField((f) => ({ ...f, placeholder: e.target.value }))}
                      placeholder="Testo di esempio nel campo"
                    />
                  </div>
                  {(newField.type === "select") && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Opzioni (una per riga)</label>
                      <textarea
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={newField.options}
                        onChange={(e) => setNewField((f) => ({ ...f, options: e.target.value }))}
                        placeholder={"Opzione 1\nOpzione 2\nOpzione 3"}
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField((f) => ({ ...f, required: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Campo obbligatorio</span>
                  </label>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={addField} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Salva campo
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Annulla</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="sticky top-20">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  Preview form di registrazione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {STANDARD_FIELDS.map((f) => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center">
                      <span className="text-sm text-gray-400">{f.type === "email" ? "email@esempio.it" : `${f.label.toLowerCase()}...`}</span>
                    </div>
                  </div>
                ))}
                {fields.map((field) => {
                  const opts = field.options ? JSON.parse(field.options) as string[] : [];
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === "select" ? (
                        <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center justify-between">
                          <span className="text-sm text-gray-400">{opts[0] ?? "Seleziona..."}</span>
                          <span className="text-gray-400">▾</span>
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded border border-gray-300 bg-gray-50" />
                          <span className="text-sm text-gray-400">{field.placeholder ?? field.label}</span>
                        </div>
                      ) : field.type === "textarea" ? (
                        <div className="h-20 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <span className="text-sm text-gray-400">{field.placeholder ?? `${field.label.toLowerCase()}...`}</span>
                        </div>
                      ) : (
                        <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center">
                          <span className="text-sm text-gray-400">{field.placeholder ?? `${field.label.toLowerCase()}...`}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="w-full h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Registrati
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
