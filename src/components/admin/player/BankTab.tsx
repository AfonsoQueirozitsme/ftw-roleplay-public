import React, { useEffect, useMemo, useState } from "react";
import { getPlayerBank, listPlayerTransactions, BankInfo, TransactionRow } from "@/lib/api/players";
import { Spinner, Section } from "./player-common";

export default function BankTab({ playerId }: { playerId: string }) {
  const [bank, setBank] = useState<BankInfo | null>(null);
  const [tx, setTx] = useState<TransactionRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string|null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    let alive = true;
    setLoading(true); setErro(null);
    Promise.all([
      getPlayerBank(playerId),
      listPlayerTransactions(playerId, { page, limit }),
    ]).then(([b, t]) => {
      if (!alive) return;
      setBank(b.data);
      setTx(t.data);
      setTotal(t.total);
    }).catch(e => setErro(e?.message ?? "Erro a carregar banco"))
      .finally(()=> alive && setLoading(false));
    return () => { alive = false; };
  }, [playerId, page]);

  if (loading) return <div className="flex items-center gap-2 text-white/70"><Spinner/>A carregar…</div>;
  if (erro) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{erro}</div>;

  return (
    <div className="space-y-4">
      <Section title="Saldos">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(bank?.balances ?? {}).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">{k.toUpperCase()}</div>
              <div className="text-2xl font-semibold">{Number(v).toLocaleString("pt-PT")} $</div>
            </div>
          ))}
          {(!bank || Object.keys(bank.balances || {}).length === 0) && (
            <div className="text-white/60">Sem informação de saldos.</div>
          )}
        </div>
      </Section>

      <Section title="Transações">
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="text-white/60 bg-white/5">
              <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                <th>Data</th><th>Tipo</th><th>Valor</th><th>Descrição</th><th>Saldo após</th>
              </tr>
            </thead>
            <tbody className="text-white/90">
              {tx.map(r => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{new Date(r.ts).toLocaleString("pt-PT")}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className={`px-3 py-2 ${r.amount >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {r.amount >= 0 ? "+" : ""}{Number(r.amount).toLocaleString("pt-PT")} $
                  </td>
                  <td className="px-3 py-2">{r.desc ?? "—"}</td>
                  <td className="px-3 py-2">{r.balance_after != null ? `${Number(r.balance_after).toLocaleString("pt-PT")} $` : "—"}</td>
                </tr>
              ))}
              {tx.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-white/60">Sem transações.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 text-sm">
          <div className="text-white/60">Página {page} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1, p-1))} className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15">Anterior</button>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages, p+1))} className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15">Seguinte</button>
          </div>
        </div>
      </Section>
    </div>
  );
}
