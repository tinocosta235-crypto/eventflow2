"use client";
import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, CheckCircle2, XCircle, QrCode, Users, Clock, Loader2,
  RotateCcw, Camera, CameraOff,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { getStatusColor, getStatusLabel, formatDateTime } from "@/lib/utils";
import QRCode from "@/components/participants/QRCode";

interface Reg {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  status: string;
  registrationCode: string;
  checkedInAt?: Date | null;
  checkIn?: { checkedInAt: Date; method: string } | null;
}

interface EventData {
  id: string;
  title: string;
  capacity?: number | null;
  registrations: Reg[];
}

interface Props {
  event: EventData;
  initialCheckedIn: number;
  total: number;
}

export function CheckinClient({ event, initialCheckedIn, total }: Props) {
  const [regs, setRegs] = useState<Reg[]>(event.registrations);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(initialCheckedIn);
  const [qrTarget, setQrTarget] = useState<Reg | null>(null);
  const [lastAction, setLastAction] = useState<{ name: string; success: boolean } | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const filteredRegs = regs.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.registrationCode.toLowerCase().includes(q)
    );
  });

  async function doCheckIn(regId: string, method = "manual") {
    setLoading(regId);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId, eventId: event.id, method }),
      });
      const data = await res.json();

      if (data.alreadyCheckedIn) {
        toast("Già in sede", { variant: "warning", description: `${data.reg.firstName} ${data.reg.lastName}` });
        setLastAction({ name: `${data.reg.firstName} ${data.reg.lastName}`, success: false });
        return;
      }
      if (!res.ok) throw new Error(data.error);

      const now = new Date();
      setRegs((prev) => prev.map((r) =>
        r.id === regId ? { ...r, checkedInAt: now, status: "CONFIRMED" } : r
      ));
      setCheckedInCount((c) => c + 1);
      const reg = regs.find((r) => r.id === regId);
      const name = `${reg?.firstName} ${reg?.lastName}`;
      toast(`Check-in: ${name}`, { variant: "success" });
      setLastAction({ name, success: true });
    } catch (e: unknown) {
      toast((e as Error).message || "Errore check-in", { variant: "error" });
      setLastAction({ name: "", success: false });
    } finally {
      setLoading(null);
    }
  }

  async function undoCheckIn(regId: string) {
    setLoading(regId);
    try {
      const res = await fetch("/api/checkin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId }),
      });
      if (!res.ok) throw new Error();
      setRegs((prev) => prev.map((r) =>
        r.id === regId ? { ...r, checkedInAt: null } : r
      ));
      setCheckedInCount((c) => Math.max(0, c - 1));
      toast("Check-in annullato", { variant: "default" });
    } catch {
      toast("Errore nell'annullamento", { variant: "error" });
    } finally {
      setLoading(null);
    }
  }

  const startScanner = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanning(true);

      // Dynamic import of jsQR for browser-only
      const jsQR = (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scan = () => {
        if (!videoRef.current || !scanning) return;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx?.drawImage(videoRef.current, 0, 0);
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            const reg = regs.find((r) => r.registrationCode === code.data);
            if (reg && !reg.checkedInAt) {
              doCheckIn(reg.id, "qr");
            }
          }
        }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch {
      toast("Camera non disponibile", { variant: "error" });
    }
  }, [regs, scanning]);

  function stopScanner() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  const pct = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

  return (
    <div className="p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{checkedInCount}</p>
            <p className="text-xs text-gray-500 mt-1">In sede</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-700">{total}</p>
            <p className="text-xs text-gray-500 mt-1">Attesi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${pct > 80 ? "text-green-600" : pct > 50 ? "text-blue-600" : "text-gray-600"}`}>{pct}%</p>
            <p className="text-xs text-gray-500 mt-1">Presenza</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-3 rounded-full bg-gray-100">
          <div
            className="h-3 rounded-full bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Last action feedback */}
      {lastAction && (
        <div className={`rounded-xl p-3 flex items-center gap-3 text-sm font-medium ${lastAction.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {lastAction.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {lastAction.success ? `✓ Check-in: ${lastAction.name}` : "Già registrato o errore"}
        </div>
      )}

      {/* Scanner + Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca nome, email o codice..."
            className="pl-9 h-11 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <Button
          variant={scanning ? "destructive" : "outline"}
          onClick={scanning ? stopScanner : startScanner}
          className="gap-2 h-11"
        >
          {scanning ? <><CameraOff className="h-4 w-4" />Stop</>  : <><Camera className="h-4 w-4" />Scansiona QR</>}
        </Button>
      </div>

      {/* QR Scanner video */}
      {scanning && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-64">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/80 rounded-xl w-40 h-40 opacity-70" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-white/80 text-xs">
            Inquadra il QR code del partecipante
          </p>
        </div>
      )}

      {/* Participants list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>{filteredRegs.length} partecipanti {search && `per "${search}"`}</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{regs.filter((r) => r.checkedInAt).length} check-in</span>
        </div>
        {filteredRegs.map((reg) => {
          const isCheckedIn = !!reg.checkedInAt;
          const isLoading = loading === reg.id;

          return (
            <div
              key={reg.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isCheckedIn ? "bg-green-50 border-green-200" : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isCheckedIn ? "bg-green-500" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                {isCheckedIn ? <CheckCircle2 className="h-5 w-5" /> : `${reg.firstName[0]}${reg.lastName[0]}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{reg.firstName} {reg.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{reg.email}</p>
                {reg.company && <p className="text-xs text-gray-400">{reg.company}</p>}
                {isCheckedIn && reg.checkedInAt && (
                  <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatDateTime(reg.checkedInAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={getStatusColor(reg.status)}>{getStatusLabel(reg.status)}</Badge>
                <button
                  onClick={() => setQrTarget(qrTarget?.id === reg.id ? null : reg)}
                  className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-700"
                >
                  <QrCode className="h-4 w-4" />
                </button>
                {isCheckedIn ? (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => undoCheckIn(reg.id)}
                    disabled={!!isLoading}
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Annulla
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => doCheckIn(reg.id)}
                    disabled={!!isLoading || reg.status === "CANCELLED"}
                    className="gap-1.5"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Check-in
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filteredRegs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nessun partecipante trovato</p>
          </div>
        )}
      </div>

      {/* QR code viewer */}
      {qrTarget && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="shadow-2xl border-2 border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-between mb-3">
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-900">{qrTarget.firstName} {qrTarget.lastName}</p>
                  <p className="text-xs text-gray-400 font-mono">{qrTarget.registrationCode}</p>
                </div>
                <button onClick={() => setQrTarget(null)} className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <XCircle className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <QRCode value={qrTarget.registrationCode} size={160} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
