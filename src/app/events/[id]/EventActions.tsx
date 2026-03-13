"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Archive, Copy, Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface EventActionsProps {
  eventId: string;
  currentStatus: string;
}

type StatusAction = {
  label: string;
  newStatus: string;
  icon: React.ElementType;
  className: string;
  confirmMsg: string;
};

const STATUS_ACTIONS: Record<string, StatusAction[]> = {
  DRAFT: [
    {
      label: "Pubblica",
      newStatus: "PUBLISHED",
      icon: CheckCircle2,
      className: "text-green-600 hover:text-green-700 hover:border-green-200",
      confirmMsg: "Pubblicare l'evento? Diventerà visibile ai partecipanti.",
    },
    {
      label: "Annulla",
      newStatus: "CANCELLED",
      icon: XCircle,
      className: "text-red-600 hover:text-red-700 hover:border-red-200",
      confirmMsg: "Annullare l'evento? Questa azione è difficilmente reversibile.",
    },
  ],
  PUBLISHED: [
    {
      label: "Chiudi iscrizioni",
      newStatus: "CLOSED",
      icon: Archive,
      className: "text-orange-600 hover:text-orange-700 hover:border-orange-200",
      confirmMsg: "Chiudere le iscrizioni? I nuovi partecipanti non potranno più iscriversi.",
    },
    {
      label: "Annulla evento",
      newStatus: "CANCELLED",
      icon: XCircle,
      className: "text-red-600 hover:text-red-700 hover:border-red-200",
      confirmMsg: "Annullare l'evento? Tutti i partecipanti verranno notificati (se configuri le email).",
    },
  ],
  CLOSED: [
    {
      label: "Riapri iscrizioni",
      newStatus: "PUBLISHED",
      icon: CheckCircle2,
      className: "text-green-600 hover:text-green-700 hover:border-green-200",
      confirmMsg: "Riaprire le iscrizioni? L'evento tornerà visibile.",
    },
  ],
  CANCELLED: [
    {
      label: "Riattiva come bozza",
      newStatus: "DRAFT",
      icon: CheckCircle2,
      className: "text-gray-600 hover:text-gray-700 hover:border-gray-300",
      confirmMsg: "Riattivare l'evento come bozza?",
    },
  ],
};

export function EventStatusActions({ eventId, currentStatus }: EventActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<StatusAction | null>(null);

  const actions = STATUS_ACTIONS[currentStatus] ?? [];

  async function confirm() {
    if (!pending) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pending.newStatus }),
      });
      if (!res.ok) throw new Error();
      toast(`Stato aggiornato: ${pending.label}`, { variant: "success" });
      setPending(null);
      router.refresh();
    } catch {
      toast("Errore nell'aggiornamento stato", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (actions.length === 0) return null;

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.newStatus}
          variant="outline"
          size="sm"
          className={`gap-2 ${action.className}`}
          onClick={() => setPending(action)}
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </Button>
      ))}

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.label}?</DialogTitle>
            <DialogDescription>{pending?.confirmMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={loading}>
              Annulla
            </Button>
            <Button onClick={confirm} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DuplicateEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function duplicate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      const copy = await res.json();
      toast("Evento duplicato come bozza", { variant: "success", description: "Puoi ora modificarlo." });
      router.push(`/events/${copy.id}/edit`);
    } catch {
      toast("Errore nella duplicazione", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={duplicate} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      Duplica
    </Button>
  );
}
