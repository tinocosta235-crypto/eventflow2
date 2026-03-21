"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  Type,
  MousePointer,
  Minus,
  LayoutDashboard,
  Columns3,
  Link2,
  Share2,
  PanelLeftOpen,
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Monitor,
  Smartphone,
  Plus,
  Eye,
  Upload,
  ImagePlus,
  Settings2,
  ArrowUpDown,
  Image as ImageLucide,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import type {
  BuilderBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  SpacerBlock,
  Columns2Block,
  Columns3Block,
  ButtonGroupBlock,
  SocialLinksBlock,
  TextImageBlock,
  EmailBuilderPayload,
  TemplateVariables,
} from "@/lib/email-builder";
import { renderBuilderContentHtml } from "@/lib/email-builder";

// ── Types ──────────────────────────────────────────────────────────────────

type PaletteItem = {
  id: string;
  kind: BuilderBlock["kind"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  preset?: string;
};

type PreviewMode = "INVITE" | "REMINDER" | "UPDATE";

// ── Palette config ─────────────────────────────────────────────────────────

const PALETTE: { group: string; items: PaletteItem[] }[] = [
  {
    group: "Content",
    items: [
      {
        id: "pal-text",
        kind: "text",
        label: "Text",
        description: "Paragraph or body text",
        icon: AlignLeft,
      },
      {
        id: "pal-heading",
        kind: "text",
        label: "Heading",
        description: "Section title",
        icon: Type,
        preset: "heading",
      },
      {
        id: "pal-image",
        kind: "image",
        label: "Image",
        description: "Photo or graphic",
        icon: ImageLucide,
      },
      {
        id: "pal-button",
        kind: "button",
        label: "Button",
        description: "Call to action link",
        icon: MousePointer,
      },
    ],
  },
  {
    group: "Layout",
    items: [
      {
        id: "pal-col2",
        kind: "columns-2",
        label: "2 Colonne",
        description: "Contenuto affiancato",
        icon: LayoutDashboard,
      },
      {
        id: "pal-col3",
        kind: "columns-3",
        label: "3 Colonne",
        description: "Layout a 3 colonne",
        icon: Columns3,
      },
      {
        id: "pal-text-image",
        kind: "text-image",
        label: "Testo + Immagine",
        description: "Testo a sinistra, foto a destra",
        icon: PanelLeftOpen,
      },
    ],
  },
  {
    group: "Actions",
    items: [
      {
        id: "pal-button-group",
        kind: "button-group",
        label: "Gruppo bottoni",
        description: "Più CTA affiancate",
        icon: Link2,
      },
      {
        id: "pal-social",
        kind: "social-links",
        label: "Social links",
        description: "Icone social media",
        icon: Share2,
      },
    ],
  },
  {
    group: "Elements",
    items: [
      {
        id: "pal-divider",
        kind: "divider",
        label: "Divisore",
        description: "Separatore orizzontale",
        icon: Minus,
      },
      {
        id: "pal-spacer",
        kind: "spacer",
        label: "Spazio",
        description: "Spaziatura verticale",
        icon: ArrowUpDown,
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createBlock(kind: BuilderBlock["kind"], preset?: string): BuilderBlock {
  if (kind === "text") {
    if (preset === "heading")
      return { id: newId("h"), kind: "text", title: "Titolo sezione", content: "" };
    return {
      id: newId("txt"),
      kind: "text",
      title: "Intro",
      content: "Ciao {{firstName}},\n\nScrivi qui il contenuto.",
    };
  }
  if (kind === "image") return { id: newId("img"), kind: "image", imageUrl: "", alt: "immagine" };
  if (kind === "button")
    return { id: newId("btn"), kind: "button", label: "Clicca qui", href: "https://" };
  if (kind === "divider") return { id: newId("div"), kind: "divider" };
  if (kind === "spacer") return { id: newId("sp"), kind: "spacer", height: 24 };
  if (kind === "columns-2")
    return { id: newId("col2"), kind: "columns-2", leftTitle: "Colonna 1", leftBody: "Contenuto sinistra", rightTitle: "Colonna 2", rightBody: "Contenuto destra" };
  if (kind === "columns-3")
    return { id: newId("col3"), kind: "columns-3", col1Title: "Colonna 1", col1Body: "Testo", col2Title: "Colonna 2", col2Body: "Testo", col3Title: "Colonna 3", col3Body: "Testo" };
  if (kind === "button-group")
    return { id: newId("btng"), kind: "button-group", buttons: [{ label: "Registrati", href: "https://", style: "primary" }, { label: "Maggiori info", href: "https://", style: "outline" }] };
  if (kind === "social-links")
    return { id: newId("soc"), kind: "social-links", links: [{ platform: "linkedin", url: "https://linkedin.com" }, { platform: "instagram", url: "https://instagram.com" }] };
  if (kind === "text-image")
    return { id: newId("timg"), kind: "text-image", imagePosition: "right", imageUrl: "", alt: "immagine", title: "Titolo sezione", content: "Descrizione contenuto qui." };
  // fallback columns-2
  return { id: newId("col2"), kind: "columns-2", leftTitle: "Colonna 1", leftBody: "Contenuto sinistra", rightTitle: "Colonna 2", rightBody: "Contenuto destra" };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

function kindLabel(kind: BuilderBlock["kind"]) {
  const map: Record<string, string> = {
    text: "Testo", image: "Immagine", button: "Bottone", divider: "Divisore", spacer: "Spazio",
    "columns-2": "2 Colonne", "columns-3": "3 Colonne", "button-group": "Bottoni", "social-links": "Social", "text-image": "Testo+Img",
  };
  return map[kind] ?? kind;
}

// ── BlockVisualPreview ─────────────────────────────────────────────────────

function BlockVisualPreview({
  block,
  accentColor,
}: {
  block: BuilderBlock;
  accentColor: string;
}) {
  if (block.kind === "text") {
    return (
      <div className="py-0.5">
        {block.title && (
          <p className="text-sm font-semibold text-gray-800 mb-1">{block.title}</p>
        )}
        {block.content && (
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line line-clamp-4">
            {block.content}
          </p>
        )}
      </div>
    );
  }
  if (block.kind === "image") {
    if (block.imageUrl)
      return (
        <div className="py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.imageUrl}
            alt={block.alt || ""}
            className="w-full max-h-40 object-cover rounded-lg"
          />
        </div>
      );
    return (
      <div className="flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
        <ImageLucide className="h-6 w-6 text-gray-300 mb-1" />
        <p className="text-[11px] text-gray-400">Nessuna immagine</p>
      </div>
    );
  }
  if (block.kind === "button") {
    return (
      <div className="py-2 text-center">
        <span
          className="inline-block px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {block.label || "Button"}
        </span>
      </div>
    );
  }
  if (block.kind === "divider") {
    return (
      <div className="py-3">
        <hr className="border-gray-200" />
      </div>
    );
  }
  if (block.kind === "spacer") {
    return (
      <div
        className="flex items-center justify-center border-2 border-dashed border-gray-100 rounded"
        style={{ height: Math.min(Math.max(16, block.height), 80) }}
      >
        <span className="text-[10px] text-gray-300 font-mono">{block.height}px</span>
      </div>
    );
  }
  if (block.kind === "columns-2") {
    return (
      <div className="py-1 grid grid-cols-2 gap-3">
        <div>
          {block.leftTitle && <p className="text-xs font-semibold text-gray-700 mb-0.5">{block.leftTitle}</p>}
          <p className="text-xs text-gray-500 line-clamp-3 whitespace-pre-line">{block.leftBody}</p>
        </div>
        <div>
          {block.rightTitle && <p className="text-xs font-semibold text-gray-700 mb-0.5">{block.rightTitle}</p>}
          <p className="text-xs text-gray-500 line-clamp-3 whitespace-pre-line">{block.rightBody}</p>
        </div>
      </div>
    );
  }
  if (block.kind === "columns-3") {
    return (
      <div className="py-1 grid grid-cols-3 gap-2">
        {[{ t: block.col1Title, b: block.col1Body }, { t: block.col2Title, b: block.col2Body }, { t: block.col3Title, b: block.col3Body }].map((col, i) => (
          <div key={i}>
            {col.t && <p className="text-[10px] font-semibold text-gray-700 mb-0.5">{col.t}</p>}
            <p className="text-[10px] text-gray-500 line-clamp-2 whitespace-pre-line">{col.b}</p>
          </div>
        ))}
      </div>
    );
  }
  if (block.kind === "button-group") {
    return (
      <div className="py-1.5 flex flex-wrap gap-1.5">
        {block.buttons.map((b, i) => (
          <span key={i} className="inline-block px-3 py-1 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: accentColor, opacity: b.style === "outline" ? 0.6 : 1 }}>
            {b.label || "Bottone"}
          </span>
        ))}
      </div>
    );
  }
  if (block.kind === "social-links") {
    return (
      <div className="py-1.5 flex flex-wrap gap-1.5">
        {block.links.map((l, i) => (
          <span key={i} className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-gray-100 text-gray-500">{l.platform}</span>
        ))}
      </div>
    );
  }
  if (block.kind === "text-image") {
    return (
      <div className="py-1 flex gap-3 items-start" style={{ flexDirection: block.imagePosition === "left" ? "row-reverse" : "row" }}>
        <div className="flex-1 min-w-0">
          {block.title && <p className="text-xs font-semibold text-gray-700 mb-0.5">{block.title}</p>}
          <p className="text-xs text-gray-500 line-clamp-3 whitespace-pre-line">{block.content}</p>
        </div>
        <div className="w-14 h-10 flex-shrink-0 rounded bg-gray-100 overflow-hidden">
          {block.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={block.imageUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><ImageLucide className="h-4 w-4 text-gray-300" /></div>
          }
        </div>
      </div>
    );
  }
  return null;
}

// ── SortableBlock ──────────────────────────────────────────────────────────

function SortableBlock({
  block,
  isSelected,
  accentColor,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: BuilderBlock;
  isSelected: boolean;
  accentColor: string;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`relative group rounded-xl border-2 bg-white transition-all cursor-pointer ${
        isSelected
          ? "border-[#7060CC] shadow-[0_0_0_3px_rgba(112,96,204,0.10)]"
          : "border-transparent hover:border-gray-200"
      }`}
    >
      {/* type chip */}
      <span
        className={`absolute -top-2.5 left-3 z-10 px-1.5 py-0.5 rounded-full bg-white border text-[10px] font-medium pointer-events-none transition-opacity ${
          isSelected ? "opacity-100 border-[#7060CC] text-[#7060CC]" : "opacity-0 group-hover:opacity-100 border-gray-200 text-gray-400"
        }`}
      >
        {kindLabel(block.kind)}
      </span>

      {/* action toolbar */}
      <div
        className={`absolute -right-px top-1/2 -translate-y-1/2 z-10 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 hover:bg-gray-50 text-gray-400 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1.5 hover:bg-gray-50 text-gray-400 disabled:opacity-30"
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1.5 hover:bg-gray-50 text-gray-400 disabled:opacity-30"
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDuplicate}
          className="p-1.5 hover:bg-gray-50 text-gray-400"
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <div className="border-t border-gray-100" />
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* content preview */}
      <div className="px-4 py-3 pr-8">
        <BlockVisualPreview block={block} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ── BlockEditorPanel ───────────────────────────────────────────────────────

function BlockEditorPanel({
  block,
  accentColor,
  onChange,
  onImageFile,
}: {
  block: BuilderBlock;
  accentColor: string;
  onChange: (patch: Partial<BuilderBlock>) => void;
  onImageFile: (file: File) => void;
}) {
  const lbl = "block text-[11px] font-medium text-gray-500 mb-1";

  return (
    <div className="space-y-3">
      {block.kind === "text" && (
        <>
          <div>
            <label className={lbl}>Title (optional)</label>
            <Input
              className="h-8 text-sm"
              value={(block as TextBlock).title ?? ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Section heading"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Content</label>
              <div className="flex gap-1 flex-wrap">
                {["{{firstName}}", "{{lastName}}", "{{eventTitle}}"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange({ content: (block as TextBlock).content + p })}
                    className="text-[9px] font-mono bg-gray-100 hover:bg-cyan-50 text-gray-500 hover:text-cyan-600 px-1 py-0.5 rounded border border-gray-200 hover:border-cyan-200 transition-colors"
                  >
                    {p.replace(/[{}]/g, "")}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7060CC]/30 focus:border-transparent"
              value={(block as TextBlock).content}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder="Scrivi il contenuto..."
            />
          </div>
        </>
      )}

      {block.kind === "image" && (
        <>
          <div>
            <label className={lbl}>Image</label>
            <label className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-cyan-300 bg-gray-50 hover:bg-cyan-50/30 cursor-pointer transition-colors overflow-hidden">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImageFile(f);
                }}
              />
              {(block as ImageBlock).imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(block as ImageBlock).imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <ImagePlus className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Click to upload</p>
                </div>
              )}
            </label>
          </div>
          <div>
            <label className={lbl}>Image URL</label>
            <Input
              className="h-8 text-sm"
              value={(block as ImageBlock).imageUrl}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className={lbl}>Alt text</label>
            <Input
              className="h-8 text-sm"
              value={(block as ImageBlock).alt ?? ""}
              onChange={(e) => onChange({ alt: e.target.value })}
              placeholder="Describe the image"
            />
          </div>
        </>
      )}

      {block.kind === "button" && (
        <>
          <div>
            <label className={lbl}>Button label</label>
            <Input
              className="h-8 text-sm"
              value={(block as ButtonBlock).label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Click here"
            />
          </div>
          <div>
            <label className={lbl}>URL</label>
            <Input
              className="h-8 text-sm"
              value={(block as ButtonBlock).href}
              onChange={(e) => onChange({ href: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className={lbl}>Color</label>
            <div className="flex items-center gap-2">
              <span
                className="h-6 w-6 rounded border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-xs text-gray-400">Set in branding settings</span>
            </div>
          </div>
        </>
      )}

      {block.kind === "spacer" && (
        <div>
          <label className={lbl}>Height — {(block as SpacerBlock).height}px</label>
          <input
            type="range"
            min={8}
            max={120}
            step={4}
            value={(block as SpacerBlock).height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
            className="w-full accent-[#7060CC]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>8px</span>
            <span>120px</span>
          </div>
        </div>
      )}

      {block.kind === "divider" && (
        <p className="text-xs text-gray-400 italic py-2">
          Horizontal separator. No settings needed.
        </p>
      )}

      {block.kind === "columns-2" && (
        <div className="space-y-3">
          {[
            { key: "left", titleKey: "leftTitle", bodyKey: "leftBody", label: "Colonna sinistra" },
            { key: "right", titleKey: "rightTitle", bodyKey: "rightBody", label: "Colonna destra" },
          ].map((col) => (
            <div key={col.key} className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{col.label}</p>
              <div>
                <label className={lbl}>Titolo</label>
                <Input className="h-7 text-xs" value={(block as Columns2Block)[col.titleKey as "leftTitle"] ?? ""} onChange={(e) => onChange({ [col.titleKey]: e.target.value })} placeholder="Titolo colonna" />
              </div>
              <div>
                <label className={lbl}>Contenuto</label>
                <textarea rows={3} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs resize-none" value={(block as Columns2Block)[col.bodyKey as "leftBody"]} onChange={(e) => onChange({ [col.bodyKey]: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {block.kind === "columns-3" && (
        <div className="space-y-3">
          {[
            { titleKey: "col1Title", bodyKey: "col1Body", label: "Colonna 1" },
            { titleKey: "col2Title", bodyKey: "col2Body", label: "Colonna 2" },
            { titleKey: "col3Title", bodyKey: "col3Body", label: "Colonna 3" },
          ].map((col) => (
            <div key={col.label} className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{col.label}</p>
              <div>
                <label className={lbl}>Titolo</label>
                <Input className="h-7 text-xs" value={(block as Columns3Block)[col.titleKey as "col1Title"] ?? ""} onChange={(e) => onChange({ [col.titleKey]: e.target.value })} placeholder="Titolo" />
              </div>
              <div>
                <label className={lbl}>Contenuto</label>
                <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs resize-none" value={(block as Columns3Block)[col.bodyKey as "col1Body"]} onChange={(e) => onChange({ [col.bodyKey]: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {block.kind === "button-group" && (
        <div className="space-y-3">
          {(block as ButtonGroupBlock).buttons.map((btn, i) => (
            <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Bottone {i + 1}</p>
                <button onClick={() => { const b = [...(block as ButtonGroupBlock).buttons]; b.splice(i, 1); onChange({ buttons: b } as Partial<BuilderBlock>); }} className="text-[10px] text-red-400 hover:text-red-600">Rimuovi</button>
              </div>
              <div>
                <label className={lbl}>Label</label>
                <Input className="h-7 text-xs" value={btn.label} onChange={(e) => { const b = [...(block as ButtonGroupBlock).buttons]; b[i] = { ...b[i], label: e.target.value }; onChange({ buttons: b } as Partial<BuilderBlock>); }} />
              </div>
              <div>
                <label className={lbl}>URL</label>
                <Input className="h-7 text-xs" value={btn.href} onChange={(e) => { const b = [...(block as ButtonGroupBlock).buttons]; b[i] = { ...b[i], href: e.target.value }; onChange({ buttons: b } as Partial<BuilderBlock>); }} placeholder="https://" />
              </div>
              <div>
                <label className={lbl}>Stile</label>
                <select className="w-full h-7 rounded border border-gray-200 text-xs px-2" value={btn.style} onChange={(e) => { const b = [...(block as ButtonGroupBlock).buttons]; b[i] = { ...b[i], style: e.target.value as "primary"|"secondary"|"outline" }; onChange({ buttons: b } as Partial<BuilderBlock>); }}>
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="outline">Outline</option>
                </select>
              </div>
            </div>
          ))}
          <button onClick={() => onChange({ buttons: [...(block as ButtonGroupBlock).buttons, { label: "Nuovo bottone", href: "https://", style: "secondary" }] } as Partial<BuilderBlock>)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-500 hover:border-[#7060CC] hover:text-[#7060CC] transition-colors">
            <Plus className="h-3.5 w-3.5" /> Aggiungi bottone
          </button>
        </div>
      )}

      {block.kind === "social-links" && (
        <div className="space-y-3">
          {(block as SocialLinksBlock).links.map((link, i) => (
            <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Link {i + 1}</p>
                <button onClick={() => { const l = [...(block as SocialLinksBlock).links]; l.splice(i, 1); onChange({ links: l } as Partial<BuilderBlock>); }} className="text-[10px] text-red-400 hover:text-red-600">Rimuovi</button>
              </div>
              <div>
                <label className={lbl}>Piattaforma</label>
                <select className="w-full h-7 rounded border border-gray-200 text-xs px-2" value={link.platform} onChange={(e) => { const l = [...(block as SocialLinksBlock).links]; l[i] = { ...l[i], platform: e.target.value as SocialLinksBlock["links"][0]["platform"] }; onChange({ links: l } as Partial<BuilderBlock>); }}>
                  {["facebook","instagram","linkedin","twitter","youtube","website"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>URL</label>
                <Input className="h-7 text-xs" value={link.url} onChange={(e) => { const l = [...(block as SocialLinksBlock).links]; l[i] = { ...l[i], url: e.target.value }; onChange({ links: l } as Partial<BuilderBlock>); }} placeholder="https://" />
              </div>
            </div>
          ))}
          <button onClick={() => onChange({ links: [...(block as SocialLinksBlock).links, { platform: "website", url: "https://" }] } as Partial<BuilderBlock>)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-500 hover:border-[#7060CC] hover:text-[#7060CC] transition-colors">
            <Plus className="h-3.5 w-3.5" /> Aggiungi link
          </button>
        </div>
      )}

      {block.kind === "text-image" && (
        <div className="space-y-3">
          <div>
            <label className={lbl}>Posizione immagine</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(["left", "right"] as const).map(pos => (
                <button key={pos} onClick={() => onChange({ imagePosition: pos } as Partial<BuilderBlock>)} className={`flex-1 py-1.5 text-xs font-medium transition-colors ${(block as TextImageBlock).imagePosition === pos ? "bg-[#7060CC] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  {pos === "left" ? "← Immagine sinistra" : "Immagine destra →"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Immagine</label>
            <label className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#7060CC] bg-gray-50 cursor-pointer transition-colors overflow-hidden">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageFile(f); }} />
              {(block as TextImageBlock).imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={(block as TextImageBlock).imageUrl} alt="" className="h-full w-full object-cover" />
                : <div className="text-center"><ImagePlus className="h-5 w-5 text-gray-300 mx-auto mb-1" /><p className="text-xs text-gray-400">Carica immagine</p></div>
              }
            </label>
          </div>
          <div>
            <label className={lbl}>URL immagine</label>
            <Input className="h-8 text-sm" value={(block as TextImageBlock).imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value } as Partial<BuilderBlock>)} placeholder="https://..." />
          </div>
          <div>
            <label className={lbl}>Titolo</label>
            <Input className="h-8 text-sm" value={(block as TextImageBlock).title ?? ""} onChange={(e) => onChange({ title: e.target.value } as Partial<BuilderBlock>)} />
          </div>
          <div>
            <label className={lbl}>Testo</label>
            <textarea rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" value={(block as TextImageBlock).content} onChange={(e) => onChange({ content: e.target.value } as Partial<BuilderBlock>)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── EmailCanvasBuilder ─────────────────────────────────────────────────────

export type EmailCanvasBuilderProps = {
  builder: EmailBuilderPayload;
  setBuilder: React.Dispatch<React.SetStateAction<EmailBuilderPayload>>;
  eventTitle: string;
};

export function EmailCanvasBuilder({ builder, setBuilder, eventTitle }: EmailCanvasBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [rightTab, setRightTab] = useState<"edit" | "preview">("edit");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("INVITE");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedBlock = builder.blocks.find((b) => b.id === selectedId) ?? null;

  const previewVars: TemplateVariables =
    previewMode === "REMINDER"
      ? { firstName: "Andrea", lastName: "Milanino", eventTitle: `${eventTitle} · Reminder` }
      : previewMode === "UPDATE"
        ? { firstName: "Giulia", lastName: "Rossi", eventTitle: `${eventTitle} · Update` }
        : { firstName: "Marco", lastName: "Bianchi", eventTitle };

  function addBlock(kind: BuilderBlock["kind"], preset?: string) {
    const block = createBlock(kind, preset);
    setBuilder((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
    setSelectedId(block.id);
    setRightTab("edit");
  }

  function updateBlock(id: string, patch: Partial<BuilderBlock>) {
    setBuilder((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as BuilderBlock) : b)),
    }));
  }

  function duplicateBlock(id: string) {
    setBuilder((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev.blocks[idx], id: newId(prev.blocks[idx].kind) };
      const next = [...prev.blocks];
      next.splice(idx + 1, 0, copy);
      return { ...prev, blocks: next };
    });
  }

  function deleteBlock(id: string) {
    setBuilder((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function moveBlock(id: string, dir: "up" | "down") {
    setBuilder((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      if (dir === "up" && idx === 0) return prev;
      if (dir === "down" && idx === prev.blocks.length - 1) return prev;
      const next = [...prev.blocks];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return { ...prev, blocks: next };
    });
  }

  async function handleImageFile(blockId: string, file: File) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateBlock(blockId, { imageUrl: dataUrl } as Partial<BuilderBlock>);
    } catch {
      toast("Impossibile leggere l'immagine", { variant: "error" });
    }
  }

  async function handleBrandImage(kind: "logoUrl" | "headerImageUrl", file: File) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setBuilder((prev) => ({ ...prev, branding: { ...prev.branding, [kind]: dataUrl } }));
      toast(kind === "logoUrl" ? "Logo aggiornato" : "Header aggiornato", { variant: "success" });
    } catch {
      toast("Impossibile leggere l'immagine", { variant: "error" });
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setBuilder((prev) => {
      const from = prev.blocks.findIndex((b) => b.id === active.id);
      const to = prev.blocks.findIndex((b) => b.id === over.id);
      if (from < 0 || to < 0) return prev;
      return { ...prev, blocks: arrayMove(prev.blocks, from, to) };
    });
  }

  const previewHtml = renderBuilderContentHtml(builder, previewVars);
  const blockIds = builder.blocks.map((b) => b.id);

  const lbl = "block text-[10px] font-medium text-gray-500 mb-1";

  return (
    <div className="flex h-[560px] rounded-xl border border-gray-200 overflow-hidden">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="w-[215px] flex-shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
        <div className="p-3 space-y-5">
          {/* Block palette */}
          {PALETTE.map((section) => (
            <div key={section.group}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-0.5">
                {section.group}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => addBlock(item.kind, item.preset)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white border border-gray-200 hover:border-[#7060CC]/50 hover:bg-[#7060CC]/5 transition-all text-left group"
                    >
                      <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 group-hover:bg-[#7060CC]/5 group-hover:border-[#7060CC]/30 transition-colors">
                        <Icon className="h-3.5 w-3.5 text-gray-500 group-hover:text-[#7060CC]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 leading-tight">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-gray-400 leading-tight truncate">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Branding */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-0.5">
              Branding
            </p>
            <div className="space-y-2">
              <div>
                <label className={lbl}>Accent color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={builder.branding.accentColor}
                    onChange={(e) =>
                      setBuilder((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, accentColor: e.target.value },
                      }))
                    }
                    className="h-7 w-8 rounded cursor-pointer border border-gray-200 flex-shrink-0"
                  />
                  <Input
                    value={builder.branding.accentColor}
                    onChange={(e) =>
                      setBuilder((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, accentColor: e.target.value },
                      }))
                    }
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className={lbl}>Font family</label>
                <Input
                  value={builder.branding.fontFamily}
                  onChange={(e) =>
                    setBuilder((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, fontFamily: e.target.value },
                    }))
                  }
                  className="h-7 text-xs"
                  placeholder="Inter, Arial, sans-serif"
                />
              </div>
              <div>
                <label className={lbl}>Header image</label>
                <label className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-dashed border-gray-200 hover:border-cyan-300 bg-white cursor-pointer transition-colors overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleBrandImage("headerImageUrl", f);
                    }}
                  />
                  {builder.branding.headerImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={builder.branding.headerImageUrl}
                      alt=""
                      className="h-7 w-full object-cover rounded"
                    />
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 truncate">Upload header</span>
                    </>
                  )}
                </label>
              </div>
              <div>
                <label className={lbl}>Logo</label>
                <label className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-dashed border-gray-200 hover:border-cyan-300 bg-white cursor-pointer transition-colors overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleBrandImage("logoUrl", f);
                    }}
                  />
                  {builder.branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={builder.branding.logoUrl}
                      alt=""
                      className="h-7 object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 truncate">Upload logo</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CENTER: CANVAS ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f0f0f2] overflow-hidden">
        {/* Canvas toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">
            {builder.blocks.length} block{builder.blocks.length !== 1 ? "s" : ""}
            {selectedBlock && (
              <span className="ml-2 text-cyan-500 font-medium">
                · {kindLabel(selectedBlock.kind)} selected
              </span>
            )}
          </p>
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setPreviewDevice("desktop")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                previewDevice === "desktop"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Monitor className="h-3 w-3" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setPreviewDevice("mobile")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                previewDevice === "mobile"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Smartphone className="h-3 w-3" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
        </div>

        {/* Canvas scrollable area */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div
            className={`mx-auto bg-white rounded-xl shadow-sm transition-all duration-300 ${
              previewDevice === "mobile" ? "max-w-[375px]" : "max-w-[580px]"
            }`}
          >
            {/* Branding header */}
            {(builder.branding.headerImageUrl || builder.branding.logoUrl) && (
              <div className="px-6 pt-5 pb-3 text-center border-b border-gray-50">
                {builder.branding.headerImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={builder.branding.headerImageUrl}
                    alt="header"
                    className="w-full rounded-xl object-cover max-h-28 mb-3"
                  />
                )}
                {builder.branding.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={builder.branding.logoUrl}
                    alt="logo"
                    className="h-8 mx-auto object-contain"
                  />
                )}
              </div>
            )}

            {/* Blocks */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                <div className="p-4 space-y-1.5 min-h-[200px]">
                  {builder.blocks.length === 0 && (
                    <div
                      className="flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed border-gray-200 cursor-default"
                      onClick={() => {}}
                    >
                      <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                        <Plus className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-400">Canvas vuoto</p>
                      <p className="text-xs text-gray-300 mt-1">
                        Clicca un blocco a sinistra per aggiungerlo
                      </p>
                    </div>
                  )}
                  {builder.blocks.map((block, idx) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      isSelected={selectedId === block.id}
                      accentColor={builder.branding.accentColor}
                      onSelect={() => {
                        setSelectedId(block.id);
                        setRightTab("edit");
                      }}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, "up")}
                      onMoveDown={() => moveBlock(block.id, "down")}
                      isFirst={idx === 0}
                      isLast={idx === builder.blocks.length - 1}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <div className="bg-white rounded-xl border-2 border-cyan-400 shadow-xl px-4 py-3 opacity-90 w-48">
                    <p className="text-xs text-gray-500 font-medium">Moving block…</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="w-[270px] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setRightTab("edit")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              rightTab === "edit"
                ? "text-cyan-600 border-b-2 border-cyan-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Properties
          </button>
          <button
            onClick={() => setRightTab("preview")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              rightTab === "preview"
                ? "text-cyan-600 border-b-2 border-cyan-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {rightTab === "edit" && (
            <div className="p-4">
              {selectedBlock ? (
                <>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <div className="h-6 w-6 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      <Settings2 className="h-3.5 w-3.5 text-cyan-500" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700 capitalize">
                      {kindLabel(selectedBlock.kind)}
                    </p>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="ml-auto text-[10px] text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <BlockEditorPanel
                    block={selectedBlock}
                    accentColor={builder.branding.accentColor}
                    onChange={(patch) => updateBlock(selectedBlock.id, patch)}
                    onImageFile={(file) => handleImageFile(selectedBlock.id, file)}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                    <Settings2 className="h-5 w-5 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No block selected</p>
                  <p className="text-xs text-gray-300 mt-1 max-w-[160px]">
                    Click a block on the canvas to edit its properties
                  </p>
                </div>
              )}
            </div>
          )}

          {rightTab === "preview" && (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <select
                  value={previewMode}
                  onChange={(e) => setPreviewMode(e.target.value as PreviewMode)}
                  className="h-7 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-xs"
                >
                  <option value="INVITE">Invito — Marco Bianchi</option>
                  <option value="REMINDER">Reminder — Andrea Milanino</option>
                  <option value="UPDATE">Update — Giulia Rossi</option>
                </select>
              </div>
              <div
                className="rounded-xl border border-gray-100 bg-white p-3 text-sm overflow-hidden"
                style={{ fontFamily: builder.branding.fontFamily }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
