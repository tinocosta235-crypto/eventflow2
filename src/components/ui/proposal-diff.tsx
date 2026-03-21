"use client"

// ProposalDiff — visualizzazione before/after per proposte di modifica masterlist
// Verde = aggiunto/confermato, Giallo = modificato, Rosso = rimosso/cancellato

import type { MasterlistChange } from "@/app/api/events/[id]/ai/agents/report/route"

const FIELD_LABELS: Record<string, string> = {
  status: "Stato",
  notes: "Note",
  groupId: "Gruppo",
  company: "Azienda",
  jobTitle: "Ruolo",
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "text-green-700 font-semibold",
  PENDING: "text-yellow-700",
  CANCELLED: "text-red-600",
  WAITLISTED: "text-blue-600",
}

function ValueBadge({ value, field }: { value: string; field: string }) {
  if (field === "status") {
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${STATUS_COLORS[value] ?? "text-gray-700"}`}>
        {value || "—"}
      </span>
    )
  }
  return <span className="text-xs font-mono text-gray-700">{value || <em className="text-gray-400">vuoto</em>}</span>
}

function getDiffRowColor(before: string, after: string): string {
  if (!before && after) return "bg-green-50 border-l-2 border-green-400"
  if (before && !after) return "bg-red-50 border-l-2 border-red-400"
  if (before !== after) return "bg-yellow-50 border-l-2 border-yellow-400"
  return "bg-gray-50"
}

export function ProposalDiff({ changes }: { changes: MasterlistChange[] }) {
  if (!changes || changes.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Modifiche proposte alla masterlist ({changes.length})
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Partecipante</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Campo</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Prima</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Dopo</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Motivazione</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change, i) => (
              <tr
                key={i}
                className={`border-b border-gray-50 ${getDiffRowColor(change.before, change.after)}`}
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900">{change.firstName} {change.lastName}</div>
                  <div className="text-gray-400 text-[10px]">{change.email}</div>
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {FIELD_LABELS[change.field] ?? change.field}
                </td>
                <td className="px-3 py-2">
                  <ValueBadge value={change.before} field={change.field} />
                </td>
                <td className="px-3 py-2">
                  <ValueBadge value={change.after} field={change.field} />
                </td>
                <td className="px-3 py-2 text-gray-500 italic">{change.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
