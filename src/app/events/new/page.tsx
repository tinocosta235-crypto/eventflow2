"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { slugify } from "@/lib/utils";

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", location: "", startDate: "", endDate: "",
    capacity: "", status: "DRAFT", tags: "", visibility: "PUBLIC",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug: slugify(form.title),
          capacity: form.capacity ? parseInt(form.capacity) : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          tags: form.tags ? JSON.stringify(form.tags.split(",").map((t) => t.trim()).filter(Boolean)) : null,
        }),
      });
      if (!res.ok) throw new Error("Errore");
      const event = await res.json();
      router.push(`/events/${event.id}`);
    } catch {
      alert("Errore nella creazione dell'evento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <Header
        title="Nuovo Evento"
        subtitle="Crea un nuovo evento"
        actions={
          <Link href="/events">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Indietro
            </Button>
          </Link>
        }
      />
      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informazioni Base</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Titolo *</label>
                <Input
                  required
                  placeholder="Es. Forum Innovazione 2025"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Descrizione</label>
                <Textarea
                  rows={3}
                  placeholder="Descrivi il tuo evento..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Luogo</label>
                <Input
                  placeholder="Es. Milano, MiCo Convention Center"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Data Inizio</label>
                  <Input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Data Fine</label>
                  <Input type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Capienza Massima</label>
                  <Input type="number" min="1" placeholder="Es. 500" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Stato</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="DRAFT">Bozza</option>
                    <option value="PUBLISHED">Pubblicato</option>
                    <option value="CLOSED">Chiuso</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tag (separati da virgola)</label>
                <Input
                  placeholder="Es. tecnologia, innovazione, AI"
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvataggio..." : "Crea Evento"}
            </Button>
            <Link href="/phorma">
              <Button type="button" variant="outline" className="gap-2">
                Genera con AI
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
