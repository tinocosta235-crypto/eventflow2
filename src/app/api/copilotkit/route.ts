import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime"

const runtime = new CopilotRuntime()

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter: new AnthropicAdapter({ model: "claude-sonnet-4-6" }),
  endpoint: "/api/copilotkit",
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return handleRequest(req)
}
