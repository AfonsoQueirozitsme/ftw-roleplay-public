import React, { useEffect, useState } from "react";
import { listPlayerProperties, PropertyRow } from "@/lib/api/players";
import { Spinner, Section } from "./player-common";

export default function PropertiesTab({ playerId }: { playerId: string }) {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErro(null);
    listPlayerProperties(playerId)
      .then(res => { if (!alive) return; setRows(res.data); })
      .catch(e => setErro(e?.message ?? "Erro a carregar propriedades"))
      .finally(()=> alive && setLoading(false));
    return () => { alive = false; };
  }, [playerId]);

  if (loading) return <div className="flex items-center gap-2 text-white/70"><Spinner/>A carregar…</div>;
  if (erro) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{erro}</div>;

  return (
    <Section title="Propriedades">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map(p => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm font-medium">{p.label ?? p.address ?? "(sem nome)"}</div>
            <div className="text-xs text-white/60 mt-1">{p.type ?? "—"}</div>
            <div className="text-xs text-white/50 mt-2">Adquirido: {p.owned_at ? new Date(p.owned_at).toLocaleString("pt-PT") : "—"}</div>
            <div className="pt-3 flex gap-2">
              <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs">Transferir</button>
              <button className="px-2 py-1 rounded bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-xs">Remover</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="col-span-full text-white/60">Sem propriedades.</div>}
      </div>
    </Section>
  );
}
