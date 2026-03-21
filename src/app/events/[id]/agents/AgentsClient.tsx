"use client"

import { Header } from "@/components/layout/header"
import { Bot, Zap } from "lucide-react"
import {
  ScoreMonitorAgent,
  EmailDraftAgent,
  ReportAgent,
  EmailTrackerAgent,
  ProposalsQueue,
  FormAuditAgent,
} from "../analytics/AgentsPanel"

export default function AgentsClient({
  eventId,
  eventTitle,
}: {
  eventId: string
  eventTitle: string
}) {
  return (
    <>
      <Header
        title="Agenti AI"
        subtitle={eventTitle}
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: "rgba(112,96,204,0.08)", borderColor: "rgba(112,96,204,0.18)" }}>
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>Powered by Claude</span>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Intro banner */}
        <div
          className="rounded-2xl border px-6 py-5 flex items-start gap-4"
          style={{ background: "rgba(112,96,204,0.06)", borderColor: "rgba(112,96,204,0.16)" }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(112,96,204,0.14)", color: "var(--accent)" }}
          >
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Team Agenti Phorma
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Ogni agente analizza il tuo evento e propone azioni concrete. Le proposte richiedono
              approvazione prima di essere eseguite. Puoi eseguire gli agenti in qualsiasi momento.
            </p>
          </div>
        </div>

        {/* Proposals Queue — prominente in cima */}
        <ProposalsQueue eventId={eventId} />

        {/* Agents grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ScoreMonitorAgent eventId={eventId} />
          <EmailDraftAgent eventId={eventId} />
        </div>

        <EmailTrackerAgent eventId={eventId} />
        <ReportAgent eventId={eventId} />
        <FormAuditAgent eventId={eventId} />
      </div>
    </>
  )
}
