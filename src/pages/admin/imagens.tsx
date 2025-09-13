import React, { useEffect, useMemo, useState } from "react";
import { listImages, getImageUrl, type ImageRow } from "@/lib/api/images";
import { Spinner } from "@/components/admin/player/player-common";

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(()=>{ const t=setTimeout(()=>setD(v), ms); return ()=>clearTimeout(t); }, [v, ms]);
  return d;
}

export default function ImagesPage() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [bucket, setBucket] = useState("");
  const [visibility, setVisibility] = useState<"all"|"public"|"private">("all");
  const [mime, setMime] = useState("image/");
  const [user, setUser] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo]     = useState<string>("");
  const [minSize, setMinSize] = useState<string>("");
  const [maxSize, setMaxSize] = useState<string>("");

  const [page, setPage] = useState(1);
  const limit = 24;

  const [rows, setRows] = useState<ImageRow[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // preview modal
  const [open, setOpen] = useState<{ row: ImageRow; url: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErro(null);
    listImages({
      q: dq,
      bucket: bucket || undefined,
      visibility,
      mime: mime || undefined,
      user: user || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      minSize: minSize ? Number(minSize) : undefined,
      maxSize: maxSize ? Number(maxSize) : undefined,
      page,
      limit,
      dir: "desc",
    })
      .then(res => { if (!alive) return; setRows(res.data); setTotal(res.total); })
      .catch(e => setErro(e?.message ?? "Erro a carregar imagens"))
      .finally(()=> alive && setLoading(false));
    return () => { alive = false; };
  }, [dq, bucket, visibility, mime, user, from, to, minSize, maxSize, page]);

  const skeleton = useMemo(() => Array.from({ length: limit }, (_, i) => i), [limit]);

  const openPreview = async (row: ImageRow) => {
    try {
      const url = await getImageUrl(row);
      setOpen({ row, url });
    } catch (e: any) {
      alert(e?.message ?? "Falha a gerar URL da imagem.");
    }
  };

  const fmtSize = (b?: number | null) => {
    if (!b && b !== 0) return "—";
    const units = ["B","KB","MB","GB"];
    let n = Number(b); let i = 0;
    while (n >= 1024 && i < units.length-1) { n/=1024; i++; }
    return `${n.toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Imagens</h2>
          <p className="text-white/70 text-sm">Filtra por bucket, visibilidade, MIME, utilizador, datas e tamanho.</p>
        </div>
        <div className="text-sm text-white/60">{total} ficheiro{total===1?"":"s"}</div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} placeholder="Pesquisar path / checksum…" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input value={bucket} onChange={(e)=>{ setBucket(e.target.value); setPage(1); }} placeholder="Bucket" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <select value={visibility} onChange={(e)=>{ setVisibility(e.target.value as any); setPage(1); }} className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none">
            <option value="all">Visibilidade: Todas</option>
            <option value="public">Pública</option>
            <option value="private">Privada</option>
          </select>
          <input value={mime} onChange={(e)=>{ setMime(e.target.value); setPage(1); }} placeholder="MIME (ex.: image/)" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={user} onChange={(e)=>{ setUser(e.target.value); setPage(1); }} placeholder="Utilizador (UUID ou email)" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input type="datetime-local" value={from} onChange={(e)=>{ setFrom(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input type="datetime-local" value={to} onChange={(e)=>{ setTo(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input type="number" value={minSize} onChange={(e)=>{ setMinSize(e.target.value); setPage(1); }} placeholder="Min bytes" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
          <input type="number" value={maxSize} onChange={(e)=>{ setMaxSize(e.target.value); setPage(1); }} placeholder="Max bytes" className="rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 text-sm outline-none" />
        </div>
      </div>

      {/* Grelha */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading ? (
          skeleton.map(i => (
            <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3 animate-pulse">
              <div className="aspect-square w-full rounded-lg bg-white/10" />
              <div className="h-3 w-3/4 bg-white/10 rounded mt-2" />
              <div className="h-3 w-1/3 bg-white/10 rounded mt-1" />
            </div>
          ))
        ) : rows.map(f => (
          <div key={f.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
              {String(f.mime || "").startsWith("image/") ? (
                <Thumb row={f} onClick={()=>openPreview(f)} />
              ) : (
                <div className="text-white/50 text-sm">sem preview</div>
              )}
            </div>
            <div className="mt-2 text-xs text-white/80 truncate" title={f.path}>{f.path}</div>
            <div className="text-[11px] text-white/50 mt-1">
              {f.bucket} · {f.visibility} · {fmtSize(f.size_bytes)}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              {f.user_email ?? f.uploaded_by ?? "—"} · {new Date(f.uploaded_at).toLocaleString("pt-PT")}
            </div>
            <div className="mt-2 flex gap-2">
              <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs" onClick={()=>openPreview(f)}>Abrir</button>
            </div>
          </div>
        ))}

        {!loading && rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-white/10 bg-black/20 p-6 text-center text-white/60">
            Sem resultados.
          </div>
        )}
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="text-white/60">Página {page} de {totalPages}</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15">Anterior</button>
          <button disabled={page>=totalPages || loading} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15">Seguinte</button>
        </div>
      </div>

      {erro && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{erro}</div>}

      {/* Modal preview */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setOpen(null)} />
          <div className="absolute left-1/2 top-1/2 w-[min(96vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0b0c] text-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Preview</div>
              <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15" onClick={()=>setOpen(null)}>Fechar</button>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={open.url} alt={open.row.path} className="max-h-[70vh] w-full object-contain" />
            </div>
            <div className="mt-2 text-xs text-white/60">{open.row.bucket} / {open.row.path}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({ row, onClick }: { row: any; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getImageUrl(row).then(u => { if (!alive) return; setUrl(u); }).catch(e => setErr(e?.message ?? "erro"));
    return () => { alive = false; };
  }, [row.bucket, row.path, row.visibility]);

  if (err) return <div className="text-white/50 text-xs p-2">erro</div>;
  if (!url) return <div className="h-8 w-8"><Spinner /></div>;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={url} className="h-full w-full object-cover cursor-zoom-in" onClick={onClick} />;
}
