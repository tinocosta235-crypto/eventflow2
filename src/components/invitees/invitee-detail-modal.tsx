"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X, User, Plane, Train, Car, Hotel, CreditCard, Plus, Trash2,
  Save, Send, Mail, MailOpen, MousePointerClick, Clock, CheckCircle2,
  XCircle, HelpCircle, ChevronRight, Luggage,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type FieldType = "text" | "number" | "date" | "url" | "select" | "boolean";

interface CustomField {
  id?: string;
  fieldName: string;
  fieldType: FieldType;
  value?: string;
}

interface TravelPlan {
  transportType?: string;
  transportNumber?: string;
  departureLocation?: string;
  arrivalLocation?: string;
  departureTime?: string;
  arrivalTime?: string;
  returnTransportType?: string;
  returnTransportNumber?: string;
  returnDepartureLocation?: string;
  returnArrivalLocation?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  hotelName?: string;
  hotelAddress?: string;
  checkIn?: string;
  checkOut?: string;
  roomNumber?: string;
  bookingRef?: string;
  transferType?: string;
  transferNotes?: string;
  reimbursementAmount?: number | string;
  reimbursementStatus?: string;
  reimbursementNotes?: string;
}

interface InviteLog {
  id: string;
  sentAt: string;
  emailSubject?: string;
  method: string;
  notes?: string;
}

interface Invitee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: string;
  declineReason?: string;
  dietary?: string;
  accessibility?: string;
  companions: number;
  invitesSent: number;
  lastInviteSentAt?: string;
  emailOpenedAt?: string;
  emailClickedAt?: string;
  convertedToRegistration: boolean;
  inviteToken: string;
  source: string;
  createdAt: string;
  event: { id: string; title: string; startDate?: string; location?: string };
  travelPlan?: TravelPlan | null;
  customFields: CustomField[];
  inviteLogs: InviteLog[];
}

const STATUS_OPTS = [
  { value: "PENDING", label: "In Attesa", color: "bg-yellow-100 text-yellow-800" },
  { value: "CONFIRMED", label: "Confermato", color: "bg-green-100 text-green-800" },
  { value: "DECLINED", label: "Rifiutato", color: "bg-red-100 text-red-800" },
  { value: "NO_RESPONSE", label: "Nessuna Risposta", color: "bg-gray-100 text-gray-700" },
];

const TRANSPORT_TYPES = ["TRAIN", "FLIGHT", "CAR", "BUS", "OTHER"];
const TRANSPORT_LABELS: Record<string, string> = { TRAIN: "Treno", FLIGHT: "Volo", CAR: "Auto", BUS: "Bus", OTHER: "Altro" };
const TRANSFER_TYPES = ["SHUTTLE", "TAXI", "OWN_CAR", "OTHER"];
const TRANSFER_LABELS: Record<string, string> = { SHUTTLE: "Navetta", TAXI: "Taxi", OWN_CAR: "Auto propria", OTHER: "Altro" };
const REIMB_STATUSES = ["NONE", "REQUESTED", "APPROVED", "PAID"];
const REIMB_LABELS: Record<string, string> = { NONE: "Nessuno", REQUESTED: "Richiesto", APPROVED: "Approvato", PAID: "Pagato" };
const FIELD_TYPES: FieldType[] = ["text", "number", "date", "url", "boolean"];

function getStatusIcon(status: string) {
  switch (status) {
    case "CONFIRMED": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "DECLINED": return <XCircle className="h-4 w-4 text-red-500" />;
    case "NO_RESPONSE": return <HelpCircle className="h-4 w-4 text-gray-400" />;
    default: return <Clock className="h-4 w-4 text-yellow-500" />;
  }
}

function toDatetimeLocal(val?: string): string {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 16);
}

function toDateLocal(val?: string): string {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 10);
}

const TABS = ["Dati", "Campi Custom", "Piano Viaggio", "Storico Invii"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  inviteeId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function InviteeDetailModal({ inviteeId, onClose, onUpdated }: Props) {
  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Dati");

  // Form state
  const [formData, setFormData] = useState<Partial<Invitee>>({});
  const [travel, setTravel] = useState<TravelPlan>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [sendNotes, setSendNotes] = useState("");

  useEffect(() => {
    fetchInvitee();
  }, [inviteeId]);

  async function fetchInvitee() {
    setLoading(true);
    const res = await fetch(`/api/invitees/${inviteeId}`);
    const data: Invitee = await res.json();
    setInvitee(data);
    setFormData({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      jobTitle: data.jobTitle,
      status: data.status,
      declineReason: data.declineReason,
      dietary: data.dietary,
      accessibility: data.accessibility,
      companions: data.companions,
    });
    setTravel(data.travelPlan ?? {});
    setCustomFields(data.customFields ?? []);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/invitees/${inviteeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      await fetch(`/api/invitees/${inviteeId}/travel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(travel),
      });

      await fetch(`/api/invitees/${inviteeId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: customFields }),
      });

      await fetchInvitee();
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function handleSendInvite() {
    setSending(true);
    try {
      await fetch(`/api/invitees/${inviteeId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: sendNotes }),
      });
      setSendNotes("");
      await fetchInvitee();
      onUpdated();
    } finally {
      setSending(false);
    }
  }

  function addCustomField() {
    setCustomFields((prev) => [...prev, { fieldName: "", fieldType: "text", value: "" }]);
  }

  function updateCustomField(idx: number, key: keyof CustomField, val: string) {
    setCustomFields((prev) => prev.map((f, i) => (i === idx ? { ...f, [key]: val } : f)));
  }

  function removeCustomField(idx: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== idx));
  }

  if (loading || !invitee) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-600">Caricamento...</span>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_OPTS.find((s) => s.value === invitee.status) ?? STATUS_OPTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {invitee.firstName[0]}{invitee.lastName[0]}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{invitee.firstName} {invitee.lastName}</h2>
              <p className="text-xs text-gray-400">{invitee.email} · {invitee.event.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            {invitee.convertedToRegistration && (
              <Badge className="bg-blue-100 text-blue-700">Iscritto</Badge>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tracking pills */}
        <div className="flex items-center gap-3 px-6 py-2.5 bg-gray-50 border-b border-gray-100 text-xs">
          <span className="flex items-center gap-1 text-gray-500">
            <Send className="h-3.5 w-3.5" /> {invitee.invitesSent} invii
          </span>
          {invitee.lastInviteSentAt && (
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="h-3.5 w-3.5" /> Ultimo: {formatDate(invitee.lastInviteSentAt)}
            </span>
          )}
          {invitee.emailOpenedAt && (
            <span className="flex items-center gap-1 text-green-600">
              <MailOpen className="h-3.5 w-3.5" /> Aperta {formatDate(invitee.emailOpenedAt)}
            </span>
          )}
          {invitee.emailClickedAt && (
            <span className="flex items-center gap-1 text-blue-600">
              <MousePointerClick className="h-3.5 w-3.5" /> Cliccata {formatDate(invitee.emailClickedAt)}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* TAB: Dati */}
          {activeTab === "Dati" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nome</label>
                  <Input value={formData.firstName ?? ""} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cognome</label>
                  <Input value={formData.lastName ?? ""} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
                  <Input type="email" value={formData.email ?? ""} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefono</label>
                  <Input value={formData.phone ?? ""} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Azienda</label>
                  <Input value={formData.company ?? ""} onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ruolo</label>
                  <Input value={formData.jobTitle ?? ""} onChange={(e) => setFormData((p) => ({ ...p, jobTitle: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Stato Risposta</label>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setFormData((p) => ({ ...p, status: s.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          formData.status === s.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {getStatusIcon(s.value)} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Accompagnatori</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.companions ?? 0}
                    onChange={(e) => setFormData((p) => ({ ...p, companions: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {formData.status === "DECLINED" && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Motivo Rifiuto</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={formData.declineReason ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, declineReason: e.target.value }))}
                    placeholder="Motivo del rifiuto..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Esigenze Alimentari</label>
                  <Input
                    value={formData.dietary ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, dietary: e.target.value }))}
                    placeholder="Allergie, diete speciali..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Accessibilità</label>
                  <Input
                    value={formData.accessibility ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, accessibility: e.target.value }))}
                    placeholder="Necessità speciali..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Campi Custom */}
          {activeTab === "Campi Custom" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Aggiungi campi personalizzati per questo invitato.</p>
                <Button size="sm" variant="outline" onClick={addCustomField} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Aggiungi Campo
                </Button>
              </div>
              {customFields.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nessun campo personalizzato</p>
                </div>
              )}
              {customFields.map((field, idx) => (
                <div key={idx} className="flex gap-2 items-start p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">Nome Campo</label>
                      <Input
                        placeholder="Es. Codice Fiscale"
                        value={field.fieldName}
                        onChange={(e) => updateCustomField(idx, "fieldName", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">Tipo</label>
                      <select
                        className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                        value={field.fieldType}
                        onChange={(e) => updateCustomField(idx, "fieldType", e.target.value)}
                      >
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">Valore</label>
                      <Input
                        type={field.fieldType === "date" ? "date" : field.fieldType === "number" ? "number" : field.fieldType === "url" ? "url" : "text"}
                        value={field.value ?? ""}
                        onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeCustomField(idx)}
                    className="mt-6 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB: Piano Viaggio */}
          {activeTab === "Piano Viaggio" && (
            <div className="space-y-5">
              {/* Trasporto Andata */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  {travel.transportType === "FLIGHT" ? <Plane className="h-4 w-4 text-blue-500" /> : <Train className="h-4 w-4 text-blue-500" />}
                  Trasporto Andata
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Tipo</label>
                    <select
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                      value={travel.transportType ?? ""}
                      onChange={(e) => setTravel((p) => ({ ...p, transportType: e.target.value }))}
                    >
                      <option value="">Seleziona...</option>
                      {TRANSPORT_TYPES.map((t) => <option key={t} value={t}>{TRANSPORT_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Numero (treno/volo)</label>
                    <Input placeholder="ES. FR9605 / AZ1234" value={travel.transportNumber ?? ""} onChange={(e) => setTravel((p) => ({ ...p, transportNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Partenza da</label>
                    <Input placeholder="Milano Centrale" value={travel.departureLocation ?? ""} onChange={(e) => setTravel((p) => ({ ...p, departureLocation: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Arrivo a</label>
                    <Input placeholder="Roma Termini" value={travel.arrivalLocation ?? ""} onChange={(e) => setTravel((p) => ({ ...p, arrivalLocation: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Data/Ora Partenza</label>
                    <Input type="datetime-local" value={toDatetimeLocal(travel.departureTime)} onChange={(e) => setTravel((p) => ({ ...p, departureTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Data/Ora Arrivo</label>
                    <Input type="datetime-local" value={toDatetimeLocal(travel.arrivalTime)} onChange={(e) => setTravel((p) => ({ ...p, arrivalTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Trasporto Ritorno */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  Trasporto Ritorno
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Tipo</label>
                    <select
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                      value={travel.returnTransportType ?? ""}
                      onChange={(e) => setTravel((p) => ({ ...p, returnTransportType: e.target.value }))}
                    >
                      <option value="">Seleziona...</option>
                      {TRANSPORT_TYPES.map((t) => <option key={t} value={t}>{TRANSPORT_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Numero</label>
                    <Input value={travel.returnTransportNumber ?? ""} onChange={(e) => setTravel((p) => ({ ...p, returnTransportNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Partenza da</label>
                    <Input value={travel.returnDepartureLocation ?? ""} onChange={(e) => setTravel((p) => ({ ...p, returnDepartureLocation: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Arrivo a</label>
                    <Input value={travel.returnArrivalLocation ?? ""} onChange={(e) => setTravel((p) => ({ ...p, returnArrivalLocation: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Data/Ora Partenza</label>
                    <Input type="datetime-local" value={toDatetimeLocal(travel.returnDepartureTime)} onChange={(e) => setTravel((p) => ({ ...p, returnDepartureTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Data/Ora Arrivo</label>
                    <Input type="datetime-local" value={toDatetimeLocal(travel.returnArrivalTime)} onChange={(e) => setTravel((p) => ({ ...p, returnArrivalTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Hotel */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Hotel className="h-4 w-4 text-purple-500" />
                  Hotel / Alloggio
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Nome Hotel</label>
                    <Input value={travel.hotelName ?? ""} onChange={(e) => setTravel((p) => ({ ...p, hotelName: e.target.value }))} placeholder="Hotel Excelsior" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Indirizzo</label>
                    <Input value={travel.hotelAddress ?? ""} onChange={(e) => setTravel((p) => ({ ...p, hotelAddress: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Check-in</label>
                    <Input type="date" value={toDateLocal(travel.checkIn)} onChange={(e) => setTravel((p) => ({ ...p, checkIn: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Check-out</label>
                    <Input type="date" value={toDateLocal(travel.checkOut)} onChange={(e) => setTravel((p) => ({ ...p, checkOut: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Numero Camera</label>
                    <Input value={travel.roomNumber ?? ""} onChange={(e) => setTravel((p) => ({ ...p, roomNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Codice Prenotazione</label>
                    <Input value={travel.bookingRef ?? ""} onChange={(e) => setTravel((p) => ({ ...p, bookingRef: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Trasferimento */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Car className="h-4 w-4 text-orange-500" />
                  Trasferimento Sede
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Tipo Trasferimento</label>
                    <select
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                      value={travel.transferType ?? ""}
                      onChange={(e) => setTravel((p) => ({ ...p, transferType: e.target.value }))}
                    >
                      <option value="">Seleziona...</option>
                      {TRANSFER_TYPES.map((t) => <option key={t} value={t}>{TRANSFER_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Note</label>
                    <Input value={travel.transferNotes ?? ""} onChange={(e) => setTravel((p) => ({ ...p, transferNotes: e.target.value }))} placeholder="Orario navetta, punto raccolta..." />
                  </div>
                </div>
              </div>

              {/* Rimborso */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-green-500" />
                  Rimborso Spese
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Importo (€)</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={travel.reimbursementAmount ?? ""}
                      onChange={(e) => setTravel((p) => ({ ...p, reimbursementAmount: parseFloat(e.target.value) || undefined }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Stato Rimborso</label>
                    <select
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                      value={travel.reimbursementStatus ?? "NONE"}
                      onChange={(e) => setTravel((p) => ({ ...p, reimbursementStatus: e.target.value }))}
                    >
                      {REIMB_STATUSES.map((s) => <option key={s} value={s}>{REIMB_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Note Rimborso</label>
                    <Input value={travel.reimbursementNotes ?? ""} onChange={(e) => setTravel((p) => ({ ...p, reimbursementNotes: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Storico Invii */}
          {activeTab === "Storico Invii" && (
            <div className="space-y-4">
              {/* Quick send */}
              <div className="p-4 border border-blue-100 rounded-xl bg-blue-50">
                <p className="text-sm font-medium text-blue-800 mb-2">Invia Invito</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Note opzionali sull'invio..."
                    value={sendNotes}
                    onChange={(e) => setSendNotes(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSendInvite} disabled={sending} className="gap-1.5">
                    {sending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Mail className="h-4 w-4" />}
                    Invia
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-1.5">
                  Token invito: <code className="bg-blue-100 px-1 rounded text-xs">{invitee.inviteToken}</code>
                </p>
              </div>

              {/* Log list */}
              {invitee.inviteLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Luggage className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nessun invio registrato</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitee.inviteLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{log.emailSubject ?? "Invito evento"}</p>
                        {log.notes && <p className="text-xs text-gray-400 mt-0.5">{log.notes}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.sentAt)} · {log.method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">Aggiunto il {formatDate(invitee.createdAt)} · Fonte: {invitee.source}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Chiudi</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
              Salva
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
