import Anthropic from "@anthropic-ai/sdk"

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const AI_MODEL = "claude-sonnet-4-6"

// Per-agent model routing — balance quality vs cost vs latency
export const AGENT_MODELS: Record<string, string> = {
  score_monitor:  "claude-sonnet-4-6",
  email_draft:    "claude-sonnet-4-6",
  report:         "claude-sonnet-4-6",
  email_tracker:  "claude-haiku-4-5-20251001",
  form_audit:     "claude-sonnet-4-6",
}
