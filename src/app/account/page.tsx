import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <DashboardLayout>
      <Header
        title="Account"
        subtitle="Gestisci profilo personale, sicurezza e preferenze notifiche"
      />
      <div className="p-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Dati profilo, immagine, email e impostazioni personali.
            <div className="mt-3">
              <Link href="/settings/profile" className="text-cyan-300 hover:underline">
                Apri profilo
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Password, sessioni e preferenze sicurezza account.
            <div className="mt-3">
              <Link href="/settings/profile" className="text-cyan-300 hover:underline">
                Configura sicurezza
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
