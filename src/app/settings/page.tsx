import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, User, Bell, Globe, Key, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <Header title="Impostazioni" subtitle="Configura il tuo account e la piattaforma" />

      <div className="p-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Profilo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Nome</label>
                <Input defaultValue="Admin" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Cognome</label>
                <Input defaultValue="EventFlow" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Email</label>
              <Input type="email" defaultValue="admin@eventflow.it" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Organizzazione</label>
              <Input defaultValue="EventFlow Srl" />
            </div>
            <Button size="sm">Salva Profilo</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-yellow-500" />
              Notifiche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Nuova iscrizione", desc: "Ricevi email per ogni nuova iscrizione" },
              { label: "Evento quasi pieno", desc: "Avviso quando si supera il 90% di capienza" },
              { label: "Promemoria evento", desc: "Promemoria 24h prima di ogni evento" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <button className="h-6 w-11 rounded-full bg-blue-600 relative flex-shrink-0">
                  <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-red-500" />
              API & Integrazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">API Key</label>
              <div className="flex gap-2">
                <Input type="password" defaultValue="ef_live_xxxxxxxxxxxxxxxxxxxxxxxx" readOnly className="font-mono text-xs" />
                <Button variant="outline" size="sm">Copia</Button>
                <Button variant="outline" size="sm">Rigenera</Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Webhook URL</label>
              <Input placeholder="https://tuosito.it/webhook/eventflow" />
            </div>
            <Button size="sm">Salva</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
