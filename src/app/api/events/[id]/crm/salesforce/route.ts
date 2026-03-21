import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlanner } from "@/lib/auth-helpers";

type SyncMode = "CONTACTS" | "LEADS";

const CONTRACT = {
  provider: "salesforce",
  version: "v1-mock",
  objectModes: ["CONTACTS", "LEADS"],
  fieldMapping: {
    firstName: "FirstName",
    lastName: "LastName",
    email: "Email",
    company: "Company",
    jobTitle: "Title",
    registrationCode: "EventFlow_Registration_Code__c",
    eventId: "EventFlow_Event_Id__c",
    eventTitle: "EventFlow_Event_Title__c",
    registrationStatus: "EventFlow_Registration_Status__c",
    createdAt: "EventFlow_Registration_Created_At__c",
  },
} as const;

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlanner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, title: true, updatedAt: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const totalRegistrations = await prisma.registration.count({ where: { eventId: id } });
  const syncLogs = await prisma.emailSendLog.findMany({
    where: {
      eventId: id,
      subject: { startsWith: "[SF_SYNC_MOCK]" },
    },
    orderBy: { sentAt: "desc" },
    take: 1,
  });

  return NextResponse.json({
    enabled: true,
    provider: "salesforce",
    event: { id: event.id, title: event.title, updatedAt: event.updatedAt },
    contract: CONTRACT,
    totals: { registrations: totalRegistrations },
    lastSync: syncLogs[0]
      ? {
          at: syncLogs[0].sentAt,
          status: syncLogs[0].status,
          details: syncLogs[0].subject.replace("[SF_SYNC_MOCK] ", ""),
        }
      : null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlanner();
  if ("error" in result) return result.error;
  const { orgId } = result;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, title: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const mode: SyncMode = body.mode === "LEADS" ? "LEADS" : "CONTACTS";
  const dryRun = body.dryRun !== false;

  const registrations = await prisma.registration.findMany({
    where: { eventId: id, status: { in: ["CONFIRMED", "PENDING", "WAITLIST"] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      jobTitle: true,
      status: true,
      registrationCode: true,
      createdAt: true,
    },
    take: 500,
  });

  const payloadPreview = registrations.slice(0, 3).map((r) => ({
    FirstName: r.firstName,
    LastName: r.lastName,
    Email: r.email,
    Company: r.company,
    Title: r.jobTitle,
    EventFlow_Registration_Code__c: r.registrationCode,
    EventFlow_Event_Id__c: id,
    EventFlow_Event_Title__c: event.title,
    EventFlow_Registration_Status__c: r.status,
    EventFlow_Registration_Created_At__c: r.createdAt.toISOString(),
  }));

  await prisma.emailSendLog.create({
    data: {
      eventId: id,
      email: "salesforce-sync@mock.local",
      subject: `[SF_SYNC_MOCK] mode=${mode}; dryRun=${dryRun}; records=${registrations.length}`,
      status: "SENT",
    },
  });

  return NextResponse.json({
    success: true,
    provider: "salesforce",
    contractVersion: CONTRACT.version,
    mode,
    dryRun,
    synced: registrations.length,
    payloadPreview,
    message: dryRun
      ? "Dry-run completata. Nessun record inviato a Salesforce."
      : "Sync mock completata.",
  });
}
