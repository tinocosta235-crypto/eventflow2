import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime"
import { createAnthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"

// Custom adapter using @ai-sdk/anthropic (no conflict with @anthropic-ai/sdk version)
class AISdkAnthropicAdapter {
  get name() { return "AISdkAnthropicAdapter" }

  async process(request: {
    threadId?: string
    messages?: Array<{ role: string; content: unknown }>
    actions?: unknown[]
  }) {
    const threadId = request.threadId ?? crypto.randomUUID()
    const messages = (request.messages ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }))

    if (!messages.length) {
      return { threadId, stream: new ReadableStream({ start(c) { c.close() } }) }
    }

    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const result = streamText({
      model: anthropic("claude-sonnet-4-6-20251001"),
      messages,
    })

    return { threadId, stream: result.textStream }
  }
}

const runtime = new CopilotRuntime()
const adapter = new AISdkAnthropicAdapter()

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter: adapter as never,
  endpoint: "/api/copilotkit",
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return handleRequest(req)
}
