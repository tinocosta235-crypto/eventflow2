"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import {
  appendBuilderVersion,
  createDefaultBuilderPayload,
  parseBuilderPayload,
  renderBuilderContentHtml,
  serializeBuilderPayload,
  summarizeTemplateBody,
  type BuilderStatus,
  type EmailBuilderPayload,
} from "@/lib/email-builder";
import { EmailCanvasBuilder } from "@/components/email-builder/EmailCanvasBuilder";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  groupId: string | null;
  category: string;
  includeUnsubscribe: boolean;
};

type EventGroup = {
  id: string;
  name: string;
};

type RegistrationPathEmailMap = {
  inviteTemplateId?: string | null;
  confirmationTemplateId?: string | null;
  waitlistTemplateId?: string | null;
  reminderTemplateId?: string | null;
  updateTemplateId?: string | null;
  followupTemplateId?: string | null;
};

type RegistrationPath = {
  id: string;
  name: string;
  description: string;
  groupId: string | null;
  active: boolean;
  emailTemplateIds: RegistrationPathEmailMap;
};

type Props = {
  eventId: string;
  eventTitle: string;
  templates: Template[];
  statusCounts: Record<string, number>;
  groups: EventGroup[];
};

type PreviewMode = "INVITE" | "REMINDER" | "UPDATE";
type BuilderStep = "DETAILS" | "RECIPIENTS" | "DESIGN";
type DeliveryMode = "MANUAL" | "CONDITIONAL";

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

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  INVITE: "Invito",
  REG_CONFIRMATION: "Conferma registrazione",
  WAITLIST_CONFIRMATION: "Conferma waitlist",
  WAITLIST_PROMOTION: "Promozione waitlist",
  REMINDER: "Promemoria",
  UPDATE: "Aggiornamento",
  CANCELLATION: "Cancellazione",
  CUSTOM: "Custom",
};

const EMAIL_CATEGORIES = [
  {
    id: "pre_event",
    label: "Pre-evento",
    icon: Bell,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    description: "Email di invito e conferma",
  },
  {
    id: "reminder",
    label: "Reminder",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    description: "Promemoria e follow-up",
  },
  {
    id: "post_event",
    label: "Post-evento",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    description: "Ringraziamenti e feedback",
  },
  {
    id: "manual",
    label: "Manuale",
    icon: Send,
    color: "text-gray-600",
    bg: "bg-gray-50",
    description: "Invii manuali e ad hoc",
  },
] as const;

const PLACEHOLDERS = ["{{firstName}}", "{{lastName}}", "{{eventTitle}}"];

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}


function parseTemplateOrDefault(rawBody: string, eventTitle: string): EmailBuilderPayload {
  const parsed = parseBuilderPayload(rawBody);
  if (parsed) return parsed;
  const fallback = createDefaultBuilderPayload(eventTitle);
  fallback.blocks = [
    {
      id: newId("txt"),
      kind: "text",
      title: "Messaggio",
      content: rawBody || "Ciao {{firstName}},\n\nbenvenuto a {{eventTitle}}.",
    },
  ];
  return fallback;
}

// ── TemplateCard ──────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  groups,
  onEdit,
  onDelete,
  onSend,
}: {
  template: Template;
  groups: EventGroup[];
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
}) {
  const group = groups.find((g) => g.id === template.groupId);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{template.name}</h4>
          <p className="text-xs text-gray-500 truncate mt-0.5">{template.subject}</p>
        </div>
        {group && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
            {group.name}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 line-clamp-2 mb-3">
        {summarizeTemplateBody(template.body)}
      </p>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1" />Modifica
        </Button>
        <Button size="sm" className="h-7 text-xs flex-1" onClick={onSend}>
          <Send className="h-3 w-3 mr-1" />Invia
        </Button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-300 hover:text-red-400 rounded transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── CategorySection ───────────────────────────────────────────────────────────

function CategorySection({
  category,
  templates,
  groups,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onSendTemplate,
}: {
  category: (typeof EMAIL_CATEGORIES)[number];
  templates: Template[];
  groups: EventGroup[];
  onCreateTemplate: () => void;
  onEditTemplate: (t: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onSendTemplate: (t: Template) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = category.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${category.bg}`}>
            <Icon className={`h-4 w-4 ${category.color}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{category.label}</h3>
            <p className="text-xs text-gray-400">{category.description}</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">
            {templates.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={onCreateTemplate}
          >
            <Plus className="h-3.5 w-3.5" />
            Nuova email
          </Button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.length === 0 ? (
            <div className="col-span-3 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
              Nessuna email in questa categoria. Clicca &quot;Nuova email&quot; per iniziare.
            </div>
          ) : (
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                groups={groups}
                onEdit={() => onEditTemplate(template)}
                onDelete={() => onDeleteTemplate(template.id)}
                onSend={() => onSendTemplate(template)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main EmailsClient ─────────────────────────────────────────────────────────

export function EmailsClient({
  eventId,
  eventTitle,
  templates: initialTemplates,
  statusCounts,
  groups,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromFlow = searchParams.get("fromFlow") === "1";
  const requestedPathId = searchParams.get("pathId") ?? "";
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [registrationPaths, setRegistrationPaths] = useState<RegistrationPath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState("");
  const [savingPathEmails, setSavingPathEmails] = useState(false);

  // Group tab state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  // Which category is being created for (used to pre-fill modal)
  const [creatingCategory, setCreatingCategory] = useState<string>("manual");

  const [sendOpen, setSendOpen] = useState(false);
  const [sendMode, setSendMode] = useState<"reminder" | "custom" | "template">("template");
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendFilter, setSendFilter] = useState<string[]>(["CONFIRMED", "PENDING"]);
  const [sendGroupFilter, setSendGroupFilter] = useState<string[]>([]);
  const [sendCreatedAfter, setSendCreatedAfter] = useState("");
  const [sendCreatedBefore, setSendCreatedBefore] = useState("");
  const [sendDryRun, setSendDryRun] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendRecipientType, setSendRecipientType] = useState<"all" | "specific" | "internal">(
    "all"
  );
  const [sendSpecificEmail, setSendSpecificEmail] = useState("");
  const [sendDeliveryMode, setSendDeliveryMode] = useState<DeliveryMode>("MANUAL");
  const [sendIncludeUnsubscribe, setSendIncludeUnsubscribe] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Partial<Template>>({});
  const [builder, setBuilder] = useState<EmailBuilderPayload>(
    createDefaultBuilderPayload(eventTitle)
  );
  const [builderStep, setBuilderStep] = useState<BuilderStep>("DETAILS");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("INVITE");
  const [versionNote, setVersionNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const deleteTarget = templates.find((t) => t.id === deleteTargetId) ?? null;

  // Campaign metrics
  type CampaignTotals = {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    avgOpenRate: number;
    avgClickRate: number;
  };
  const [campaignTotals, setCampaignTotals] = useState<CampaignTotals | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/emails/campaigns`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.totals) setCampaignTotals(d.totals);
      })
      .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/paths`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: { paths?: RegistrationPath[] }) => {
        const paths = Array.isArray(data.paths) ? data.paths : [];
        setRegistrationPaths(paths);
        if (requestedPathId && paths.some((path) => path.id === requestedPathId)) {
          setSelectedPathId(requestedPathId);
        } else if (paths.length) {
          setSelectedPathId(paths[0].id);
        }
      })
      .catch(() => {
        setRegistrationPaths([]);
      });
  }, [eventId, requestedPathId]);

  useEffect(() => {
    if (!requestedPathId) return;
    if (registrationPaths.some((path) => path.id === requestedPathId)) {
      setSelectedPathId(requestedPathId);
    }
  }, [registrationPaths, requestedPathId]);

  const totalRecipients =
    sendRecipientType === "specific"
      ? sendSpecificEmail.includes("@")
        ? 1
        : 0
      : sendRecipientType === "internal"
        ? 1
        : sendFilter.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);
  const editBuilderVersions = builder.versions ?? [];
  const selectedPath =
    registrationPaths.find((path) => path.id === selectedPathId) ?? null;

  const previewVars = useMemo(() => {
    if (previewMode === "REMINDER")
      return {
        firstName: "Andrea",
        lastName: "Milanino",
        eventTitle: `${eventTitle} · Reminder`,
      };
    if (previewMode === "UPDATE")
      return { firstName: "Giulia", lastName: "Rossi", eventTitle: `${eventTitle} · Update` };
    return { firstName: "Marco", lastName: "Bianchi", eventTitle };
  }, [previewMode, eventTitle]);

  const previewHtml = useMemo(
    () => renderBuilderContentHtml(builder, previewVars),
    [builder, previewVars]
  );

  // Filtered templates by selected group tab
  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) => {
        if (selectedGroupId === null) return true;
        return t.groupId === selectedGroupId || t.groupId === null;
      }),
    [templates, selectedGroupId]
  );

  function toggleStatusFilter(status: string) {
    setSendFilter((current) =>
      current.includes(status) ? current.filter((x) => x !== status) : [...current, status]
    );
  }

  function toggleGroupFilter(groupId: string) {
    setSendGroupFilter((current) =>
      current.includes(groupId)
        ? current.filter((x) => x !== groupId)
        : [...current, groupId]
    );
  }

  function openNewTemplate(categoryId: string) {
    setCreatingCategory(categoryId);
    setEditTemplate({
      type: "CUSTOM",
      name: "",
      subject: `Invito — ${eventTitle}`,
      category: categoryId,
      groupId: selectedGroupId,
    });
    setBuilder(createDefaultBuilderPayload(eventTitle));
    setBuilderStep("DETAILS");
    setVersionNote("");
    setPreviewMode("INVITE");
    setEditOpen(true);
  }

  function openEditTemplate(tmpl: Template) {
    setCreatingCategory(tmpl.category ?? "manual");
    setEditTemplate(tmpl);
    const parsed = parseTemplateOrDefault(tmpl.body, eventTitle);
    setBuilder(parsed);
    setBuilderStep("DETAILS");
    setVersionNote("");
    setPreviewMode("INVITE");
    setEditOpen(true);
  }

  function openSendModal(tmpl: Template) {
    setSendMode("template");
    setSendTemplateId(tmpl.id);
    setSendOpen(true);
  }

  function applyAudienceFromTemplate() {
    if (!sendTemplateId) return;
    const tmpl = templates.find((t) => t.id === sendTemplateId);
    if (!tmpl) return;
    const parsed = parseBuilderPayload(tmpl.body);
    if (!parsed) return;
    setSendFilter(parsed.audience.statuses.length ? parsed.audience.statuses : ["CONFIRMED", "PENDING"]);
    setSendGroupFilter(parsed.audience.groupIds ?? []);
    toast("Regole audience del template applicate", { variant: "success" });
  }

  function updatePathEmail(key: keyof RegistrationPathEmailMap, value: string) {
    if (!selectedPath) return;
    setRegistrationPaths((current) =>
      current.map((path) =>
        path.id === selectedPath.id
          ? {
              ...path,
              emailTemplateIds: {
                ...path.emailTemplateIds,
                [key]: value || null,
              },
            }
          : path
      )
    );
  }

  async function savePathAssignments() {
    setSavingPathEmails(true);
    try {
      const res = await fetch(`/api/events/${eventId}/paths`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: registrationPaths }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const paths = Array.isArray(data.paths) ? data.paths : [];
      setRegistrationPaths(paths);
      toast("Assegnazioni email percorso salvate", { variant: "success" });
    } catch {
      toast("Errore nel salvataggio assegnazioni", { variant: "error" });
    } finally {
      setSavingPathEmails(false);
    }
  }

  async function sendEmails() {
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        recipientType: sendRecipientType,
        specificEmail: sendRecipientType === "specific" ? sendSpecificEmail : undefined,
        statusFilter: sendFilter,
        deliveryMode: sendGroupFilter.length ? "CONDITIONAL" : sendDeliveryMode,
        conditions: {
          statuses: sendFilter,
          groupIds: sendGroupFilter,
          createdAfter: sendCreatedAfter || undefined,
          createdBefore: sendCreatedBefore || undefined,
        },
        dryRun: sendDryRun,
        includeUnsubscribe: sendIncludeUnsubscribe,
      };

      if (sendMode === "reminder") payload.type = "reminder";
      else if (sendMode === "template") payload.templateId = sendTemplateId;
      else {
        payload.type = "custom";
        payload.subject = sendSubject;
        payload.body = sendBody;
      }

      const res = await fetch(`/api/events/${eventId}/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Errore invio email", { variant: "error" });
        return;
      }

      if (data.dryRun) {
        toast(`Dry-run completata: ${data.matched} destinatari`, { variant: "success" });
      } else {
        toast(`${data.sent} email inviate`, { variant: "success" });
      }
      setSendOpen(false);
    } catch {
      toast("Errore di connessione", { variant: "error" });
    } finally {
      setSending(false);
    }
  }

  async function saveTemplate() {
    if (!editTemplate.name || !editTemplate.subject) {
      toast("Nome e oggetto sono obbligatori", { variant: "error" });
      return;
    }
    if (!builder.blocks.length) {
      toast("Aggiungi almeno un blocco", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const withVersion = appendBuilderVersion(builder, versionNote.trim() || undefined);
      const payload = {
        ...editTemplate,
        body: serializeBuilderPayload(withVersion),
        category: editTemplate.category ?? creatingCategory ?? "manual",
        groupId: editTemplate.groupId ?? null,
        includeUnsubscribe: editTemplate.includeUnsubscribe ?? false,
      };
      const isNew = !editTemplate.id;
      const url = isNew
        ? `/api/events/${eventId}/emails`
        : `/api/events/${eventId}/emails/${editTemplate.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Errore salvataggio", { variant: "error" });
        return;
      }

      if (isNew) setTemplates((prev) => [data, ...prev]);
      else setTemplates((prev) => prev.map((x) => (x.id === data.id ? data : x)));

      toast(isNew ? "Template creato" : "Template aggiornato", { variant: "success" });
      setEditOpen(false);
      setVersionNote("");
    } catch {
      toast("Errore di connessione", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplateById(id: string) {
    const res = await fetch(`/api/events/${eventId}/emails/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Errore eliminazione", { variant: "error" });
      return;
    }
    setTemplates((prev) => prev.filter((x) => x.id !== id));
    setDeleteTargetId(null);
    toast("Template eliminato", { variant: "success" });
  }

  return (
    <>
      {fromFlow && (
        <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-2 bg-indigo-600 text-white text-sm">
          <button
            onClick={() => {
              const ret = sessionStorage.getItem("phorma_flow_return");
              if (ret) {
                try {
                  const { eventId: evId } = JSON.parse(ret) as { eventId: string };
                  router.push(`/events/${evId}/flow`);
                  return;
                } catch {
                  /* fallthrough */
                }
              }
              router.push(`/events/${eventId}/flow`);
            }}
            className="flex items-center gap-1.5 font-medium hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna al Flow Builder
          </button>
          <span className="text-indigo-300">·</span>
          <span className="text-indigo-200">Stai modificando i template da un nodo Flow</span>
        </div>
      )}

      <div className="p-6 max-w-7xl space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-500" />
              Comunicazioni email
            </h1>
            <p className="text-sm text-gray-500">{eventTitle}</p>
          </div>
          <Button
            onClick={() => {
              setSendMode("reminder");
              setSendFilter(["CONFIRMED", "PENDING"]);
              setSendDeliveryMode("MANUAL");
              setSendOpen(true);
            }}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Invia email
          </Button>
        </div>

        {/* Registration status metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p
                className={`text-xs font-medium mt-1 inline-flex px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}
              >
                {STATUS_LABELS[status] ?? status}
              </p>
            </div>
          ))}
        </div>

        {/* Campaign tracking metrics */}
        {campaignTotals && campaignTotals.totalSent > 0 && (
          <div className="bg-gradient-to-r from-sky-50 to-white rounded-xl border border-sky-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-sky-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-sky-500" />
                Metriche campagne email
              </p>
              <p className="text-xs text-sky-600">
                {campaignTotals.totalSent} email inviate totali
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Open rate medio",
                  value: `${campaignTotals.avgOpenRate}%`,
                  sub: `${campaignTotals.totalOpened} aperture`,
                  good: campaignTotals.avgOpenRate >= 30,
                  ok: campaignTotals.avgOpenRate >= 15,
                },
                {
                  label: "Click rate medio",
                  value: `${campaignTotals.avgClickRate}%`,
                  sub: `${campaignTotals.totalClicked} click`,
                  good: campaignTotals.avgClickRate >= 5,
                  ok: campaignTotals.avgClickRate >= 2,
                },
                {
                  label: "Email con bounce",
                  value: `${
                    campaignTotals.totalSent > 0
                      ? Math.round(
                          ((campaignTotals.totalSent -
                            campaignTotals.totalOpened -
                            campaignTotals.totalClicked) /
                            campaignTotals.totalSent) *
                            100
                        )
                      : 0
                  }%`,
                  sub: "stima non aperte",
                  good: false,
                  ok: true,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-white rounded-lg border border-sky-100 p-3 text-center"
                >
                  <p
                    className={`text-xl font-bold ${m.good ? "text-green-600" : m.ok ? "text-yellow-600" : "text-red-600"}`}
                  >
                    {m.value}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{m.label}</p>
                  <p className="text-[10px] text-gray-400">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => setSelectedGroupId(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedGroupId === null
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
            Tutti i gruppi
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedGroupId === g.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Category sections */}
        {EMAIL_CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            templates={filteredTemplates.filter((t) => (t.category ?? "manual") === cat.id)}
            groups={groups}
            onCreateTemplate={() => openNewTemplate(cat.id)}
            onEditTemplate={openEditTemplate}
            onDeleteTemplate={(id) => setDeleteTargetId(id)}
            onSendTemplate={openSendModal}
          />
        ))}

        {/* Registration paths section (kept for flow integration) */}
        {registrationPaths.length > 0 && (
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-cyan-900">Email per percorso</p>
                <p className="text-xs text-cyan-800/80">
                  Associa i template chiave a ogni tipo di registrazione.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPathId}
                  onChange={(e) => setSelectedPathId(e.target.value)}
                  className="h-8 rounded-lg border border-cyan-200 bg-white px-2.5 text-xs"
                >
                  {registrationPaths.map((path) => (
                    <option key={path.id} value={path.id}>
                      {path.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={savePathAssignments}
                  disabled={savingPathEmails}
                  className="h-8 gap-1.5"
                >
                  {savingPathEmails && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salva
                </Button>
              </div>
            </div>

            {selectedPath && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-200 bg-white/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-cyan-900">{selectedPath.name}</p>
                    <p className="text-xs text-cyan-900/75">
                      Qui definisci le email standard del percorso selezionato.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                      <Link href={`/events/${eventId}/form?pathId=${selectedPath.id}`}>
                        Vai al form del percorso
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                      <Link href={`/events/${eventId}/flow?pathId=${selectedPath.id}`}>
                        Vai al flow del percorso
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["inviteTemplateId", "Invito"],
                    ["confirmationTemplateId", "Conferma registrazione"],
                    ["waitlistTemplateId", "Conferma waitlist"],
                    ["reminderTemplateId", "Promemoria"],
                    ["updateTemplateId", "Aggiornamento"],
                    ["followupTemplateId", "Follow-up"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-gray-700">{label}</label>
                      <select
                        value={String(
                          selectedPath.emailTemplateIds[
                            key as keyof RegistrationPathEmailMap
                          ] ?? ""
                        )}
                        onChange={(e) =>
                          updatePathEmail(key as keyof RegistrationPathEmailMap, e.target.value)
                        }
                        className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs"
                      >
                        <option value="">Nessun template assegnato</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Send modal ──────────────────────────────────────────────────────── */}
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-4 w-4 text-cyan-500" />
                Invia email
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Chi riceve?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "all", icon: "👥", label: "Tutti i\npartecipanti" },
                    { value: "specific", icon: "👤", label: "Destinatario\nspecifico" },
                    { value: "internal", icon: "🏢", label: "Team\ninterno" },
                  ].map(({ value, icon, label }) => (
                    <button
                      key={value}
                      onClick={() =>
                        setSendRecipientType(value as typeof sendRecipientType)
                      }
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        sendRecipientType === value
                          ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-xs text-center leading-tight whitespace-pre-line">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  {sendRecipientType === "all" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">
                          Filtra per status
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(STATUS_LABELS).map(([status, lbl]) => (
                            <button
                              key={status}
                              onClick={() => toggleStatusFilter(status)}
                              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                                sendFilter.includes(status)
                                  ? "border-cyan-300 bg-cyan-50 text-cyan-700"
                                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                              }`}
                            >
                              {lbl}
                              <span className="text-[10px] opacity-70">
                                ({statusCounts[status] ?? 0})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {groups.length > 0 && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">
                            Filtra per guest group (opzionale)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {groups.map((g) => (
                              <button
                                key={g.id}
                                onClick={() => toggleGroupFilter(g.id)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  sendGroupFilter.includes(g.id)
                                    ? "border-violet-300 bg-violet-50 text-violet-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                }`}
                              >
                                {g.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-400">
                        {totalRecipients} destinatari selezionati
                        {sendGroupFilter.length > 0 && " · filtro gruppo attivo"}
                      </p>
                    </div>
                  )}

                  {sendRecipientType === "specific" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        Email del destinatario
                      </label>
                      <Input
                        type="email"
                        placeholder="mario.rossi@example.com"
                        value={sendSpecificEmail}
                        onChange={(e) => setSendSpecificEmail(e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Può essere un partecipante, un ospite o qualsiasi indirizzo email.
                      </p>
                    </div>
                  )}

                  {sendRecipientType === "internal" && (
                    <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
                      <Bell className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Team interno</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          L&apos;email sarà inviata all&apos;indirizzo email
                          dell&apos;organizzatore configurato per questo evento.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100" />

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Cosa invii?
                </label>
                <div className="flex gap-2 mb-3">
                  {[
                    { value: "template", label: "Template" },
                    { value: "reminder", label: "Promemoria" },
                    { value: "custom", label: "Testo libero" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSendMode(value as typeof sendMode)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        sendMode === value
                          ? "border-gray-400 bg-gray-100 text-gray-800"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {sendMode === "template" && (
                  <div className="flex gap-2">
                    <select
                      value={sendTemplateId}
                      onChange={(e) => setSendTemplateId(e.target.value)}
                      className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="">Scegli un template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {sendTemplateId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyAudienceFromTemplate}
                      >
                        Usa regole
                      </Button>
                    )}
                  </div>
                )}

                {sendMode === "reminder" && (
                  <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700">
                    Promemoria standard con info evento e codice registrazione.
                  </div>
                )}

                {sendMode === "custom" && (
                  <div className="space-y-2">
                    <Input
                      value={sendSubject}
                      onChange={(e) => setSendSubject(e.target.value)}
                      placeholder="Oggetto email"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {PLACEHOLDERS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSendBody((b) => b + p)}
                          className="text-[10px] font-mono bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 px-1.5 py-0.5 rounded"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={5}
                      value={sendBody}
                      onChange={(e) => setSendBody(e.target.value)}
                      placeholder="Scrivi il tuo messaggio..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendIncludeUnsubscribe}
                  onChange={(e) => setSendIncludeUnsubscribe(e.target.checked)}
                  className="rounded"
                />
                Includi link disiscrizione (consigliato per eventi B2C)
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendDryRun}
                  onChange={(e) => setSendDryRun(e.target.checked)}
                  className="rounded"
                />
                Dry-run (anteprima destinatari senza invio)
              </label>
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setSendOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={sendEmails}
                disabled={
                  sending ||
                  totalRecipients === 0 ||
                  (sendRecipientType === "specific" && !sendSpecificEmail.includes("@"))
                }
                className="gap-2"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {sendDryRun
                  ? "Calcola destinatari"
                  : sendRecipientType === "specific"
                    ? `Invia a ${sendSpecificEmail || "—"}`
                    : sendRecipientType === "internal"
                      ? "Invia al team"
                      : `Invia a ${totalRecipients}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit / create template modal ───────────────────────────────────── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-cyan-500" />
                {editTemplate.id ? "Modifica template" : "Nuovo template"} — Builder evento
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "DETAILS", label: "1. Base template" },
                { id: "RECIPIENTS", label: "2. Audience" },
                { id: "DESIGN", label: "3. Builder" },
              ].map((step) => (
                <button
                  key={step.id}
                  onClick={() => setBuilderStep(step.id as BuilderStep)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    builderStep === step.id
                      ? "border-cyan-300 bg-cyan-50 text-cyan-700"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>

            {builderStep === "DESIGN" ? (
              <EmailCanvasBuilder
                builder={builder}
                setBuilder={setBuilder}
                eventTitle={eventTitle}
              />
            ) : (
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                {builderStep === "DETAILS" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-[rgba(109,98,243,0.12)] bg-[rgba(109,98,243,0.05)] px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Imposta il template e vedi subito il risultato
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        I builder più semplici tengono contenuto e preview insieme. Qui
                        l&apos;anteprima si aggiorna in tempo reale mentre modifichi il template.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Nome template
                        </label>
                        <Input
                          value={editTemplate.name ?? ""}
                          onChange={(e) =>
                            setEditTemplate((t) => ({ ...t, name: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Oggetto
                        </label>
                        <Input
                          value={editTemplate.subject ?? ""}
                          onChange={(e) =>
                            setEditTemplate((t) => ({ ...t, subject: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Categoria</label>
                        <select
                          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                          value={editTemplate.category ?? "manual"}
                          onChange={(e) =>
                            setEditTemplate((t) => ({ ...t, category: e.target.value }))
                          }
                        >
                          {EMAIL_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Gruppo destinatario
                        </label>
                        <select
                          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                          value={editTemplate.groupId ?? ""}
                          onChange={(e) =>
                            setEditTemplate((t) => ({
                              ...t,
                              groupId: e.target.value || null,
                            }))
                          }
                        >
                          <option value="">Tutti i gruppi</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Stato template
                        </label>
                        <select
                          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                          value={builder.status}
                          onChange={(e) =>
                            setBuilder((prev) => ({
                              ...prev,
                              status: e.target.value as BuilderStatus,
                            }))
                          }
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="APPROVED">APPROVED</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Nota versione
                        </label>
                        <Input
                          value={versionNote}
                          onChange={(e) => setVersionNote(e.target.value)}
                          placeholder="es. versione finale legal"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editTemplate.includeUnsubscribe ?? false}
                        onChange={(e) =>
                          setEditTemplate((t) => ({ ...t, includeUnsubscribe: e.target.checked }))
                        }
                        className="rounded"
                      />
                      Includi link disiscrizione nelle email inviate con questo template
                    </label>
                    <div className="max-h-24 overflow-auto rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
                      {editBuilderVersions.length === 0 && (
                        <p>Nessuna versione salvata</p>
                      )}
                      {editBuilderVersions
                        .slice()
                        .reverse()
                        .map((v, idx) => (
                          <p key={`${v.at}-${idx}`}>
                            {new Date(v.at).toLocaleString("it-IT")} · {v.status}
                            {v.note ? ` · ${v.note}` : ""}
                          </p>
                        ))}
                    </div>
                  </div>
                )}

                {builderStep === "RECIPIENTS" && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Definisci l&apos;audience del template in modo semplice: chi lo riceve di
                      default e su quali gruppi si applica.
                    </p>
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Status default
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(STATUS_LABELS).map(([status, label]) => {
                          const active = builder.audience.statuses.includes(status);
                          return (
                            <button
                              key={status}
                              onClick={() =>
                                setBuilder((prev) => ({
                                  ...prev,
                                  audience: {
                                    ...prev.audience,
                                    statuses: active
                                      ? prev.audience.statuses.filter((x) => x !== status)
                                      : [...prev.audience.statuses, status],
                                  },
                                }))
                              }
                              className={`text-xs px-2.5 py-1 rounded-full border ${
                                active
                                  ? "border-cyan-300 bg-cyan-100 text-cyan-700"
                                  : "border-gray-200 bg-white text-gray-600"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Gruppi default
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {groups.length === 0 && (
                          <span className="text-xs text-gray-500">
                            Nessun gruppo configurato
                          </span>
                        )}
                        {groups.map((g) => {
                          const active = builder.audience.groupIds.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              onClick={() =>
                                setBuilder((prev) => ({
                                  ...prev,
                                  audience: {
                                    ...prev.audience,
                                    groupIds: active
                                      ? prev.audience.groupIds.filter((x) => x !== g.id)
                                      : [...prev.audience.groupIds, g.id],
                                  },
                                }))
                              }
                              className={`text-xs px-2.5 py-1 rounded-full border ${
                                active
                                  ? "border-cyan-300 bg-cyan-100 text-cyan-700"
                                  : "border-gray-200 bg-white text-gray-600"
                              }`}
                            >
                              {g.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Anteprima live
                    </CardTitle>
                    <select
                      className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs"
                      value={previewMode}
                      onChange={(e) => setPreviewMode(e.target.value as PreviewMode)}
                    >
                      <option value="INVITE">Invito</option>
                      <option value="REMINDER">Promemoria</option>
                      <option value="UPDATE">Aggiornamento</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-[rgba(109,98,243,0.12)] bg-[rgba(109,98,243,0.05)] px-3 py-2 text-[11px] text-slate-600">
                    L&apos;anteprima si aggiorna in tempo reale mentre modifichi blocchi,
                    branding, immagini e font.
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 min-h-[560px]">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                </CardContent>
              </Card>
            </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Annulla
              </Button>
              <Button onClick={saveTemplate} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salva template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete confirm modal ────────────────────────────────────────────── */}
        <Dialog
          open={!!deleteTargetId}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Elimina template</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Confermi l&apos;eliminazione di <strong>{deleteTarget?.name}</strong>?
              L&apos;azione è irreversibile.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteTargetId && deleteTemplateById(deleteTargetId)}
              >
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
