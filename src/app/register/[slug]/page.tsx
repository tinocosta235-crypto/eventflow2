import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Calendar, MapPin, Globe, Users, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug }, select: { title: true } });
  return { title: event ? `Registrati — ${event.title}` : "Evento non trovato" };
}

export default async function PublicRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true, title: true, description: true, slug: true,
      startDate: true, endDate: true, timezone: true,
      location: true, city: true, country: true, online: true, website: true,
      capacity: true, currentCount: true, status: true, eventType: true,
      organizerName: true, organizerEmail: true,
      formFields: { orderBy: { order: "asc" } },
    },
  });

  if (!event) notFound();
  if (event.status !== "PUBLISHED") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Registrazioni non disponibili</h1>
          <p className="text-gray-500">Questo evento non è ancora aperto alle registrazioni.</p>
        </div>
      </div>
    );
  }

  const isFull = event.capacity != null && event.currentCount >= event.capacity;
  const spotsLeft = event.capacity != null ? event.capacity - event.currentCount : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="font-bold text-gray-900">EventFlow</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Event card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
            {event.description && (
              <p className="text-blue-100 text-sm leading-relaxed">{event.description}</p>
            )}
          </div>
          <div className="p-6 grid grid-cols-2 gap-4 text-sm">
            {event.startDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Data inizio</p>
                  <p className="font-medium text-gray-900">{formatDateTime(event.startDate)}</p>
                </div>
              </div>
            )}
            {event.endDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Data fine</p>
                  <p className="font-medium text-gray-900">{formatDateTime(event.endDate)}</p>
                </div>
              </div>
            )}
            {event.online ? (
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Modalità</p>
                  <p className="font-medium text-gray-900">Evento online</p>
                </div>
              </div>
            ) : (event.location || event.city) ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Luogo</p>
                  <p className="font-medium text-gray-900">{[event.location, event.city].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            ) : null}
            {event.capacity && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Posti disponibili</p>
                  <p className={`font-medium ${isFull ? "text-red-600" : spotsLeft && spotsLeft <= 10 ? "text-orange-600" : "text-gray-900"}`}>
                    {isFull ? "Evento al completo (lista d'attesa)" : spotsLeft != null ? `${spotsLeft} posti rimasti` : `${event.capacity} posti`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Registration form */}
        <RegisterForm
          eventSlug={slug}
          formFields={event.formFields}
          isFull={isFull}
        />

        {/* Footer */}
        {event.organizerEmail && (
          <p className="text-center text-xs text-gray-400">
            Per informazioni: <a href={`mailto:${event.organizerEmail}`} className="text-blue-600 hover:underline">{event.organizerEmail}</a>
          </p>
        )}
        <p className="text-center text-xs text-gray-300">
          Powered by EventFlow
        </p>
      </div>
    </div>
  );
}
