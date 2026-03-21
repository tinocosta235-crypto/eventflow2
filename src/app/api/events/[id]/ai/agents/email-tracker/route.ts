// Email Tracker Agent — analizza le campagne email e propone azioni contestuali
// Usa claude-haiku per classificazione rapida a basso costo
// Output: analisi campagne + proposte invio follow-up salvate come AgentProposal
import { NextRequest, NextResponse } from "next/server";
import { requirePlanner } from "@/lib/auth-helpers";
import { anthropic, AGENT_MODELS } from "@/lib/ai";
import { buildEventAgentContext } from "@/lib/agent-context";
import { prisma } from "@/lib/db";
import type { CampaignMetrics } from "@/app/api/events/[id]/emails/campaigns/route";

// ── Tipi pubblici ──────────────────────────────────────────────────────────────

export interface CampaignIssue {
  subject: string;
  metric: string;      // "open_rate" | "click_rate" | "bounce_rate"
  value: number;       // valore corrente (%)
  benchmark: number;   // benchmark di riferimento (%)
  issue: string;       // descrizione del problema
  priority: "high" | "medium" | "low";
}

export interface FollowupProposal {
  campaignSubject: string;
  action: "send_reminder" | "resend_to_bounced" | "send_to_unopened" | "send_followup";
  targetDescription: string;  // "47 persone che non hanno aperto l'invito del 10 mar"
  targetCount: number;
  suggestedSubject: string;
  suggestedBody: string;
  scheduledAt: string | null; // ISO — null = invia subito
  urgency: "high" | "medium" | "low";
}

export interface EmailTrackerResult {
  issues: CampaignIssue[];
  followupProposals: FollowupProposal[];
  summary: string;
  priorityAction: string;
  campaignCount: number;
  totalSent: number;
  avgOpenRate: number;
}

// ── Tools Claude ──────────────────────────────────────────────────────────────

const tools: Parameters<typeof anthropic.messages.create>[0]["tools"] = [
  {
    name: "flag_campaign_issue",
    description: "Segnala un problema in una campagna email specifica",
    input_schema: {
      type: "object" as const,
      properties: {
        campaign_subject: { type: "string", description: "Oggetto della campagna con il problema" },
        metric: {
          type: "string",
          enum: ["open_rate", "click_rate", "bounce_rate"],
          description: "KPI problematica",
        },
        current_value: { type: "number", description: "Valore attuale (%)" },
        benchmark: { type: "number", description: "Benchmark di riferimento (%)" },
        issue: { type: "string", description: "Descrizione concisa del problema (max 15 parole)" },
        priority: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["campaign_subject", "metric", "current_value", "benchmark", "issue", "priority"],
    },
  },
  {
    name: "propose_followup",
    description: "Propone un'azione di follow-up per una campagna. Usare per azioni concrete e misurabili.",
    input_schema: {
      type: "object" as const,
      properties: {
        campaign_subject: { type: "string", description: "Oggetto della campagna di riferimento" },
        action: {
          type: "string",
          enum: ["send_reminder", "resend_to_bounced", "send_to_unopened", "send_followup"],
          description: "Tipo di azione",
        },
        target_description: {
          type: "string",
          description: "Descrizione precisa dei destinatari (es. '23 persone che non hanno aperto il reminder del 12 mar')",
        },
        target_count: { type: "number", description: "Numero stimato destinatari" },
        suggested_subject: { type: "string", description: "Oggetto email suggerito (max 70 caratteri)" },
        suggested_body: {
          type: "string",
          description: "Corpo email in italiano (max 150 parole). Usa {{firstName}} per personalizzazione.",
        },
        scheduled_at: {
          type: "string",
          description: "ISO 8601 datetime per invio schedulato (null = da inviare subito dopo approvazione)",
        },
        urgency: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["campaign_subject", "action", "target_description", "target_count", "suggested_subject", "suggested_body", "urgency"],
    },
  },
  {
    name: "set_analysis_summary",
    description: "Imposta il riepilogo dell'analisi. Chiamare una volta sola alla fine.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Analisi complessiva delle email in 2-3 frasi" },
        priority_action: { type: "string", description: "L'azione più urgente da fare subito" },
      },
      required: ["summary", "priority_action"],
    },
  },
];

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Supporto chiamata interna da Paperclip http adapter
  const body = await req.json().catch(() => ({}))
  const internalKey = req.headers.get("x-paperclip-internal-key")
  const isInternal = !!internalKey && internalKey === process.env.PAPERCLIP_INTERNAL_KEY

  let orgId: string, userId: string
  if (isInternal) {
    if (!body.orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 })
    orgId = body.orgId as string
    userId = "paperclip-agent"
  } else {
    const auth = await requirePlanner();
    if ("error" in auth) return auth.error;
    orgId = auth.orgId;
    userId = auth.userId;
  }

  const { id: eventId } = await params;

  const ctx = await buildEventAgentContext(eventId, orgId);
  if (!ctx) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  // Carica metriche campagne
  const groups = await prisma.emailSendLog.groupBy({
    by: ["subject", "templateId"],
    where: { eventId },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const campaigns: CampaignMetrics[] = await Promise.all(
    groups.map(async (g) => {
      const where = { eventId, subject: g.subject, templateId: g.templateId };
      const [opened, clicked, bounced, dates, unopened] = await Promise.all([
        prisma.emailSendLog.count({ where: { ...where, openedAt: { not: null } } }),
        prisma.emailSendLog.count({ where: { ...where, clickedAt: { not: null } } }),
        prisma.emailSendLog.count({ where: { ...where, bouncedAt: { not: null } } }),
        prisma.emailSendLog.aggregate({ where, _min: { sentAt: true }, _max: { sentAt: true } }),
        prisma.emailSendLog.count({ where: { ...where, openedAt: null } }),
      ]);
      const sent = g._count.id;
      return {
        subject: g.subject,
        templateId: g.templateId,
        sent,
        opened,
        clicked,
        bounced,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
        unopenedCount: unopened,
        firstSentAt: dates._min.sentAt?.toISOString() ?? "",
        lastSentAt: dates._max.sentAt?.toISOString() ?? "",
      };
    })
  );

  if (campaigns.length === 0) {
    return NextResponse.json({
      issues: [],
      followupProposals: [],
      summary: "Nessuna campagna email inviata per questo evento.",
      priorityAction: "Crea e invia la prima campagna email ai partecipanti.",
      campaignCount: 0,
      totalSent: 0,
      avgOpenRate: 0,
    } satisfies EmailTrackerResult);
  }

  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
  const avgOpenRate =
    totalSent > 0 ? Math.round((campaigns.reduce((s, c) => s + c.opened, 0) / totalSent) * 100) : 0;

  // ── Prompt ────────────────────────────────────────────────────────────────

  const campaignsText = campaigns
    .map(
      (c) =>
        `• "${c.subject}"
   Inviata: ${new Date(c.firstSentAt).toLocaleDateString("it-IT")} | Sent: ${c.sent} | Open: ${c.openRate}% (${c.opened}) | Click: ${c.clickRate}% (${c.clicked}) | Bounce: ${c.bounceRate}% (${c.bounced}) | Non aperte: ${c.unopenedCount}`
    )
    .join("\n");

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Sei l'Email Tracker Agent di Phorma. Analizza le performance delle campagne email di questo evento.

EVENTO: "${ctx.event.title}" | Status: ${ctx.event.status}
Data: ${ctx.event.startDate ? new Date(ctx.event.startDate as unknown as string).toLocaleDateString("it-IT") : "da definire"}
Iscritti: ${ctx.stats.total} totali | ${ctx.stats.confirmed} confermati | ${ctx.stats.pending} pending

CAMPAGNE EMAIL (${campaigns.length} totali, ${totalSent} invii totali):
${campaignsText}

BENCHMARK DI SETTORE (eventi B2B):
• Open rate: buono ≥30%, nella norma ≥15%, critico <15%
• Click rate: buono ≥5%, nella norma ≥2%, critico <2%
• Bounce rate: accettabile <2%, critico >5%

OGGI: ${today}

ISTRUZIONI:
1. Per ogni campagna con metriche critiche → chiama flag_campaign_issue
2. Per campagne con non-aperti significativi (>20 persone) → chiama propose_followup con:
   - Oggetto accattivante, diverso dall'originale
   - Corpo conciso in italiano con {{firstName}}
   - Stima target_count da unopenedCount della campagna
   - scheduled_at = null (da approvare prima dell'invio)
3. Per bounce >2% → proponi resend_to_bounced o verifica lista
4. Chiama set_analysis_summary una volta alla fine
5. MAX 3 flag_campaign_issue + 2 propose_followup
6. Sii specifico sui numeri, non generico`

  // ── Agentic loop ───────────────────────────────────────────────────────────

  const issues: CampaignIssue[] = [];
  const followupProposals: FollowupProposal[] = [];
  let summary = "";
  let priorityAction = "";

  let response = await anthropic.messages.create({
    model: AGENT_MODELS.email_tracker,
    max_tokens: 2048,
    tools,
    messages: [{ role: "user", content: prompt }],
  });

  const history: Parameters<typeof anthropic.messages.create>[0]["messages"] = [
    { role: "user", content: prompt },
  ];

  while (response.stop_reason === "tool_use") {
    const toolResults: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "flag_campaign_issue") {
        const inp = block.input as {
          campaign_subject: string; metric: string; current_value: number
          benchmark: number; issue: string; priority: string
        };
        issues.push({
          subject: inp.campaign_subject,
          metric: inp.metric,
          value: inp.current_value,
          benchmark: inp.benchmark,
          issue: inp.issue,
          priority: inp.priority as CampaignIssue["priority"],
        });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" });
      } else if (block.name === "propose_followup") {
        const inp = block.input as {
          campaign_subject: string; action: string; target_description: string
          target_count: number; suggested_subject: string; suggested_body: string
          scheduled_at?: string; urgency: string
        };
        followupProposals.push({
          campaignSubject: inp.campaign_subject,
          action: inp.action as FollowupProposal["action"],
          targetDescription: inp.target_description,
          targetCount: inp.target_count,
          suggestedSubject: inp.suggested_subject,
          suggestedBody: inp.suggested_body,
          scheduledAt: inp.scheduled_at ?? null,
          urgency: inp.urgency as FollowupProposal["urgency"],
        });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" });
      } else if (block.name === "set_analysis_summary") {
        const inp = block.input as { summary: string; priority_action: string };
        summary = inp.summary;
        priorityAction = inp.priority_action;
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "OK" });
      }
    }

    history.push({ role: "assistant", content: response.content });
    history.push({ role: "user", content: toolResults });
    response = await anthropic.messages.create({
      model: AGENT_MODELS.email_tracker,
      max_tokens: 2048,
      tools,
      messages: history,
    });
  }

  // ── Salva proposte di follow-up come AgentProposal ────────────────────────

  for (const fp of followupProposals) {
    await prisma.agentProposal.create({
      data: {
        eventId,
        orgId,
        agentType: "EMAIL_TRACKER",
        actionType: "EMAIL_SEND",
        title: `Follow-up: ${fp.suggestedSubject}`,
        summary: fp.targetDescription,
        payload: JSON.stringify({
          type: "custom",
          subject: fp.suggestedSubject,
          body: fp.suggestedBody,
          statusFilter: ["CONFIRMED", "PENDING"],
          urgency: fp.urgency,
          originalCampaign: fp.campaignSubject,
          action: fp.action,
          targetCount: fp.targetCount,
        }),
        scheduledAt: fp.scheduledAt ? new Date(fp.scheduledAt) : null,
        status: "PENDING",
        requestedBy: userId,
      },
    });
  }

  const result: EmailTrackerResult = {
    issues,
    followupProposals,
    summary,
    priorityAction,
    campaignCount: campaigns.length,
    totalSent,
    avgOpenRate,
  };

  // Notifica Paperclip task completato (se chiamata interna)
  if (isInternal) {
    const issueId = (body.context as Record<string, unknown>)?.issueId as string | undefined
    if (issueId) {
      try {
        const { updateIssue } = await import("@/lib/paperclip-client")
        await updateIssue(issueId, {
          status: "done",
          comment: `Analisi email completata.\n- ${issues.length} problemi rilevati\n- ${followupProposals.length} follow-up proposti\n- Open rate medio: ${avgOpenRate}%\n\n${summary}`,
        })
      } catch {
        // non bloccante
      }
    }
  }

  return NextResponse.json(result);
}
