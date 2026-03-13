import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invitee = await prisma.invitee.findUnique({
    where: { id },
    include: {
      travelPlan: true,
      customFields: true,
      inviteLogs: { orderBy: { sentAt: "desc" } },
      event: { select: { id: true, title: true, startDate: true, location: true } },
    },
  });

  if (!invitee) {
    return NextResponse.json({ error: "Invitato non trovato" }, { status: 404 });
  }

  return NextResponse.json(invitee);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    jobTitle,
    status,
    declineReason,
    dietary,
    accessibility,
    companions,
    emailOpenedAt,
    emailClickedAt,
    convertedToRegistration,
    registrationId,
  } = body;

  const invitee = await prisma.invitee.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(company !== undefined && { company }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(status !== undefined && { status }),
      ...(declineReason !== undefined && { declineReason }),
      ...(dietary !== undefined && { dietary }),
      ...(accessibility !== undefined && { accessibility }),
      ...(companions !== undefined && { companions }),
      ...(emailOpenedAt !== undefined && { emailOpenedAt }),
      ...(emailClickedAt !== undefined && { emailClickedAt }),
      ...(convertedToRegistration !== undefined && { convertedToRegistration }),
      ...(registrationId !== undefined && { registrationId }),
    },
    include: {
      travelPlan: true,
      customFields: true,
      inviteLogs: { orderBy: { sentAt: "desc" } },
      event: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(invitee);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.invitee.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
