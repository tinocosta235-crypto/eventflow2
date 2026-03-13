import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const eventId = formData.get("eventId") as string;

  if (!file || !eventId) {
    return NextResponse.json(
      { error: "File ed eventId sono obbligatori" },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const firstName = row["Nome"] || row["FirstName"] || row["first_name"] || "";
    const lastName = row["Cognome"] || row["LastName"] || row["last_name"] || "";
    const email = row["Email"] || row["email"] || "";

    if (!firstName || !lastName || !email) {
      results.errors.push(`Riga saltata: dati obbligatori mancanti (${JSON.stringify(row)})`);
      results.skipped++;
      continue;
    }

    const existing = await prisma.invitee.findUnique({
      where: { eventId_email: { eventId, email } },
    });

    if (existing) {
      results.skipped++;
      continue;
    }

    await prisma.invitee.create({
      data: {
        eventId,
        firstName,
        lastName,
        email,
        phone: row["Telefono"] || row["Phone"] || undefined,
        company: row["Azienda"] || row["Company"] || undefined,
        jobTitle: row["Ruolo"] || row["JobTitle"] || undefined,
        dietary: row["Dieta"] || row["Dietary"] || undefined,
        accessibility: row["Accessibilità"] || row["Accessibility"] || undefined,
        companions: parseInt(row["Accompagnatori"] || "0") || 0,
        source: "EXCEL",
      },
    });

    results.created++;
  }

  return NextResponse.json(results);
}
