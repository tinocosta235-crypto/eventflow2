import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OrganizationPage() {
  return (
    <DashboardLayout>
      <Header
        title="Organization"
        subtitle="Gestisci utenti, branding e asset riutilizzabili a livello organizzazione"
      />
      <div className="p-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Ruoli, permessi e assegnazioni eventi.
            <div className="mt-3">
              <Link href="/settings/team" className="text-cyan-300 hover:underline">
                Apri Team Access
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Branding</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Logo, colori e identità visuale globale.
            <div className="mt-3">
              <Link href="/settings/org" className="text-cyan-300 hover:underline">
                Apri Branding
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Sender identity e impostazioni email condivise.
            <div className="mt-3">
              <Link href="/settings/email" className="text-cyan-300 hover:underline">
                Apri Email Infrastructure
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hospitality Assets</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Hotel e fornitori riutilizzabili su più eventi.
            <div className="mt-3">
              <Link href="/hotels" className="text-cyan-300 hover:underline">
                Apri Asset Hospitality
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
