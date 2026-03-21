"use client";

import { useEffect, useState } from "react";
import { Mail, ChevronDown, ChevronUp, Copy, Check, Loader2, Plus, X, Shield } from "lucide-react";
import { toast } from "@/components/ui/toaster";

type DnsRecord = {
  record: string;
  name: string;
  type: string;
  value: string;
  status: string;
  priority?: number;
  ttl?: string;
};

type OrgEmailSender = {
  id: string;
  displayName: string;
  email: string;
  domain: string;
  resendDomainId: string | null;
  status: string;
  dnsRecords: string | null;
  isDefault: boolean;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border-green-200">
        <Check className="h-3 w-3" />
        Verificato
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border-red-200">
        <X className="h-3 w-3" />
        Fallito
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-200">
      <Shield className="h-3 w-3" />
      In attesa
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Impossibile copiare", { variant: "error" });
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors"
      style={{
        borderColor: copied ? "rgba(34,197,94,0.3)" : "rgba(109,98,243,0.14)",
        background: copied ? "rgba(34,197,94,0.06)" : "rgba(109,98,243,0.04)",
        color: copied ? "#16a34a" : "var(--text-secondary)",
      }}
      title="Copia valore"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiato" : "Copia"}
    </button>
  );
}

export default function EmailSendersPage() {
  const [senders, setSenders] = useState<OrgEmailSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ displayName: "", email: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  async function loadSenders() {
    try {
      const res = await fetch("/api/org/email-senders");
      if (res.ok) setSenders(await res.json());
    } catch {
      toast("Errore nel caricamento mittenti", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSenders();
  }, []);

  async function handleAdd() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!addForm.displayName.trim()) {
      toast("Inserisci un nome visualizzato", { variant: "error" });
      return;
    }
    if (!emailRegex.test(addForm.email)) {
      toast("Inserisci un indirizzo email valido", { variant: "error" });
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/org/email-senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Errore creazione mittente", { variant: "error" });
        return;
      }
      const newSender: OrgEmailSender = await res.json();
      setSenders((prev) => [newSender, ...prev]);
      setShowAddModal(false);
      setAddForm({ displayName: "", email: "" });
      // Expand DNS section for the new sender automatically
      setExpandedId(newSender.id);
      toast("Mittente aggiunto", { variant: "success" });
    } catch {
      toast("Errore di rete", { variant: "error" });
    } finally {
      setAddLoading(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/org/email-senders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        toast("Errore aggiornamento", { variant: "error" });
        return;
      }
      setSenders((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
      toast("Mittente predefinito aggiornato", { variant: "success" });
    } catch {
      toast("Errore di rete", { variant: "error" });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Eliminare questo mittente? Le email future useranno il mittente predefinito di sistema.")) return;
    try {
      const res = await fetch(`/api/org/email-senders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast("Errore eliminazione", { variant: "error" });
        return;
      }
      setSenders((prev) => prev.filter((s) => s.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast("Mittente eliminato", { variant: "success" });
    } catch {
      toast("Errore di rete", { variant: "error" });
    }
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/org/email-senders/${id}/verify`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Errore verifica", { variant: "error" });
        return;
      }
      setSenders((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: data.status, dnsRecords: data.dnsRecords } : s
        )
      );
      if (data.status === "VERIFIED") {
        toast("Dominio verificato con successo!", { variant: "success" });
      } else {
        toast("Verifica non ancora completata. Controlla i record DNS.", { variant: "error" });
      }
    } catch {
      toast("Errore di rete", { variant: "error" });
    } finally {
      setVerifyingId(null);
    }
  }

  function parseDnsRecords(raw: string | null): DnsRecord[] {
    if (!raw) return [];
    try {
      return JSON.parse(raw) as DnsRecord[];
    } catch {
      return [];
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function dnsStatusLabel(status: string) {
    if (status === "verified") return <span className="text-green-600 font-medium">Verificato</span>;
    if (status === "failed" || status === "failure") return <span className="text-red-600 font-medium">Fallito</span>;
    return <span className="text-yellow-600 font-medium">In attesa</span>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: "rgba(112,96,204,0.10)", border: "1px solid rgba(112,96,204,0.18)" }}
          >
            <Mail className="h-4 w-4" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Mittenti Email
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Configura gli indirizzi email da cui vengono inviate le comunicazioni agli ospiti.
              Ogni mittente richiede la verifica DNS del dominio.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all flex-shrink-0"
          style={{ background: "var(--accent)", boxShadow: "0 2px 8px rgba(112,96,204,0.28)" }}
        >
          <Plus className="h-4 w-4" />
          Aggiungi mittente
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : senders.length === 0 ? (
        /* Empty state */
        <div
          className="rounded-2xl border border-dashed p-10 flex flex-col items-center text-center"
          style={{ borderColor: "rgba(109,98,243,0.22)", background: "rgba(109,98,243,0.03)" }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
            style={{ background: "rgba(112,96,204,0.08)", border: "1px solid rgba(112,96,204,0.16)" }}
          >
            <Mail className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            Nessun mittente configurato
          </p>
          <p className="text-sm mb-4 max-w-xs" style={{ color: "var(--text-secondary)" }}>
            Aggiungi un indirizzo email personalizzato per inviare le comunicazioni dal tuo dominio aziendale.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="h-4 w-4" />
            Aggiungi mittente
          </button>
        </div>
      ) : (
        /* Sender list */
        <div className="space-y-3">
          {senders.map((sender) => {
            const dnsRecords = parseDnsRecords(sender.dnsRecords);
            const isExpanded = expandedId === sender.id;
            const isVerifying = verifyingId === sender.id;

            return (
              <div
                key={sender.id}
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: sender.isDefault
                    ? "rgba(112,96,204,0.28)"
                    : "rgba(109,98,243,0.14)",
                  background: "rgba(255,255,255,0.95)",
                  boxShadow: sender.isDefault
                    ? "0 4px 14px rgba(112,96,204,0.10)"
                    : "0 2px 8px rgba(109,98,243,0.05)",
                }}
              >
                {/* Card header */}
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(112,96,204,0.18), rgba(112,96,204,0.08))",
                      color: "var(--accent)",
                      border: "1px solid rgba(112,96,204,0.20)",
                    }}
                  >
                    {getInitials(sender.displayName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {sender.displayName}
                      </span>
                      <StatusBadge status={sender.status} />
                      {sender.isDefault && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: "rgba(112,96,204,0.08)",
                            color: "var(--accent)",
                            borderColor: "rgba(112,96,204,0.22)",
                          }}
                        >
                          <Check className="h-3 w-3" />
                          Predefinito
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                      {sender.email}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {sender.domain}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!sender.isDefault && sender.status === "VERIFIED" && (
                      <button
                        onClick={() => handleSetDefault(sender.id)}
                        className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          borderColor: "rgba(109,98,243,0.18)",
                          color: "var(--text-secondary)",
                          background: "rgba(255,255,255,0.8)",
                        }}
                      >
                        Imposta predefinito
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(sender.id)}
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor: "rgba(239,68,68,0.22)",
                        color: "#ef4444",
                        background: "rgba(239,68,68,0.04)",
                      }}
                    >
                      Elimina
                    </button>
                  </div>
                </div>

                {/* DNS toggle button */}
                <div
                  className="border-t px-4 py-2"
                  style={{ borderColor: "rgba(109,98,243,0.10)", background: "rgba(109,98,243,0.02)" }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : sender.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Nascondi record DNS
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Mostra record DNS
                      </>
                    )}
                  </button>
                </div>

                {/* DNS section (expanded) */}
                {isExpanded && (
                  <div
                    className="border-t px-4 py-4 space-y-4"
                    style={{ borderColor: "rgba(109,98,243,0.10)" }}
                  >
                    {!sender.resendDomainId ? (
                      /* No Resend domain — API key not configured */
                      <div
                        className="rounded-lg border p-3 flex items-start gap-2"
                        style={{
                          borderColor: "rgba(234,179,8,0.28)",
                          background: "rgba(234,179,8,0.05)",
                        }}
                      >
                        <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#ca8a04" }} />
                        <p className="text-xs" style={{ color: "#92400e" }}>
                          Configura{" "}
                          <code className="font-mono font-semibold bg-yellow-100 px-1 rounded">RESEND_API_KEY</code>{" "}
                          nelle variabili d&apos;ambiente per abilitare la verifica automatica DNS.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                            Record DNS da aggiungere al tuo provider (Cloudflare, GoDaddy, Aruba, ecc.)
                          </p>

                          {dnsRecords.length === 0 ? (
                            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                              Nessun record DNS disponibile. Prova a verificare di nuovo.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr style={{ borderBottom: "1px solid rgba(109,98,243,0.12)" }}>
                                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>
                                      Tipo
                                    </th>
                                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>
                                      Nome / Host
                                    </th>
                                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>
                                      Valore
                                    </th>
                                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>
                                      Stato
                                    </th>
                                    <th className="text-left py-2 font-semibold" style={{ color: "var(--text-tertiary)" }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dnsRecords.map((record, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid rgba(109,98,243,0.06)" }}>
                                      <td className="py-2 pr-4">
                                        <span
                                          className="inline-block rounded px-1.5 py-0.5 font-mono font-semibold text-[10px]"
                                          style={{
                                            background: "rgba(112,96,204,0.08)",
                                            color: "var(--accent)",
                                          }}
                                        >
                                          {record.type}
                                        </span>
                                        {record.record && (
                                          <span className="ml-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                                            {record.record}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 pr-4">
                                        <code
                                          className="font-mono text-[11px]"
                                          style={{ color: "var(--text-primary)" }}
                                        >
                                          {record.name}
                                        </code>
                                      </td>
                                      <td className="py-2 pr-4 max-w-[280px]">
                                        <code
                                          className="font-mono text-[11px] block truncate"
                                          style={{ color: "var(--text-primary)" }}
                                          title={record.value}
                                        >
                                          {record.value}
                                        </code>
                                      </td>
                                      <td className="py-2 pr-4">{dnsStatusLabel(record.status)}</td>
                                      <td className="py-2">
                                        <CopyButton value={record.value} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
                            I record DNS possono impiegare fino a 48h per propagarsi.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerify(sender.id)}
                            disabled={isVerifying}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all disabled:opacity-60"
                            style={{ background: "var(--accent)" }}
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Verifica in corso&hellip;
                              </>
                            ) : (
                              <>
                                <Shield className="h-3.5 w-3.5" />
                                Verifica ora
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,8,28,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{
              background: "var(--depth-1)",
              borderColor: "rgba(109,98,243,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Aggiungi mittente email
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nome visualizzato
                </label>
                <input
                  type="text"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Phorma Events"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition"
                  style={{
                    borderColor: "rgba(109,98,243,0.20)",
                    background: "white",
                    color: "var(--text-primary)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  Appare come &ldquo;Da:&rdquo; nelle email
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Indirizzo email
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="events@tuodominio.com"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition"
                  style={{
                    borderColor: "rgba(109,98,243,0.20)",
                    background: "white",
                    color: "var(--text-primary)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  Verrà verificato tramite DNS
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
                style={{
                  borderColor: "rgba(109,98,243,0.14)",
                  color: "var(--text-secondary)",
                  background: "rgba(255,255,255,0.7)",
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all disabled:opacity-60"
                style={{ background: "var(--accent)" }}
              >
                {addLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aggiunta&hellip;
                  </>
                ) : (
                  <>
                    Aggiungi <span className="opacity-70">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
