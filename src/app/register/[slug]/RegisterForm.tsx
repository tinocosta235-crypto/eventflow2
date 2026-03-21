"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";

interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder?: string | null;
  required: boolean;
  options?: string | null;
  conditions?: string | null;
}

interface EventGroup {
  id: string;
  name: string;
  color?: string;
}

interface RegistrationPath {
  id: string;
  name: string;
  description: string;
  groupId: string | null;
  active: boolean;
}

interface SessionItem {
  id: string;
  title: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  groupId: string | null;
}

interface Props {
  eventSlug: string;
  formFields: FormField[];
  groups: EventGroup[];
  registrationPaths: RegistrationPath[];
  initialPathId?: string;
  sessionsEnabled: boolean;
  sessions: SessionItem[];
  isFull: boolean;
}

type SuccessData = {
  status: "PENDING" | "WAITLIST";
  registrationCode: string;
  message: string;
};

type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "is_empty" | "is_not_empty" | "greater_than" | "less_than";
type ConditionRule = { fieldId: string; operator: ConditionOperator; value: string };
type FieldConditions = {
  visibility?: { mode: "ALL" | "GROUPS"; groupIds: string[] };
  // new multi-rule format
  showIf?: { logic: "AND" | "OR"; rules: ConditionRule[] };
};

type FormValueScope = {
  standardFields: Record<string, string>;
  customFields: Record<string, string>;
};

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
        out.showIf = { logic: "AND", rules: [{ fieldId: s.fieldId as string, operator: (s.operator ?? "equals") as ConditionOperator, value: (s.value ?? "") as string }] };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function evalRule(rule: ConditionRule, scope: FormValueScope): boolean {
  const current = String(scope.customFields[rule.fieldId] ?? scope.standardFields[rule.fieldId] ?? "").trim().toLowerCase();
  const expected = String(rule.value ?? "").trim().toLowerCase();
  switch (rule.operator) {
    case "equals":       return current === expected;
    case "not_equals":   return current !== expected;
    case "contains":     return current.includes(expected);
    case "not_contains": return !current.includes(expected);
    case "is_empty":     return current === "";
    case "is_not_empty": return current !== "";
    case "greater_than": return parseFloat(current) > parseFloat(expected);
    case "less_than":    return parseFloat(current) < parseFloat(expected);
    default:             return true;
  }
}

function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function RegisterForm({ eventSlug, formFields, groups, registrationPaths, initialPathId, sessionsEnabled, sessions, isFull }: Props) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
  });
  const activePaths = registrationPaths.filter((path) => path.active !== false);
  const fixedPathId = activePaths.some((path) => path.id === initialPathId) ? String(initialPathId) : "";
  const pathSelectorEnabled = !fixedPathId && activePaths.length > 1 && formFields.some((field) => field.type === "registration_path");
  const [selectedPathId, setSelectedPathId] = useState<string>(fixedPathId || (activePaths[0]?.id ?? ""));
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [sessionSelections, setSessionSelections] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setCustom = (id: string, v: string) => setCustomFields((f) => ({ ...f, [id]: v }));
  const selectedPath = activePaths.find((path) => path.id === selectedPathId) ?? null;
  const selectedGroup = selectedPath?.groupId ?? groups[0]?.id ?? "";
  const standardFieldValues = useMemo(
    () => ({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
    }),
    [form]
  );

  useEffect(() => {
    if (fixedPathId && selectedPathId !== fixedPathId) {
      setSelectedPathId(fixedPathId);
    }
  }, [fixedPathId, selectedPathId]);

  const visibleFields = useMemo(() => {
    return formFields.filter((field) => {
      if (field.type === "registration_path") return pathSelectorEnabled;
      const cond = parseConditions(field.conditions);
      const vis = cond.visibility;
      if (vis?.mode === "GROUPS" && selectedGroup) {
        if (!vis.groupIds.includes(selectedGroup)) return false;
      }
      if (cond.showIf?.rules?.length) {
        const results = cond.showIf.rules.map((rule) =>
          evalRule(rule, {
            standardFields: standardFieldValues,
            customFields,
          })
        );
        const passes = cond.showIf.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
        if (!passes) return false;
      }
      return true;
    });
  }, [formFields, pathSelectorEnabled, selectedGroup, customFields, standardFieldValues]);

  const visibleSessions = useMemo(
    () => sessions.filter((s) => !s.groupId || s.groupId === selectedGroup),
    [sessions, selectedGroup]
  );

  useEffect(() => {
    const visibleFieldIds = new Set(visibleFields.map((field) => field.id));
    setCustomFields((current) => {
      const nextEntries = Object.entries(current).filter(([fieldId]) => visibleFieldIds.has(fieldId));
      if (nextEntries.length === Object.keys(current).length) return current;
      return Object.fromEntries(nextEntries);
    });
  }, [visibleFields]);

  useEffect(() => {
    const visibleSessionIds = new Set(visibleSessions.map((session) => session.id));
    setSessionSelections((current) => current.filter((sessionId) => visibleSessionIds.has(sessionId)));
  }, [visibleSessions]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      setError("Nome, cognome e email sono obbligatori");
      return;
    }
    for (const field of visibleFields) {
      if (field.type === "registration_path") continue;
      if (field.required && !customFields[field.id]) {
        setError(`Il campo "${field.label}" è obbligatorio`);
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/register/${eventSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pathId: selectedPathId || null,
          groupId: selectedGroup || null,
          customFields,
          sessionSelections,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore durante la registrazione");
        return;
      }
      setSuccess(data);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className={`border-2 ${success.status === "WAITLIST" ? "border-amber-200" : "border-green-200"}`}>
        <CardContent className="p-8 text-center">
          {success.status === "WAITLIST" ? (
            <>
              <Clock className="h-14 w-14 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">In lista d&apos;attesa!</h2>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Registrazione completata!</h2>
            </>
          )}
          <p className="text-gray-500 mb-4">{success.message}</p>
          <div className="bg-gray-50 rounded-xl p-3 inline-block">
            <p className="text-xs text-gray-400">Codice registrazione</p>
            <p className="font-mono font-bold text-gray-900 text-lg">{success.registrationCode}</p>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Conserva questo codice - ti servira per il check-in all&apos;evento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Registrati all&apos;evento</CardTitle>
        {isFull && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            L&apos;evento è al completo. Puoi comunque iscriverti alla lista d&apos;attesa.
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome <span className="text-red-500">*</span></label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Mario" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cognome <span className="text-red-500">*</span></label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Rossi" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="mario.rossi@azienda.it" required />
          </div>

          {visibleFields.map((field) => {
            const opts = parseOptions(field.options);
            return (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "registration_path" ? (
                  <>
                    <select
                      className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                      value={selectedPathId}
                      onChange={(e) => setSelectedPathId(e.target.value)}
                    >
                      {activePaths.map((path) => <option key={path.id} value={path.id}>{path.name}</option>)}
                    </select>
                    {selectedPath?.description && (
                      <p className="mt-1 text-xs text-gray-500">{selectedPath.description}</p>
                    )}
                  </>
                ) : field.type === "select" ? (
                  <select
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                    value={customFields[field.id] ?? ""}
                    onChange={(e) => setCustom(field.id, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Seleziona...</option>
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customFields[field.id] === "true"}
                      onChange={(e) => setCustom(field.id, e.target.checked ? "true" : "false")}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">{field.placeholder ?? field.label}</span>
                  </label>
                ) : field.type === "textarea" ? (
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={3}
                    placeholder={field.placeholder ?? ""}
                    value={customFields[field.id] ?? ""}
                    onChange={(e) => setCustom(field.id, e.target.value)}
                    required={field.required}
                  />
                ) : (
                  <Input
                    type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder ?? ""}
                    value={customFields[field.id] ?? ""}
                    onChange={(e) => setCustom(field.id, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            );
          })}

          {sessionsEnabled && visibleSessions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sessioni opzionali</label>
              <div className="space-y-2">
                {visibleSessions.map((s) => {
                  const checked = sessionSelections.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSessionSelections((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                          )
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.title || "Sessione"}</p>
                        <p className="text-xs text-gray-500">
                          {s.capacity ? `Capienza ${s.capacity}` : "Capienza libera"} · {s.waitlistEnabled ? "Waitlist attiva" : "No waitlist"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Proseguendo accetti i nostri{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              Termini di Servizio
            </a>{" "}
            e la nostra{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              Privacy Policy
            </a>
            .
          </p>

          <div className="pt-1">
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isFull ? "Iscriviti alla lista d'attesa" : "Registrati"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
