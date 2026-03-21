"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import * as XLSX from "xlsx";

interface PreviewRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status?: string;
  valid: boolean;
  error?: string;
}

interface Props {
  file: File;
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD_MAP: Record<string, string> = {
  "nome*": "firstName", nome: "firstName",
  "cognome*": "lastName", cognome: "lastName",
  "email*": "email", email: "email",
  telefono: "phone", azienda: "company",
  ruolo: "jobTitle", stato: "status",
  pagamento: "paymentStatus", prezzo: "ticketPrice", note: "notes",
};

export function ImportPreviewModal({ file, eventId, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

        const parsed: PreviewRow[] = raw.map((row) => {
          const p: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            const mapped = FIELD_MAP[k.toLowerCase().trim()];
            if (mapped) p[mapped] = String(v).trim();
          }
          const valid = !!(p.email && p.firstName && p.lastName);
          return {
            firstName: p.firstName || "—",
            lastName: p.lastName || "—",
            email: p.email || "—",
            phone: p.phone,
            company: p.company,
            status: p.status,
            valid,
            error: !valid ? "Nome, cognome o email mancanti" : undefined,
          };
        });
        setRows(parsed);
      } catch {
        setRows([]);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  async function confirmImport() {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);
      const res = await fetch("/api/participants/import-file", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Importati ${data.imported} partecipanti`, { variant: "success" });
      onSuccess();
    } catch (e: unknown) {
      toast((e as Error).message || "Errore importazione", { variant: "error" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Anteprima importazione</h2>
            <p className="text-xs text-gray-400 mt-0.5">{file.name}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {parsing ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
              <p className="text-gray-500">Analisi del file in corso...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
                  <p className="text-xs text-green-600">Pronti per importazione</p>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{invalidRows.length}</p>
                    <p className="text-xs text-red-600">Righe con errori (saltate)</p>
                  </div>
                )}
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{rows.length}</p>
                  <p className="text-xs text-gray-600">Totale righe</p>
                </div>
              </div>

              {/* Errors */}
              {invalidRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Righe con errori</span>
                  </div>
                  <div className="space-y-1">
                    {invalidRows.map((r, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Riga {rows.indexOf(r) + 2}: {r.firstName} {r.lastName} — {r.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Anteprima ({Math.min(validRows.length, 10)} di {validRows.length})</p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {["", "Nome", "Cognome", "Email", "Azienda", "Stato"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {validRows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">{r.firstName}</td>
                          <td className="px-3 py-2 text-gray-700">{r.lastName}</td>
                          <td className="px-3 py-2 text-gray-500">{r.email}</td>
                          <td className="px-3 py-2 text-gray-500">{r.company || "—"}</td>
                          <td className="px-3 py-2">
                            {r.status ? <Badge variant="secondary">{r.status}</Badge> : <span className="text-gray-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 10 && (
                    <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                      ... e altri {validRows.length - 10} partecipanti
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            onClick={confirmImport}
            disabled={importing || parsing || validRows.length === 0}
            className="gap-2"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importa {validRows.length} partecipanti
          </Button>
        </div>
      </div>
    </div>
  );
}
