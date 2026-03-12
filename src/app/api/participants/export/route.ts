import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const where: Record<string, unknown> = {};
  if (eventId) where.eventId = eventId;

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      event: { select: { title: true, startDate: true, location: true } },
      fields: { include: { field: { select: { label: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = registrations.map((reg) => {
    const row: Record<string, unknown> = {
      "Codice": reg.registrationCode,
      "Nome": reg.firstName,
      "Cognome": reg.lastName,
      "Email": reg.email,
      "Telefono": reg.phone || "",
      "Azienda": reg.company || "",
      "Ruolo": reg.jobTitle || "",
      "Evento": reg.event.title,
      "Data Evento": reg.event.startDate ? new Date(reg.event.startDate).toLocaleDateString("it-IT") : "",
      "Stato": reg.status,
      "Pagamento": reg.paymentStatus,
      "Prezzo": reg.ticketPrice ? `€${reg.ticketPrice}` : "Gratuito",
      "Check-in": reg.checkedInAt ? "Sì" : "No",
      "Iscritto il": new Date(reg.createdAt).toLocaleDateString("it-IT"),
      "Note": reg.notes || "",
    };
    for (const f of reg.fields) {
      row[f.field.label] = f.value ?? "";
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Partecipanti");

  const summaryData = [
    ["Riepilogo", ""],
    ["Totale", registrations.length],
    ["Confermati", registrations.filter((r) => r.status === "CONFIRMED").length],
    ["In attesa", registrations.filter((r) => r.status === "PENDING").length],
    ["Annullati", registrations.filter((r) => r.status === "CANCELLED").length],
    ["Check-in", registrations.filter((r) => r.checkedInAt).length],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Riepilogo");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const name = registrations[0]?.event.title || "partecipanti";
  const filename = `${name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
