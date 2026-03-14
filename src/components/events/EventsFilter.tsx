"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, LayoutGrid, List, SlidersHorizontal } from "lucide-react";

const EVENT_TYPES = [
  { value: "", label: "Tutti i tipi" },
  { value: "CONFERENCE", label: "Conferenza" },
  { value: "SEMINAR", label: "Seminario" },
  { value: "WEBINAR", label: "Webinar" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "GALA_DINNER", label: "Cena di Gala" },
  { value: "TRADE_SHOW", label: "Fiera/Expo" },
  { value: "PRODUCT_LAUNCH", label: "Lancio Prodotto" },
  { value: "NETWORKING", label: "Networking" },
  { value: "HYBRID", label: "Ibrido" },
];

const STATUSES = [
  { value: "", label: "Tutti gli stati" },
  { value: "DRAFT", label: "Bozza" },
  { value: "PUBLISHED", label: "Pubblicato" },
  { value: "CLOSED", label: "Chiuso" },
  { value: "CANCELLED", label: "Annullato" },
];

const SORTS = [
  { value: "createdAt_desc", label: "Più recenti" },
  { value: "startDate_asc", label: "Prima data inizio" },
  { value: "startDate_desc", label: "Ultima data inizio" },
  { value: "participants_desc", label: "Più partecipanti" },
  { value: "fill_desc", label: "Maggior riempimento" },
];

interface EventsFilterProps {
  view: "list" | "grid";
  hideStatus?: boolean;
}

export function EventsFilter({ view, hideStatus = false }: EventsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== "page") params.delete("page");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const sort = searchParams.get("sort") ?? "createdAt_desc";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          value={q}
          onChange={(e) => update("q", e.target.value)}
          placeholder="Cerca evento..."
          className="h-9 w-full pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="h-4 w-4 text-gray-400 flex-shrink-0" />

        {/* Status filter (hidden when tabs are used) */}
        {!hideStatus && (
          <select
            value={status}
            onChange={(e) => update("status", e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}

        {/* Type filter */}
        <select
          value={type}
          onChange={(e) => update("type", e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => update("view", "list")}
            className={`h-9 w-9 flex items-center justify-center transition-colors ${view === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => update("view", "grid")}
            className={`h-9 w-9 flex items-center justify-center transition-colors ${view === "grid" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
