import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlanner } from "@/lib/auth-helpers"

// GET — list manual action tasks for event
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlanner()
  if ("error" in auth) return auth.error
  const { id: eventId } = await params

  const tasks = await prisma.manualActionTask.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: {
      nodeInstance: { select: { nodeId: true, registrationId: true } },
    },
  })
  return NextResponse.json({ tasks })
}

// POST — complete a task with chosen output
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlanner()
  if ("error" in auth) return auth.error
  const { userId } = auth
  const { id: eventId } = await params

  const body = await req.json()
  const { taskId, chosenOutput, status = "DONE" } = body as {
    taskId: string
    chosenOutput?: string
    status?: string
  }

  const task = await prisma.manualActionTask.findFirst({
    where: { id: taskId, eventId },
  })
  if (!task) return NextResponse.json({ error: "Task non trovato" }, { status: 404 })

  const updated = await prisma.manualActionTask.update({
    where: { id: taskId },
    data: {
      status,
      chosenOutput: chosenOutput ?? null,
      completedBy: userId,
      completedAt: new Date(),
    },
  })

  // Update the FlowNodeInstance status
  await prisma.flowNodeInstance.update({
    where: { id: task.nodeInstanceId },
    data: {
      status: "COMPLETED",
      outputBranch: chosenOutput ?? null,
      completedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, task: updated })
}
