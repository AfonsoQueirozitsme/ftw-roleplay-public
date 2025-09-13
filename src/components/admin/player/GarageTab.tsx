import React, { useEffect, useState } from "react";
import { listPlayerVehicles, VehicleRow } from "@/lib/api/players";
import { Spinner, Section } from "./player-common";

export default function GarageTab({ playerId }: { playerId: string }) {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErro(null);
    listPlayerVehicles(playerId)
      .then(res => { if (!alive) return; setRows(res.data); })
      .catch(e => setErro(e?.message ?? "Erro a carregar viaturas"))
      .finally(()=> alive && setLoading(false));
    return () => { alive = false; };
  }, [playerId]);

  if (loading) return <div className="flex items-center gap-2 text-white/70"><Spinner/>A carregar…</div>;
  if (erro) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{erro}</div>;

  return (
    <Section title="Garagem">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/60 bg-white/5">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>Matrícula</th><th>Modelo</th><th>Garagem</th><th>Fuel</th><th>Motor</th><th>Carroçaria</th><th>Estado</th><th className="w-1 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-white/90">
            {rows.map(v => (
              <tr key={v.id} className="border-t border-white/10">
                <td className="px-3 py-2">{v.plate}</td>
                <td className="px-3 py-2">{v.model}</td>
                <td className="px-3 py-2">{v.garage ?? "—"}</td>
                <td className="px-3 py-2">{v.fuel ?? "—"}</td>
                <td className="px-3 py-2">{v.engine ?? "—"}</td>
                <td className="px-3 py-2">{v.body ?? "—"}</td>
                <td className="px-3 py-2">{v.stored ? "Arrumado" : "Fora"}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs">Dar chaves</button>
                    <button className="px-2 py-1 rounded bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-xs">Apreender</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-white/60">Sem viaturas.</td></tr>}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
