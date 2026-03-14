"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, Loader2, Users, ExternalLink } from "lucide-react"
import { toast } from "@/components/ui/toaster"

interface Group {
  id: string
  name: string
  description: string | null
  color: string
  order: number
  _count: { registrations: number }
}

const COLORS = [
  { value: "blue", label: "Blu", cls: "bg-blue-500" },
  { value: "green", label: "Verde", cls: "bg-green-500" },
  { value: "purple", label: "Viola", cls: "bg-purple-500" },
  { value: "orange", label: "Arancio", cls: "bg-orange-500" },
  { value: "red", label: "Rosso", cls: "bg-red-500" },
  { value: "indigo", label: "Indaco", cls: "bg-indigo-500" },
]

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  red: "bg-red-100 text-red-700 border-red-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
}

function GroupForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Group>
  onSave: (d: { name: string; color: string; description: string }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [color, setColor] = useState(initial?.color ?? "blue")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try { await onSave({ name, color, description }) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
      <div className="flex-1 min-w-32">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Nome gruppo *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP, Speaker, Staff..." className="h-8 text-xs" autoFocus />
      </div>
      <div className="flex-1 min-w-32">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Descrizione</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facoltativa" className="h-8 text-xs" />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Colore</label>
        <div className="flex items-center gap-1.5 h-8">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`h-5 w-5 rounded-full ${c.cls} flex-shrink-0 ring-offset-1 transition-all ${color === c.value ? "ring-2 ring-gray-600 scale-110" : "opacity-50 hover:opacity-100"}`}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 px-2 text-xs">Annulla</Button>
        <Button type="submit" size="sm" disabled={loading || !name.trim()} className="h-8 px-3 text-xs">
          {loading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          {initial?.id ? "Salva" : "Crea gruppo"}
        </Button>
      </div>
    </form>
  )
}

export default function GroupsClient({ eventId }: { eventId: string }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/groups`)
      if (res.ok) setGroups(await res.json())
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  async function createGroup(d: { name: string; color: string; description: string }) {
    const res = await fetch(`/api/events/${eventId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    })
    if (!res.ok) { toast("Errore nella creazione", { variant: "error" }); return }
    const group = await res.json()
    setGroups((g) => [...g, group])
    setShowAdd(false)
    toast("Gruppo creato", { variant: "success" })
  }

  async function updateGroup(id: string, d: { name: string; color: string; description: string }) {
    const res = await fetch(`/api/events/${eventId}/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    })
    if (!res.ok) { toast("Errore", { variant: "error" }); return }
    const updated = await res.json()
    setGroups((g) => g.map((x) => x.id === id ? updated : x))
    setEditingId(null)
    toast("Gruppo aggiornato", { variant: "success" })
  }

  async function deleteGroup(id: string, count: number) {
    const msg = count > 0
      ? `Eliminare il gruppo? ${count} partecipanti verranno rimossi dal gruppo (non eliminati).`
      : "Eliminare questo gruppo?"
    if (!confirm(msg)) return
    setDeletingId(id)
    try {
      await fetch(`/api/events/${eventId}/groups/${id}`, { method: "DELETE" })
      setGroups((g) => g.filter((x) => x.id !== id))
      toast("Gruppo eliminato")
    } finally {
      setDeletingId(null)
    }
  }

  const totalAssigned = groups.reduce((s, g) => s + g._count.registrations, 0)

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {groups.length} gruppi · {totalAssigned} partecipanti assegnati
        </p>
        <div className="flex items-center gap-2">
          <a href={`/events/${eventId}/masterlist`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />Masterlist
            </Button>
          </a>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" />Nuovo gruppo
          </Button>
        </div>
      </div>

      {showAdd && <GroupForm onSave={createGroup} onCancel={() => setShowAdd(false)} />}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : groups.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-500 mb-1">Nessun gruppo configurato</p>
            <p className="text-xs text-gray-400">Crea gruppi per segmentare i partecipanti (VIP, Speaker, Staff...)</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id}>
              {editingId === group.id ? (
                <GroupForm
                  initial={group}
                  onSave={(d) => updateGroup(group.id, d)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <Card className="overflow-hidden group hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* Color dot */}
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 bg-${group.color}-500`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${COLOR_BG[group.color] ?? "bg-gray-100 text-gray-700"}`}>
                          {group.name}
                        </span>
                        {group.description && (
                          <span className="text-xs text-gray-400 truncate">{group.description}</span>
                        )}
                      </div>
                    </div>

                    {/* Count */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium">{group._count.registrations}</span>
                      <span className="text-gray-400">partecipanti</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(group.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteGroup(group.id, group._count.registrations)}
                        disabled={deletingId === group.id}
                      >
                        {deletingId === group.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
