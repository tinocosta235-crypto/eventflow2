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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center gap-3 flex-shrink-0 z-10">
        <Link
          href={`/events/${id}`}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          title="Torna all'evento"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="h-4 w-px bg-gray-200" />

        <span className="text-sm font-medium text-gray-900 truncate max-w-[240px]">{event.title}</span>
        <span className="text-xs text-gray-400">Form di registrazione</span>

        <div className="flex-1" />

        {event.status === "PUBLISHED" && (
          <Link
            href={`/register/${event.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Vedi form pubblico
          </Link>
        )}
      </div>

      {/* Form Builder — takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <FormBuilder eventId={id} eventSlug={event.slug} initialFields={event.formFields} />
      </div>
    </div>
  );
}
