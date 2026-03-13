"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export default function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Evento eliminato", { variant: "success" });
      setOpen(false);
      router.push("/events");
      router.refresh();
    } catch {
      toast("Errore durante l'eliminazione", { variant: "error" });
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:border-red-200">
          <Trash2 className="h-4 w-4" />
          Elimina
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminare l&apos;evento?</DialogTitle>
          <DialogDescription>
            Questa operazione è irreversibile. Tutti i partecipanti, le iscrizioni e i dati correlati
            verranno eliminati definitivamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Elimina definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
