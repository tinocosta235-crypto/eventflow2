"use client";
import { useState } from "react";
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
}

interface Props {
  eventSlug: string;
  formFields: FormField[];
  isFull: boolean;
}

type SuccessData = {
  status: "PENDING" | "WAITLIST";
  registrationCode: string;
  message: string;
};

export function RegisterForm({ eventSlug, formFields, isFull }: Props) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    phone: "", company: "", jobTitle: "",
  });
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setCustom = (id: string, v: string) => setCustomFields((f) => ({ ...f, [id]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      setError("Nome, cognome e email sono obbligatori");
      return;
    }

    // Validate required custom fields
    for (const field of formFields) {
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
        body: JSON.stringify({ ...form, customFields }),
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
            Conserva questo codice — ti servirà per il check-in all&apos;evento.
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefono</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+39 02..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Azienda</label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Opzionale" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ruolo / Posizione</label>
            <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Opzionale" />
          </div>

          {/* Custom fields */}
          {formFields.map((field) => {
            const opts = field.options ? (JSON.parse(field.options) as string[]) : [];
            return (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "select" ? (
                  <select
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="pt-2">
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isFull ? "Iscriviti alla lista d'attesa" : "Registrati"}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400">
            I tuoi dati saranno trattati esclusivamente per la gestione di questo evento.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
