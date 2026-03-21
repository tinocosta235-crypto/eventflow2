"use client"

// ReportViewer — visualizza un ReportPayload con sezioni, stats e print CSS
// Il pulsante "Stampa PDF" usa window.print() con CSS print dedicato

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProposalDiff } from "@/components/ui/proposal-diff"
import type { ReportPayload } from "@/app/api/events/[id]/ai/agents/report/route"
import { Printer, ChevronDown, ChevronUp } from "lucide-react"

const RECIPIENT_LABELS: Record<string, string> = {
  cliente: "Cliente",
  team: "Team",
  fornitore: "Fornitore",
  interno: "Uso interno",
}

const TONE_COLORS: Record<string, string> = {
  formale: "bg-indigo-100 text-indigo-800",
  informale: "bg-green-100 text-green-800",
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-3 rounded border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-gray-600 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReportViewer({ report }: { report: ReportPayload }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(report.sections.map((s) => [s.id, true]))
  )

  function toggleSection(id: string) {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function printReport() {
    window.print()
  }

  const generatedDate = report.meta.generatedAt
    ? new Date(report.meta.generatedAt).toLocaleString("it-IT", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      })
    : ""

  return (
    <>
      {/* Print CSS — nasconde tutto tranne il report */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .phorma-report-print { display: block !important; }
          .phorma-report-no-print { display: none !important; }
          .phorma-report-print { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div className="phorma-report-print space-y-4">
        {/* Header report */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-5 text-white print:rounded-none print:bg-indigo-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-[11px] uppercase tracking-widest mb-1 font-semibold">
                Phorma — Report Evento
              </p>
              <h2 className="text-xl font-bold leading-tight">{report.meta.title}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-white/20 text-white border-0 text-[10px]">
                  {RECIPIENT_LABELS[report.meta.recipientType] ?? report.meta.recipientType}
                </Badge>
                <Badge className={`border-0 text-[10px] ${TONE_COLORS[report.meta.tone]}`}>
                  {report.meta.tone}
                </Badge>
                <span className="text-indigo-200 text-[11px]">{generatedDate}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={printReport}
              className="phorma-report-no-print gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20 flex-shrink-0"
            >
              <Printer className="h-3.5 w-3.5" />
              Stampa PDF
            </Button>
          </div>
        </div>

        {/* Snapshot stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Iscritti totali", value: String(report.eventSnapshot.total) },
            { label: "Confermati", value: String(report.eventSnapshot.confirmed), highlight: true },
            { label: "In pending", value: String(report.eventSnapshot.pending) },
            { label: "Check-in", value: String(report.eventSnapshot.checkedIn) },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border p-3 text-center ${s.highlight ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Score badge */}
        <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className={`text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center ${
            report.eventSnapshot.grade === "A" ? "bg-green-100 text-green-700" :
            report.eventSnapshot.grade === "B" ? "bg-blue-100 text-blue-700" :
            report.eventSnapshot.grade === "C" ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          }`}>
            {report.eventSnapshot.grade}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Score evento: {report.eventSnapshot.score}/100</p>
            <p className="text-xs text-gray-500">Calcolato su KPI registrazioni, email e check-in</p>
          </div>
        </div>

        {/* Sezioni */}
        {report.sections.map((section) => (
          <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              className="phorma-report-no-print w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
              {expandedSections[section.id]
                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />
              }
            </button>

            {/* Versione print: sempre visibile */}
            <div className="hidden print:block px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{section.title}</h3>
            </div>

            {expandedSections[section.id] && (
              <div className="px-5 pb-5 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                {section.dataTable && (
                  <DataTable headers={section.dataTable.headers} rows={section.dataTable.rows} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Diff masterlist */}
        {report.masterlistChanges.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Modifiche masterlist proposte dall&apos;agente
            </p>
            <ProposalDiff changes={report.masterlistChanges} />
          </div>
        )}
      </div>
    </>
  )
}
