"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "already"; eventTitle: string }
  | { status: "ready"; eventTitle: string; firstName: string }
  | { status: "done"; eventTitle: string };

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Link non valido o scaduto" });
      return;
    }

    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          setState({ status: "error", message: data.error ?? "Link non valido o scaduto" });
          return;
        }
        if (data.alreadyUnsubscribed) {
          setState({ status: "already", eventTitle: data.eventTitle });
        } else {
          setState({ status: "ready", eventTitle: data.eventTitle, firstName: data.firstName });
        }
      })
      .catch(() => {
        setState({ status: "error", message: "Errore di connessione. Riprova più tardi." });
      });
  }, [token]);

  async function confirm() {
    setConfirming(true);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState({
          status: "error",
          message: data.error ?? "Errore durante la disiscrizione. Riprova.",
        });
        return;
      }
      setState({ status: "done", eventTitle: data.eventTitle });
    } catch {
      setState({ status: "error", message: "Errore di connessione. Riprova più tardi." });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            style={{ background: "#7060CC" }}
            className="rounded-xl w-9 h-9 flex items-center justify-center"
          >
            <span className="text-white font-black text-lg leading-none">P</span>
          </div>
          <span className="text-gray-900 font-bold text-xl tracking-tight">Phorma</span>
        </div>

        {state.status === "loading" && (
          <div className="text-center py-6">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7060CC]" />
            <p className="mt-3 text-sm text-gray-500">Caricamento in corso...</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Link non valido</h1>
            <p className="text-sm text-gray-500">{state.message}</p>
          </div>
        )}

        {state.status === "already" && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Già disiscritto</h1>
            <p className="text-sm text-gray-500">
              Sei già disiscritto dalle comunicazioni di{" "}
              <strong className="text-gray-700">{state.eventTitle}</strong>.
            </p>
          </div>
        )}

        {state.status === "ready" && (
          <div className="py-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Disiscrizione comunicazioni
            </h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Sei sicuro di volerti disiscrivere dalle comunicazioni di{" "}
              <strong className="text-gray-700">{state.eventTitle}</strong>?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={confirm}
                disabled={confirming}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "#7060CC" }}
              >
                {confirming ? "Elaborazione..." : "Confermo, disiscrivimi"}
              </button>
              <button
                onClick={() => window.history.back()}
                disabled={confirming}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {state.status === "done" && (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(112,96,204,0.12)" }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: "#7060CC" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Disiscrizione completata</h1>
            <p className="text-sm text-gray-500">
              Non riceverai più email per l&apos;evento{" "}
              <strong className="text-gray-700">{state.eventTitle}</strong>.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-gray-400">
          Phorma · Tutti i diritti riservati
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7060CC]" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
