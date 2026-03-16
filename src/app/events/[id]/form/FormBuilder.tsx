"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type Active,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import {
  GripVertical, Trash2, Settings2, Plus, Eye, Loader2, Save, Check,
  Type, AlignLeft, Mail, Phone, Hash, Calendar, Clock, Link,
  ChevronDown, Circle, CheckSquare, Star, Sliders, ToggleLeft,
  Info, Minus, FileText, Globe, MapPin, X, Palette, AlertTriangle,
  ImageIcon, Upload, LayoutTemplate,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType =
  | "text" | "textarea" | "email" | "phone" | "number" | "date" | "time" | "url"
  | "select" | "radio" | "checkbox" | "rating" | "scale" | "toggle"
  | "section" | "divider" | "page_break" | "statement" | "country" | "address";

type ConditionOperator =
  | "equals" | "not_equals" | "contains" | "not_contains"
  | "is_empty" | "is_not_empty" | "greater_than" | "less_than";

type ConditionRule = { fieldId: string; operator: ConditionOperator; value: string };

type FieldConditions = {
  visibility?: { mode: "ALL" | "GROUPS"; groupIds: string[] };
  showIf?: { logic: "AND" | "OR"; rules: ConditionRule[] };
};

type FormTheme = {
  primaryColor: string;
  bgColor: string;
  radius: "none" | "sm" | "md" | "lg";
  font: "inter" | "system" | "serif" | "mono";
  button: "filled" | "outline";
  // Header / above-the-fold
  formTitle?: string;
  formSubtitle?: string;
  coverImage?: string;
  coverHeight?: "sm" | "md" | "lg";
};

interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder?: string | null;
  required: boolean;
  options?: string | null;
  conditions?: string | null;
  order: number;
}

interface EventGroup { id: string; name: string }
type SessionItem = { id: string; title: string; capacity: number | null; waitlistEnabled: boolean; groupId: string | null };
type SessionsConfig = { enabled: boolean; sessions: SessionItem[] };
type RegistrationConfig = { mode: "PUBLIC" | "INVITE_ONLY"; invitedEmails: string[] };

interface Props {
  eventId: string;
  initialFields: FormField[];
}

// ─── Field type catalog ───────────────────────────────────────────────────────

const STANDARD_FIELDS = [
  { label: "Nome", type: "text", required: true },
  { label: "Cognome", type: "text", required: true },
  { label: "Email", type: "email", required: true },
  { label: "Telefono", type: "phone", required: false },
  { label: "Azienda", type: "text", required: false },
  { label: "Ruolo", type: "text", required: false },
];

const FIELD_CATEGORIES: {
  name: string;
  items: { type: FieldType; label: string; icon: React.ElementType; color: string; bg: string }[];
}[] = [
  {
    name: "Testo",
    items: [
      { type: "text",     label: "Testo breve",    icon: Type,        color: "text-blue-600",   bg: "bg-blue-50" },
      { type: "textarea", label: "Testo lungo",    icon: AlignLeft,   color: "text-blue-600",   bg: "bg-blue-50" },
      { type: "email",    label: "Email",           icon: Mail,        color: "text-blue-600",   bg: "bg-blue-50" },
      { type: "phone",    label: "Telefono",        icon: Phone,       color: "text-blue-600",   bg: "bg-blue-50" },
      { type: "number",   label: "Numero",          icon: Hash,        color: "text-blue-600",   bg: "bg-blue-50" },
      { type: "date",     label: "Data",            icon: Calendar,    color: "text-blue-600",   bg: "bg-blue-50" },
      { type: "time",     label: "Ora",             icon: Clock,       color: "text-blue-600",   bg: "bg-blue-50" },
      { type: "url",      label: "Sito web",        icon: Link,        color: "text-blue-600",   bg: "bg-blue-50" },
    ],
  },
  {
    name: "Scelta",
    items: [
      { type: "select",   label: "Menu a tendina", icon: ChevronDown, color: "text-violet-600", bg: "bg-violet-50" },
      { type: "radio",    label: "Scelta singola", icon: Circle,      color: "text-violet-600", bg: "bg-violet-50" },
      { type: "checkbox", label: "Scelta multipla",icon: CheckSquare, color: "text-violet-600", bg: "bg-violet-50" },
      { type: "rating",   label: "Stelle",         icon: Star,        color: "text-violet-600", bg: "bg-violet-50" },
      { type: "scale",    label: "Scala 1–10",     icon: Sliders,     color: "text-violet-600", bg: "bg-violet-50" },
      { type: "toggle",   label: "Sì / No",        icon: ToggleLeft,  color: "text-violet-600", bg: "bg-violet-50" },
    ],
  },
  {
    name: "Layout",
    items: [
      { type: "section",    label: "Titolo sezione",   icon: Type,     color: "text-gray-500", bg: "bg-gray-100" },
      { type: "statement",  label: "Testo informativo",icon: Info,     color: "text-gray-500", bg: "bg-gray-100" },
      { type: "divider",    label: "Separatore",       icon: Minus,    color: "text-gray-500", bg: "bg-gray-100" },
      { type: "page_break", label: "Nuova pagina",     icon: FileText, color: "text-gray-500", bg: "bg-gray-100" },
    ],
  },
  {
    name: "Avanzato",
    items: [
      { type: "country", label: "Paese",     icon: Globe,  color: "text-emerald-600", bg: "bg-emerald-50" },
      { type: "address", label: "Indirizzo", icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50" },
    ],
  },
];

const ALL_TYPES = FIELD_CATEGORIES.flatMap(c => c.items);
function getTypeInfo(type: string) {
  return ALL_TYPES.find(t => t.type === type) ?? { type, label: type, icon: Type, color: "text-gray-500", bg: "bg-gray-100" };
}

const HAS_OPTIONS = new Set(["select", "radio", "checkbox"]);
const LAYOUT_TYPES = new Set(["section", "divider", "page_break", "statement"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseConditions(raw: string | null | undefined): FieldConditions {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const out: FieldConditions = {};
    if (p.visibility) out.visibility = p.visibility as FieldConditions["visibility"];
    if (p.showIf && typeof p.showIf === "object") {
      const s = p.showIf as Record<string, unknown>;
      if ("rules" in s) {
        out.showIf = s as FieldConditions["showIf"];
      } else if ("fieldId" in s) {
        // migrate old single-rule format
        out.showIf = {
          logic: "AND",
          rules: [{ fieldId: s.fieldId as string, operator: (s.operator ?? "equals") as ConditionOperator, value: (s.value ?? "") as string }],
        };
      }
    }
    return out;
  } catch { return {}; }
}

function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

// ─── PaletteItem ──────────────────────────────────────────────────────────────

function PaletteItem({
  type, label, icon: Icon, color, bg, onAdd,
}: { type: string; label: string; icon: React.ElementType; color: string; bg: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: "palette", fieldType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onAdd(); }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all select-none group ${isDragging ? "opacity-30" : ""}`}
    >
      <div className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">{label}</span>
    </div>
  );
}

// ─── SortableFieldCard ────────────────────────────────────────────────────────

function SortableFieldCard({
  field, isSelected, onSelect, onDelete, onToggleRequired, deleting,
}: {
  field: FormField; isSelected: boolean; onSelect: () => void;
  onDelete: () => void; onToggleRequired: () => void; deleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id, data: { type: "field" },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const ti = getTypeInfo(field.type);
  const Icon = ti.icon;
  const conds = parseConditions(field.conditions);
  const hasRules = (conds.showIf?.rules?.length ?? 0) > 0;
  const isGrouped = conds.visibility?.mode === "GROUPS";
  const isLayout = LAYOUT_TYPES.has(field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`rounded-xl border transition-all cursor-pointer ${isDragging ? "opacity-40 shadow-xl z-50" : ""} ${
        isSelected
          ? "border-blue-400 bg-blue-50/40 shadow-sm ring-1 ring-blue-200"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      } ${isLayout ? "border-dashed" : ""}`}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          {...listeners}
          {...attributes}
          onClick={e => e.stopPropagation()}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ti.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${ti.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isLayout ? "text-gray-400 italic" : "text-gray-900"}`}>
            {field.label || <span className="text-gray-300">Senza etichetta</span>}
          </p>
          <p className="text-xs text-gray-400">{ti.label}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasRules && (
            <span className="h-5 w-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center" title="Logica condizionale attiva">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            </span>
          )}
          {isGrouped && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Gruppi</span>
          )}
          {!isLayout && (
            <button
              onClick={e => { e.stopPropagation(); onToggleRequired(); }}
              className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                field.required
                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {field.required ? "Obbligatorio" : "Opzionale"}
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-gray-300 transition-colors"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CanvasDropZone ───────────────────────────────────────────────────────────

// ─── HeaderBlock ──────────────────────────────────────────────────────────────

function HeaderBlock({ theme, isSelected, onClick }: { theme: FormTheme; isSelected: boolean; onClick: () => void }) {
  const hasImage = !!theme.coverImage;
  const heightClass = { sm: "h-24", md: "h-36", lg: "h-52" }[theme.coverHeight ?? "md"];

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all mb-4 ${
        isSelected ? "border-blue-400 ring-2 ring-blue-200 shadow-sm" : "border-dashed border-gray-200 hover:border-gray-300"
      }`}
    >
      {hasImage ? (
        <div className={`relative ${heightClass} w-full`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.coverImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-4">
            <p className="text-white font-bold text-base drop-shadow">{theme.formTitle || "Titolo evento"}</p>
            {theme.formSubtitle && <p className="text-white/80 text-xs mt-1 drop-shadow">{theme.formSubtitle}</p>}
          </div>
          <div className="absolute top-2 right-2">
            <span className="bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">Copertina</span>
          </div>
        </div>
      ) : (
        <div className={`${heightClass} bg-gradient-to-br from-gray-100 to-gray-50 flex flex-col items-center justify-center gap-2`}>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">{theme.formTitle || "Intestazione form"}</span>
          </div>
          {theme.formSubtitle && <p className="text-xs text-gray-400">{theme.formSubtitle}</p>}
          {!theme.formTitle && !theme.coverImage && (
            <p className="text-xs text-gray-400">Clicca per aggiungere titolo e immagine</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HeaderProperties ─────────────────────────────────────────────────────────

function HeaderProperties({ theme, onChange }: { theme: FormTheme; onChange: (t: FormTheme) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast("Immagine troppo grande (max 3 MB)", { variant: "error" });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange({ ...theme, coverImage: ev.target?.result as string });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
          <LayoutTemplate className="h-3.5 w-3.5 text-indigo-600" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Intestazione form</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Cover image */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Immagine copertina</p>

          {theme.coverImage ? (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={theme.coverImage} alt="" className="w-full h-32 object-cover" />
                <button
                  onClick={() => onChange({ ...theme, coverImage: undefined })}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-8 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="h-3 w-3" /> Cambia immagine
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : (
                <>
                  <div className="h-8 w-8 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <ImageIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors font-medium">Carica immagine</span>
                  <span className="text-[10px] text-gray-400">PNG, JPG, WebP · max 3 MB</span>
                </>
              )}
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Cover height */}
        {theme.coverImage && (
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Altezza copertina</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([["sm", "Bassa", "h-4"], ["md", "Media", "h-6"], ["lg", "Alta", "h-9"]] as const).map(([v, l, hh]) => (
                <button
                  key={v}
                  onClick={() => onChange({ ...theme, coverHeight: v })}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    (theme.coverHeight ?? "md") === v ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className={`w-8 ${hh} bg-current rounded opacity-20`} />
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title & subtitle */}
        <div className="space-y-3 border-t border-gray-50 pt-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Testo intestazione</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Titolo</label>
            <Input
              value={theme.formTitle ?? ""}
              onChange={e => onChange({ ...theme, formTitle: e.target.value || undefined })}
              placeholder="Es. Registrati all'evento"
              className="text-sm h-8"
            />
            <p className="text-[10px] text-gray-400 mt-1">Lascia vuoto per usare il nome dell&apos;evento</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sottotitolo</label>
            <textarea
              value={theme.formSubtitle ?? ""}
              onChange={e => onChange({ ...theme, formSubtitle: e.target.value || undefined })}
              placeholder="Es. Compila il form per assicurarti il tuo posto"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(139,128,255,0.45)] resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CanvasDropZone ───────────────────────────────────────────────────────────

function CanvasDropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: "canvas" });

  return (
    <div ref={setNodeRef} className="min-h-28">
      {isEmpty ? (
        <div className={`h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
          isOver ? "border-blue-400 bg-blue-50/40" : "border-gray-200 bg-gray-50/60"
        }`}>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isOver ? "bg-blue-100" : "bg-gray-100"}`}>
            <Plus className={`h-4 w-4 ${isOver ? "text-blue-500" : "text-gray-400"}`} />
          </div>
          <p className="text-sm text-gray-400">Trascina un campo qui o clicca nel pannello sinistro</p>
        </div>
      ) : (
        <div className={`space-y-1.5 rounded-xl transition-colors ${isOver ? "outline outline-2 outline-blue-300 outline-offset-4" : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── FieldProperties ──────────────────────────────────────────────────────────

function FieldProperties({
  field, fields, groups, onPatch,
}: {
  field: FormField; fields: FormField[]; groups: EventGroup[];
  onPatch: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [label, setLabel] = useState(field.label);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? "");
  const [optionsText, setOptionsText] = useState(parseOptions(field.options).join("\n"));
  const [saving, setSaving] = useState(false);
  const prevId = useRef(field.id);

  if (prevId.current !== field.id) {
    prevId.current = field.id;
    setLabel(field.label);
    setPlaceholder(field.placeholder ?? "");
    setOptionsText(parseOptions(field.options).join("\n"));
  }

  const conds = parseConditions(field.conditions);
  const vis = conds.visibility ?? { mode: "ALL", groupIds: [] };
  const showIf = conds.showIf ?? { logic: "AND" as const, rules: [] };
  const ti = getTypeInfo(field.type);
  const Icon = ti.icon;
  const isLayout = LAYOUT_TYPES.has(field.type);
  const hasOpts = HAS_OPTIONS.has(field.type);

  async function save() {
    setSaving(true);
    try {
      await onPatch(field.id, {
        label,
        placeholder: placeholder || null,
        options: hasOpts ? optionsText.split("\n").map(o => o.trim()).filter(Boolean) : undefined,
      });
      toast("Campo aggiornato", { variant: "success" });
    } catch {
      toast("Errore nel salvataggio", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function updateConds(updater: (prev: FieldConditions) => FieldConditions) {
    try {
      await onPatch(field.id, { conditions: updater(conds) });
    } catch {
      toast("Errore nel salvataggio regole", { variant: "error" });
    }
  }

  async function addRule() {
    const other = fields.filter(f => f.id !== field.id && !LAYOUT_TYPES.has(f.type));
    if (!other.length) { toast("Nessun campo disponibile per la condizione", { variant: "error" }); return; }
    await updateConds(prev => ({
      ...prev,
      showIf: {
        logic: prev.showIf?.logic ?? "AND",
        rules: [...(prev.showIf?.rules ?? []), { fieldId: other[0].id, operator: "equals" as const, value: "" }],
      },
    }));
  }

  async function removeRule(idx: number) {
    await updateConds(prev => ({
      ...prev,
      showIf: { logic: prev.showIf?.logic ?? "AND", rules: (prev.showIf?.rules ?? []).filter((_, i) => i !== idx) },
    }));
  }

  async function updateRule(idx: number, patch: Partial<ConditionRule>) {
    await updateConds(prev => ({
      ...prev,
      showIf: {
        logic: prev.showIf?.logic ?? "AND",
        rules: (prev.showIf?.rules ?? []).map((r, i) => i === idx ? { ...r, ...patch } : r),
      },
    }));
  }

  const otherFields = fields.filter(f => f.id !== field.id && !LAYOUT_TYPES.has(f.type));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${ti.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${ti.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{ti.label}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Basic ── */}
        <div className="p-4 space-y-3 border-b border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impostazioni</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Etichetta</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} className="text-sm h-8" placeholder="Nome del campo" />
          </div>

          {!isLayout && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
              <Input value={placeholder} onChange={e => setPlaceholder(e.target.value)} className="text-sm h-8" placeholder="Es. Scrivi qui..." />
            </div>
          )}

          {hasOpts && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Opzioni <span className="text-gray-400 font-normal">(una per riga)</span>
              </label>
              <textarea
                value={optionsText}
                onChange={e => setOptionsText(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(139,128,255,0.45)] resize-none"
                placeholder={"Opzione 1\nOpzione 2\nOpzione 3"}
              />
            </div>
          )}

          {field.type === "rating" && (
            <p className="text-xs text-gray-400 italic">Mostra 1–5 stelle. Personalizzazione avanzata disponibile prossimamente.</p>
          )}
          {field.type === "scale" && (
            <p className="text-xs text-gray-400 italic">Scala da 1 a 10. Personalizzazione avanzata disponibile prossimamente.</p>
          )}

          <Button size="sm" onClick={save} disabled={saving} className="gap-1.5 w-full h-8 text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Applica modifiche
          </Button>
        </div>

        {/* ── Group Visibility ── */}
        {groups.length > 0 && (
          <div className="p-4 space-y-2.5 border-b border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visibilità per gruppo</p>
            <select
              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[rgba(139,128,255,0.45)]"
              value={vis.mode}
              onChange={async e =>
                updateConds(prev => ({ ...prev, visibility: { mode: e.target.value as "ALL" | "GROUPS", groupIds: prev.visibility?.groupIds ?? [] } }))
              }
            >
              <option value="ALL">Tutti i gruppi</option>
              <option value="GROUPS">Solo gruppi specifici</option>
            </select>
            {vis.mode === "GROUPS" && (
              <div className="space-y-1.5">
                {groups.map(g => {
                  const checked = vis.groupIds.includes(g.id);
                  return (
                    <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={async e =>
                          updateConds(prev => {
                            const cur = prev.visibility?.groupIds ?? [];
                            return { ...prev, visibility: { mode: "GROUPS", groupIds: e.target.checked ? [...cur, g.id] : cur.filter(id => id !== g.id) } };
                          })
                        }
                        className="h-3.5 w-3.5 rounded accent-blue-600"
                      />
                      <span className="text-gray-700">{g.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Conditional Logic ── */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logica condizionale</p>
            <button onClick={addRule} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5">
              <Plus className="h-3 w-3" /> Regola
            </button>
          </div>

          {showIf.rules.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nessuna regola — campo sempre visibile</p>
          ) : (
            <div className="space-y-2">
              {showIf.rules.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Mostra se</span>
                  <select
                    className="h-7 rounded-lg border border-gray-200 bg-white px-2 text-xs"
                    value={showIf.logic}
                    onChange={async e =>
                      updateConds(prev => ({ ...prev, showIf: { ...prev.showIf!, logic: e.target.value as "AND" | "OR" } }))
                    }
                  >
                    <option value="AND">tutte vere (AND)</option>
                    <option value="OR">almeno una vera (OR)</option>
                  </select>
                </div>
              )}

              {showIf.rules.map((rule, idx) => (
                <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    {showIf.rules.length === 1 && <span className="text-xs text-gray-500">Mostra se</span>}
                    {showIf.rules.length > 1 && <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>}
                    <button onClick={() => removeRule(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <select
                    className="h-7 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
                    value={rule.fieldId}
                    onChange={e => updateRule(idx, { fieldId: e.target.value })}
                  >
                    <option value="">Campo...</option>
                    {otherFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>

                  <select
                    className="h-7 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
                    value={rule.operator}
                    onChange={e => updateRule(idx, { operator: e.target.value as ConditionOperator })}
                  >
                    <option value="equals">è uguale a</option>
                    <option value="not_equals">non è uguale a</option>
                    <option value="contains">contiene</option>
                    <option value="not_contains">non contiene</option>
                    <option value="is_empty">è vuoto</option>
                    <option value="is_not_empty">non è vuoto</option>
                    <option value="greater_than">è maggiore di</option>
                    <option value="less_than">è minore di</option>
                  </select>

                  {!["is_empty", "is_not_empty"].includes(rule.operator) && (
                    <Input
                      value={rule.value}
                      onChange={e => updateRule(idx, { value: e.target.value })}
                      placeholder="Valore..."
                      className="h-7 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ThemePanel ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899",
  "#14B8A6", "#6366F1", "#F97316", "#84CC16", "#0EA5E9", "#374151",
];

function ThemePanel({ theme, onChange, onClose }: { theme: FormTheme; onChange: (t: FormTheme) => void; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-10 z-50 w-68 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Personalizza tema</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-0.5 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Color */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Colore principale</label>
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => onChange({ ...theme, primaryColor: c })}
              className={`h-7 w-7 rounded-lg transition-transform hover:scale-110 ${theme.primaryColor === c ? "ring-2 ring-offset-1 ring-gray-900 scale-110" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg border border-gray-200 flex-shrink-0" style={{ backgroundColor: theme.primaryColor }} />
          <input
            type="text"
            value={theme.primaryColor}
            onChange={e => onChange({ ...theme, primaryColor: e.target.value })}
            className="flex-1 h-7 rounded-lg border border-gray-200 px-2 text-xs font-mono"
            placeholder="#3B82F6"
          />
        </div>
      </div>

      {/* Border radius */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Bordi</label>
        <div className="grid grid-cols-4 gap-1">
          {(["none", "sm", "md", "lg"] as const).map(r => {
            const radius = { none: "0px", sm: "4px", md: "8px", lg: "14px" }[r];
            return (
              <button
                key={r}
                onClick={() => onChange({ ...theme, radius: r })}
                className={`h-8 text-[11px] font-medium transition-colors ${theme.radius === r ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                style={{ borderRadius: radius }}
              >
                {r === "none" ? "Nessuno" : r === "sm" ? "Piccolo" : r === "md" ? "Medio" : "Grande"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Font</label>
        <div className="space-y-1">
          {([
            { v: "inter",  l: "Inter",     f: "Inter, sans-serif" },
            { v: "system", l: "System UI", f: "system-ui, sans-serif" },
            { v: "serif",  l: "Serif",     f: "Georgia, serif" },
            { v: "mono",   l: "Mono",      f: "monospace" },
          ] as const).map(({ v, l, f }) => (
            <button
              key={v}
              onClick={() => onChange({ ...theme, font: v })}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${theme.font === v ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-gray-50 text-gray-700"}`}
              style={{ fontFamily: f }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Button style */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Pulsante</label>
        <div className="flex gap-2">
          {(["filled", "outline"] as const).map(s => (
            <button
              key={s}
              onClick={() => onChange({ ...theme, button: s })}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all ${theme.button === s ? "ring-2 ring-offset-2 ring-blue-400" : ""}`}
              style={{
                backgroundColor: s === "filled" ? theme.primaryColor : "transparent",
                color: s === "filled" ? "white" : theme.primaryColor,
                border: `2px solid ${theme.primaryColor}`,
                borderRadius: theme.radius === "none" ? 0 : theme.radius === "sm" ? 4 : theme.radius === "md" ? 8 : 14,
              }}
            >
              {s === "filled" ? "Pieno" : "Outline"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FormPreview ──────────────────────────────────────────────────────────────

function FormPreview({ fields, theme, sessionConfig, onClose }: {
  fields: FormField[]; theme: FormTheme; sessionConfig: SessionsConfig; onClose: () => void;
}) {
  const br = { none: "0px", sm: "6px", md: "10px", lg: "16px" }[theme.radius];
  const fontMap = {
    inter: "Inter, sans-serif",
    system: "system-ui, -apple-system, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'Courier New', Courier, monospace",
  };
  const sorted = [...fields].sort((a, b) => a.order - b.order);

  function renderField(f: FormField) {
    if (f.type === "divider") return <hr key={f.id} className="border-gray-200 my-1" />;
    if (f.type === "section") return <h3 key={f.id} className="text-base font-bold text-gray-800 pt-3 pb-1">{f.label}</h3>;
    if (f.type === "statement") return <p key={f.id} className="text-sm text-gray-500">{f.label}</p>;
    if (f.type === "page_break") return (
      <div key={f.id} className="flex items-center gap-3 my-2">
        <div className="flex-1 border-t border-dashed border-gray-300" />
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Nuova pagina</span>
        <div className="flex-1 border-t border-dashed border-gray-300" />
      </div>
    );

    const opts = parseOptions(f.options);
    return (
      <div key={f.id}>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
          {f.label} {f.required && <span style={{ color: theme.primaryColor }}>*</span>}
        </label>
        {f.type === "textarea" ? (
          <div className="border border-gray-200 p-3 min-h-[72px] bg-gray-50" style={{ borderRadius: br }}>
            <span className="text-sm text-gray-300">{f.placeholder ?? "Scrivi qui..."}</span>
          </div>
        ) : f.type === "select" ? (
          <div className="h-10 border border-gray-200 px-3 flex items-center justify-between bg-gray-50" style={{ borderRadius: br }}>
            <span className="text-sm text-gray-400">{opts[0] ?? "Seleziona..."}</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        ) : f.type === "radio" ? (
          <div className="space-y-2">
            {(opts.length ? opts : ["Opzione 1", "Opzione 2"]).map((opt, i) => (
              <label key={i} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                {opt}
              </label>
            ))}
          </div>
        ) : f.type === "checkbox" ? (
          <div className="space-y-2">
            {(opts.length ? opts : ["Opzione 1", "Opzione 2"]).map((opt, i) => (
              <label key={i} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                <div className="h-4 w-4 rounded border-2 border-gray-300 flex-shrink-0" style={{ borderRadius: 4 }} />
                {opt}
              </label>
            ))}
          </div>
        ) : f.type === "rating" ? (
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-7 w-7 text-gray-200" />)}
          </div>
        ) : f.type === "scale" ? (
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 w-9 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500 bg-gray-50" style={{ borderRadius: 6 }}>
                {i + 1}
              </div>
            ))}
          </div>
        ) : f.type === "toggle" ? (
          <div className="flex gap-5">
            {["Sì", "No"].map(v => (
              <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                {v}
              </label>
            ))}
          </div>
        ) : f.type === "country" ? (
          <div className="h-10 border border-gray-200 px-3 flex items-center justify-between bg-gray-50" style={{ borderRadius: br }}>
            <div className="flex items-center gap-2 text-sm text-gray-400"><Globe className="h-4 w-4" /> Seleziona paese...</div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        ) : (
          <div className="h-10 border border-gray-200 px-3 flex items-center bg-gray-50" style={{ borderRadius: br }}>
            <span className="text-sm text-gray-400">{f.placeholder ?? `${f.label.toLowerCase()}...`}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0">
          <div>
            <span className="text-sm font-semibold text-gray-900">Anteprima form</span>
            <p className="text-xs text-gray-400">Come lo vedranno i partecipanti</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6" style={{ fontFamily: fontMap[theme.font] }}>
          <div className="space-y-4 max-w-md mx-auto">
            {STANDARD_FIELDS.map(f => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  {f.label} {f.required && <span style={{ color: theme.primaryColor }}>*</span>}
                </label>
                <div className="h-10 border border-gray-200 px-3 flex items-center bg-gray-50" style={{ borderRadius: br }}>
                  <span className="text-sm text-gray-400">{f.label.toLowerCase()}...</span>
                </div>
              </div>
            ))}

            {sorted.map(f => renderField(f))}

            {sessionConfig.enabled && sessionConfig.sessions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Sessioni</label>
                <div className="space-y-2">
                  {sessionConfig.sessions.map(s => (
                    <label key={s.id} className="flex items-center gap-3 border border-gray-200 p-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderRadius: br }}>
                      <div className="h-4 w-4 rounded border-2 border-gray-300 flex-shrink-0" />
                      <span className="flex-1">{s.title || "Sessione"}</span>
                      {s.capacity && <span className="text-xs text-gray-400">{s.capacity} posti</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              className="w-full h-11 font-semibold text-sm transition-all"
              style={{
                backgroundColor: theme.button === "filled" ? theme.primaryColor : "transparent",
                color: theme.button === "filled" ? "white" : theme.primaryColor,
                border: `2px solid ${theme.primaryColor}`,
                borderRadius: br,
              }}
            >
              Registrati →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PluginsPanel ─────────────────────────────────────────────────────────────

function PluginsPanel({
  regConfig, sessionConfig, onRegChange, onSessionChange, saving, onSave,
}: {
  regConfig: RegistrationConfig; sessionConfig: SessionsConfig;
  onRegChange: (c: RegistrationConfig) => void; onSessionChange: (c: SessionsConfig) => void;
  saving: boolean; onSave: () => void;
}) {
  return (
    <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
      <div className="grid gap-4 lg:grid-cols-2 max-w-3xl">
        {/* Registration mode */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accesso</p>
          <select
            className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm"
            value={regConfig.mode}
            onChange={e => onRegChange({ ...regConfig, mode: e.target.value as "PUBLIC" | "INVITE_ONLY" })}
          >
            <option value="PUBLIC">Pubblico</option>
            <option value="INVITE_ONLY">Solo su invito</option>
          </select>
          {regConfig.mode === "INVITE_ONLY" && (
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
              rows={4}
              placeholder={"mario@azienda.it\nanna@azienda.it"}
              value={regConfig.invitedEmails.join("\n")}
              onChange={e => onRegChange({ ...regConfig, invitedEmails: e.target.value.split("\n").map(v => v.trim()).filter(Boolean) })}
            />
          )}
        </div>

        {/* Sessions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sessioni</p>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={sessionConfig.enabled}
                onChange={e => onSessionChange({ ...sessionConfig, enabled: e.target.checked })}
                className="h-3.5 w-3.5 rounded accent-blue-600"
              />
              Attive
            </label>
          </div>
          {sessionConfig.enabled && (
            <div className="space-y-1.5">
              {sessionConfig.sessions.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2.5 py-1.5">
                  <Input
                    value={s.title}
                    onChange={e => onSessionChange({ ...sessionConfig, sessions: sessionConfig.sessions.map((item, i) => i === idx ? { ...item, title: e.target.value } : item) })}
                    placeholder="Titolo sessione"
                    className="h-6 text-xs flex-1 border-0 p-0 focus-visible:ring-0"
                  />
                  <Input
                    type="number"
                    value={s.capacity ?? ""}
                    onChange={e => onSessionChange({ ...sessionConfig, sessions: sessionConfig.sessions.map((item, i) => i === idx ? { ...item, capacity: e.target.value ? Number(e.target.value) : null } : item) })}
                    placeholder="Posti"
                    className="h-6 text-xs w-16 border-0 p-0 focus-visible:ring-0"
                  />
                  <button
                    onClick={() => onSessionChange({ ...sessionConfig, sessions: sessionConfig.sessions.filter(item => item.id !== s.id) })}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onSessionChange({ ...sessionConfig, sessions: [...sessionConfig.sessions, { id: `sess_${Date.now()}`, title: "", capacity: null, waitlistEnabled: true, groupId: null }] })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="h-3 w-3" /> Aggiungi sessione
              </button>
            </div>
          )}
        </div>
      </div>
      <Button size="sm" onClick={onSave} disabled={saving} className="mt-3 gap-1.5 h-7 text-xs">
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        Salva configurazione
      </Button>
    </div>
  );
}

// ─── Main FormBuilder ─────────────────────────────────────────────────────────

export function FormBuilder({ eventId, initialFields }: Props) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingActive, setDraggingActive] = useState<Active | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [savingPlugins, setSavingPlugins] = useState(false);
  const [formTheme, setFormTheme] = useState<FormTheme>({
    primaryColor: "#3B82F6", bgColor: "#FFFFFF", radius: "md", font: "inter", button: "filled",
  });
  const [sessionConfig, setSessionConfig] = useState<SessionsConfig>({ enabled: false, sessions: [] });
  const [regConfig, setRegConfig] = useState<RegistrationConfig>({ mode: "PUBLIC", invitedEmails: [] });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/groups`),
      fetch(`/api/events/${eventId}/plugins/sessions`),
      fetch(`/api/events/${eventId}/plugins/registration`),
      fetch(`/api/events/${eventId}/plugins/form-theme`),
    ]).then(async ([gRes, sRes, rRes, tRes]) => {
      if (gRes.ok) setGroups(await gRes.json());
      if (sRes.ok) setSessionConfig(await sRes.json());
      if (rRes.ok) setRegConfig(await rRes.json());
      if (tRes.ok) {
        const t = await tRes.json();
        if (t.primaryColor) setFormTheme(t);
      }
    }).catch(() => {});
  }, [eventId]);

  const sorted = useMemo(() => [...fields].sort((a, b) => a.order - b.order), [fields]);
  const fieldIds = useMemo(() => sorted.map(f => f.id), [sorted]);
  const selectedField = useMemo(() => fields.find(f => f.id === selectedId) ?? null, [fields, selectedId]);

  async function persistOrder(reordered: FormField[]) {
    await fetch(`/api/events/${eventId}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: reordered.map(f => ({ id: f.id, order: f.order })) }),
    });
  }

  async function addField(type: string, beforeId?: string) {
    const ti = getTypeInfo(type);
    const defaultOptions = HAS_OPTIONS.has(type) ? ["Opzione 1", "Opzione 2", "Opzione 3"] : undefined;
    try {
      const res = await fetch(`/api/events/${eventId}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: ti.label,
          type,
          placeholder: null,
          required: false,
          options: defaultOptions ?? null,
          conditions: { visibility: { mode: "ALL", groupIds: [] } },
        }),
      });
      if (!res.ok) throw new Error();
      const newField = await res.json() as FormField;

      setFields(prev => {
        const s = [...prev].sort((a, b) => a.order - b.order);
        if (beforeId) {
          const insertIdx = s.findIndex(f => f.id === beforeId);
          if (insertIdx !== -1) {
            s.splice(insertIdx, 0, newField);
            const reordered = s.map((f, i) => ({ ...f, order: i }));
            persistOrder(reordered).catch(() => {});
            return reordered;
          }
        }
        const reordered = [...s, newField].map((f, i) => ({ ...f, order: i }));
        persistOrder(reordered).catch(() => {});
        return reordered;
      });

      setSelectedId(newField.id);
    } catch {
      toast("Errore nell'aggiunta del campo", { variant: "error" });
    }
  }

  async function deleteField(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${eventId}/form/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFields(prev => prev.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i })));
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast("Errore nell'eliminazione", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleRequired(field: FormField) {
    const updated = { ...field, required: !field.required };
    setFields(prev => prev.map(f => f.id === field.id ? updated : f));
    try {
      const res = await fetch(`/api/events/${eventId}/form/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ required: updated.required }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setFields(prev => prev.map(f => f.id === field.id ? field : f));
      toast("Errore", { variant: "error" });
    }
  }

  async function patchField(fieldId: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/events/${eventId}/form/${fieldId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    const updated = await res.json() as FormField;
    setFields(prev => prev.map(f => f.id === fieldId ? updated : f));
  }

  async function saveTheme(theme: FormTheme) {
    setFormTheme(theme);
    try {
      await fetch(`/api/events/${eventId}/plugins/form-theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
    } catch {
      toast("Errore nel salvataggio tema", { variant: "error" });
    }
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingActive(active);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingActive(null);
    if (!over) return;

    if (active.data.current?.type === "palette") {
      const fieldType = active.data.current.fieldType as string;
      const beforeId = (over.id !== "canvas" && String(over.id) !== `palette-${fieldType}`)
        ? String(over.id)
        : undefined;
      addField(fieldType, beforeId);
    } else if (active.id !== over.id) {
      setFields(prev => {
        const s = [...prev].sort((a, b) => a.order - b.order);
        const oldIdx = s.findIndex(f => f.id === active.id);
        const newIdx = s.findIndex(f => f.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const reordered = arrayMove(s, oldIdx, newIdx).map((f, i) => ({ ...f, order: i }));
        persistOrder(reordered).catch(() => toast("Errore nell'ordinamento", { variant: "error" }));
        return reordered;
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex" style={{ height: "calc(100vh - 7rem)" }}>

        {/* ── Left: Field Palette ─────────────────────────────────────── */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto flex flex-col">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">Tipi di campo</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {FIELD_CATEGORIES.map(cat => (
              <div key={cat.name} className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 py-1.5">{cat.name}</p>
                <div className="space-y-0.5">
                  {cat.items.map(item => (
                    <PaletteItem
                      key={item.type}
                      type={item.type}
                      label={item.label}
                      icon={item.icon}
                      color={item.color}
                      bg={item.bg}
                      onAdd={() => addField(item.type)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center: Canvas ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          {/* Top bar */}
          <div className="h-11 bg-white border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0 relative">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Form registrazione</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {sorted.length + 6} campi
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPlugins(!showPlugins)}
                className={`px-3 h-7 rounded-lg text-xs font-medium transition-colors ${showPlugins ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Sessioni & Inviti
              </button>
              <div className="relative">
                <button
                  onClick={() => { setShowTheme(!showTheme); }}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${showTheme ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  title="Personalizza tema"
                >
                  <Palette className="h-3.5 w-3.5" />
                </button>
                {showTheme && (
                  <ThemePanel theme={formTheme} onChange={saveTheme} onClose={() => setShowTheme(false)} />
                )}
              </div>
              <button
                onClick={() => setShowPreview(true)}
                className="h-7 px-3 rounded-lg flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" /> Anteprima
              </button>
            </div>
          </div>

          {/* Plugins panel */}
          {showPlugins && (
            <PluginsPanel
              regConfig={regConfig}
              sessionConfig={sessionConfig}
              onRegChange={setRegConfig}
              onSessionChange={setSessionConfig}
              saving={savingPlugins}
              onSave={async () => {
                setSavingPlugins(true);
                try {
                  await Promise.all([
                    fetch(`/api/events/${eventId}/plugins/registration`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(regConfig) }),
                    fetch(`/api/events/${eventId}/plugins/sessions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sessionConfig) }),
                  ]);
                  toast("Configurazione salvata", { variant: "success" });
                } catch {
                  toast("Errore nel salvataggio", { variant: "error" });
                } finally {
                  setSavingPlugins(false);
                }
              }}
            />
          )}

          {/* Scrollable canvas */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Standard fields */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Campi standard — sempre inclusi</p>
              <div className="space-y-1">
                {STANDARD_FIELDS.map(f => (
                  <div key={f.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-gray-100">
                    <GripVertical className="h-4 w-4 text-gray-200" />
                    <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center">
                      <Type className="h-3 w-3 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-500 flex-1">{f.label}</span>
                    {f.required && <span className="text-xs text-gray-400">Obbligatorio</span>}
                    <Badge variant="outline" className="text-[10px] text-gray-300 border-gray-200 font-normal">Standard</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Header block */}
            <HeaderBlock
              theme={formTheme}
              isSelected={selectedId === "__header__"}
              onClick={() => setSelectedId(prev => prev === "__header__" ? null : "__header__")}
            />

            {/* Custom fields */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Campi personalizzati</p>
              <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                <CanvasDropZone isEmpty={sorted.length === 0}>
                  {sorted.map(field => (
                    <SortableFieldCard
                      key={field.id}
                      field={field}
                      isSelected={selectedId === field.id}
                      onSelect={() => setSelectedId(prev => prev === field.id ? null : field.id)}
                      onDelete={() => deleteField(field.id)}
                      onToggleRequired={() => toggleRequired(field)}
                      deleting={deletingId === field.id}
                    />
                  ))}
                </CanvasDropZone>
              </SortableContext>
            </div>
          </div>
        </div>

        {/* ── Right: Properties ───────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col">
          {selectedId === "__header__" ? (
            <HeaderProperties theme={formTheme} onChange={saveTheme} />
          ) : selectedField ? (
            <FieldProperties
              key={selectedField.id}
              field={selectedField}
              fields={sorted}
              groups={groups}
              onPatch={patchField}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Settings2 className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Proprietà campo</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Seleziona un campo nel canvas per modificarne le impostazioni, o trascina un tipo dal pannello sinistro.
              </p>
              <div className="mt-5 p-3 rounded-xl bg-gray-50 text-left w-full">
                <p className="text-xs font-semibold text-gray-500 mb-2">Suggerimento</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Trascina i tipi di campo direttamente in posizione nel canvas, oppure clicca per aggiungerli alla fine.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
        {draggingActive && (() => {
          const isPalette = draggingActive.data.current?.type === "palette";
          const ti = isPalette
            ? getTypeInfo(draggingActive.data.current?.fieldType as string)
            : getTypeInfo(fields.find(f => f.id === draggingActive.id)?.type ?? "");
          const Icon = ti.icon;
          const label = isPalette ? ti.label : (fields.find(f => f.id === draggingActive.id)?.label ?? ti.label);
          return (
            <div className="bg-white border-2 border-blue-400 rounded-xl px-3 py-2.5 shadow-xl flex items-center gap-2 pointer-events-none">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ti.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${ti.color}`} />
              </div>
              <span className="text-sm font-semibold text-gray-900">{label}</span>
            </div>
          );
        })()}
      </DragOverlay>

      {/* Preview modal */}
      {showPreview && (
        <FormPreview
          fields={sorted}
          theme={formTheme}
          sessionConfig={sessionConfig}
          onClose={() => setShowPreview(false)}
        />
      )}
    </DndContext>
  );
}
