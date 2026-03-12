import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const eventId = formData.get("eventId") as string | null;

  if (!file || !eventId) {
    return NextResponse.json({ error: "File e eventId richiesti" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

  const fieldMap: Record<string, string> = {
    "nome*": "firstName", nome: "firstName",
    "cognome*": "lastName", cognome: "lastName",
    "email*": "email", email: "email",
    telefono: "phone", azienda: "company",
    ruolo: "jobTitle", stato: "status",
    pagamento: "paymentStatus",
    prezzo: "ticketPrice", note: "notes",
  };

  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const p: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const mapped = fieldMap[k.toLowerCase().trim()];
      if (mapped) p[mapped] = String(v).trim();
    }

    if (!p.email || !p.firstName || !p.lastName) { results.skipped++; continue; }

    try {
      const exists = await prisma.registration.findFirst({ where: { eventId, email: p.email.toLowerCase() } });
      if (exists) { results.skipped++; continue; }

      await prisma.registration.create({
        data: {
          eventId,
          registrationCode: generateCode("REG"),
          firstName: p.firstName, lastName: p.lastName, email: p.email.toLowerCase(),
          phone: p.phone || null, company: p.company || null, jobTitle: p.jobTitle || null,
          notes: p.notes || null, source: "excel_import",
          status: ["CONFIRMED","PENDING","WAITLIST","CANCELLED"].includes(p.status?.toUpperCase())
            ? p.status.toUpperCase() : "CONFIRMED",
          paymentStatus: ["PAID","PENDING","FREE","REFUNDED"].includes(p.paymentStatus?.toUpperCase())
            ? p.paymentStatus.toUpperCase() : "FREE",
          ticketPrice: p.ticketPrice ? parseFloat(p.ticketPrice.replace(/[^0-9.]/g, "")) || null : null,
        },
      });
      results.imported++;
    } catch {
      results.errors.push(p.email);
    }
  }

  if (results.imported > 0) {
    await prisma.event.update({ where: { id: eventId }, data: { currentCount: { increment: results.imported } } });
  }

  return NextResponse.json({ ...results, message: `Importati ${results.imported}, saltati ${results.skipped}` });
}
