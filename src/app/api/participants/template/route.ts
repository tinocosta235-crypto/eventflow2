import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const headers = ["Nome*", "Cognome*", "Email*", "Telefono", "Azienda", "Ruolo", "Stato", "Pagamento", "Prezzo", "Note"];
  const examples = [
    ["Mario", "Rossi", "mario.rossi@example.it", "+39 333 1234567", "Azienda Srl", "CEO", "CONFIRMED", "PAID", "200", ""],
    ["Laura", "Bianchi", "l.bianchi@startup.it", "", "Startup XYZ", "CTO", "PENDING", "FREE", "", "Vegetariano"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  const instrData = [
    ["Istruzioni", ""],
    ["Campi obbligatori", "Nome*, Cognome*, Email*"],
    ["Stato", "CONFIRMED | PENDING | WAITLIST | CANCELLED"],
    ["Pagamento", "FREE | PAID | PENDING | REFUNDED"],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Partecipanti");
  XLSX.utils.book_append_sheet(wb, instrWs, "Istruzioni");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template_partecipanti.xlsx"',
    },
  });
}
