import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateCode(prefix = "REG") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = prefix + "-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("it-IT", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("it-IT", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "Gratuito";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount);
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Bozza", PUBLISHED: "Pubblicato", CLOSED: "Chiuso", CANCELLED: "Annullato",
    PENDING: "In attesa", CONFIRMED: "Confermato", WAITLIST: "Lista attesa",
    FREE: "Gratuito", PAID: "Pagato", REFUNDED: "Rimborsato",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PUBLISHED: "bg-green-100 text-green-700",
    CLOSED: "bg-orange-100 text-orange-700",
    CANCELLED: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    WAITLIST: "bg-purple-100 text-purple-700",
    PAID: "bg-green-100 text-green-700",
    FREE: "bg-gray-100 text-gray-600",
    REFUNDED: "bg-orange-100 text-orange-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-600";
}
