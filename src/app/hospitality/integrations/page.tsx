import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Plug, Hotel as HotelIcon, Globe, Zap } from "lucide-react";

const integrations = [
  { name: "Booking.com", description: "Sincronizza disponibilità e tariffe hotel", icon: Globe, status: "coming_soon", color: "#003580" },
  { name: "Expedia", description: "Gestisci prenotazioni e tariffe corporate", icon: Globe, status: "coming_soon", color: "#FFC72C" },
  { name: "HRS", description: "Piattaforma B2B per prenotazioni aziendali", icon: HotelIcon, status: "coming_soon", color: "#E4002B" },
  { name: "Airbnb for Work", description: "Alloggi alternativi per team e ospiti", icon: Globe, status: "coming_soon", color: "#FF5A5F" },
  { name: "Amadeus", description: "GDS per voli, hotel e auto", icon: Zap, status: "coming_soon", color: "#0066CC" },
  { name: "TravelPerk", description: "Gestione viaggi aziendali completa", icon: Plug, status: "coming_soon", color: "#7B5EA7" },
];

export default function IntegrationsPage() {
  return (
    <DashboardLayout>
      <Header
        title="Integrazioni"
        subtitle="Connetti Phorma alle piattaforme di viaggio e hospitality"
      />
      <div className="p-8">
        <div className="max-w-3xl">
          <div
            className="rounded-2xl p-6 mb-8 flex items-start gap-4"
            style={{
              background: "linear-gradient(135deg, rgba(0,113,227,0.06), rgba(88,86,214,0.06))",
              border: "0.5px solid rgba(0,113,227,0.15)",
            }}
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,113,227,0.1)" }}>
              <Plug className="h-5 w-5" style={{ color: "#0071E3" }} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "#1D1D1F" }}>Integrazioni in arrivo</p>
              <p className="text-sm leading-relaxed" style={{ color: "#6E6E73" }}>
                Stiamo lavorando per connettere Phorma alle principali piattaforme di hospitality e travel. Le integrazioni ti permetteranno di sincronizzare disponibilità, tariffe e prenotazioni direttamente dalla piattaforma.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                style={{
                  background: "#FFFFFF",
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${integration.color}15` }}
                >
                  <integration.icon className="h-5 w-5" style={{ color: integration.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#1D1D1F" }}>{integration.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6E6E73" }}>{integration.description}</p>
                </div>
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "rgba(0,0,0,0.05)", color: "#86868B" }}
                >
                  Prossimamente
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
