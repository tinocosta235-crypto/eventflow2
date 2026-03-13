import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { FormBuilder } from "./FormBuilder";

export const dynamic = "force-dynamic";

export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true, title: true, slug: true, status: true,
      formFields: { orderBy: { order: "asc" } },
    },
  });

  if (!event) notFound();

  return (
    <DashboardLayout>
      <Header
        title="Form di registrazione"
        subtitle={event.title}
        actions={
          <div className="flex gap-2">
            <Link href={`/events/${id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />Indietro
              </Button>
            </Link>
            {event.status === "PUBLISHED" && (
              <Link href={`/register/${event.slug}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />Vedi form pubblico
                </Button>
              </Link>
            )}
          </div>
        }
      />
      <FormBuilder eventId={id} initialFields={event.formFields} slug={event.slug} />
    </DashboardLayout>
  );
}
