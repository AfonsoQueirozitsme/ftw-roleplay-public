// src/pages/static/Events.tsx
import React, { useMemo, useState, useEffect } from "react";
import StaticPageShell from "./StaticPageShell";
import { supabase } from "@/lib/supabase";
import UltraSpinner from "@/components/layout/Spinner";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  tags: string[] | null;
  starts_at: string;
  ends_at: string | null;
};

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999); }

export default function Events() {
  const [when, setWhen] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);

  const range = useMemo(() => {
    const start = startOfMonth(when);
    const end = endOfMonth(when);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [when]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,location,tags,starts_at,ends_at")
        .gte("starts_at", range.start)
        .lte("starts_at", range.end)
        .order("starts_at", { ascending: true });
      if (!error) setEvents((data as EventRow[]) ?? []);
      setLoading(false);
    })();
  }, [range.start, range.end]);

  const monthName = when.toLocaleString("pt-PT", { month: "long", year: "numeric" });
  const daysInMonth = new Date(when.getFullYear(), when.getMonth()+1, 0).getDate();
  const firstWeekday = new Date(when.getFullYear(), when.getMonth(), 1).getDay() || 7; // PT starts Monday? We'll render Mo..Su.

  const matrix: Array<{ day: number | null; has: boolean }> = [];
  for (let i = 1; i < firstWeekday; i++) matrix.push({ day: null, has: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(when.getFullYear(), when.getMonth(), d).toISOString().slice(0,10);
    const has = events.some(e => e.starts_at.slice(0,10) === iso);
    matrix.push({ day: d, has });
  }

  return (
    <StaticPageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold" style={{ fontFamily: "Goldman, system-ui, sans-serif" }}>
          Eventos
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setWhen(new Date(when.getFullYear(), when.getMonth()-1, 1))}
            className="px-3 py-2 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition"
          >
            Mês anterior
          </button>
          <button
            onClick={() => setWhen(new Date())}
            className="px-3 py-2 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition"
          >
            Hoje
          </button>
          <button
            onClick={() => setWhen(new Date(when.getFullYear(), when.getMonth()+1, 1))}
            className="px-3 py-2 border border-[#6c6c6c] hover:bg-[#fbfbfb]/10 transition"
          >
            Próximo mês
          </button>
        </div>
      </div>

      <div className="mb-3 text-[#fbfbfb]/70 uppercase tracking-wider text-xs">{monthName}</div>

      {/* Calendário */}
      <div className="border border-[#6c6c6c]">
        <div className="grid grid-cols-7 text-center text-xs border-b border-[#6c6c6c]">
          {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((w) => (
            <div key={w} className="py-2">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {matrix.map((cell, idx) => (
            <div key={idx} className="aspect-square border-r border-b border-[#6c6c6c] last:border-r-0">
              {cell.day && (
                <div className="h-full w-full p-2 relative">
                  <div className="text-sm opacity-80">{cell.day}</div>
                  {cell.has && <div className="absolute right-2 top-2 h-1.5 w-1.5 bg-[#e53e30]" />}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lista */}
      <h2 className="mt-10 mb-4 text-xl font-bold">Próximos eventos</h2>
      {loading ? (
        <div className="py-12 grid place-items-center"><UltraSpinner size={64} label="A carregar…" /></div>
      ) : events.length === 0 ? (
        <p className="opacity-75">Sem eventos neste período.</p>
      ) : (
        <ul className="divide-y divide-[#fbfbfb]">
          {events.map((e) => {
            const d = new Date(e.starts_at);
            const dia = d.getDate().toString().padStart(2,"0");
            const mes = d.toLocaleString("pt-PT",{ month:"short" });
            const ano = d.getFullYear();
            return (
              <li key={e.id} className="py-4 grid md:grid-cols-[120px_1fr] gap-4">
                <div className="text-center">
                  <div className="text-4xl leading-none font-extrabold">{dia}</div>
                  <div className="text-sm uppercase">{mes}</div>
                  <div className="text-xs opacity-70">{ano}</div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{e.title}</h3>
                    {e.location && <span className="text-xs opacity-70">{e.location}</span>}
                  </div>
                  {e.description && <p className="opacity-80 mt-1">{e.description}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </StaticPageShell>
  );
}
