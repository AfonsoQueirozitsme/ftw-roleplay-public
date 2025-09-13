import React from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function Field({ label, children, hint, full = false }: { label: string; children: React.ReactNode; hint?: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/80 mb-1">{label}</div>
        {hint ? <div className="text-xs text-white/50">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export type Obj = Record<string, any>;
export type InvItem = { id: string; raw: Obj; qtyKey: string; qty: number; name: string; label?: string|null; slot?: number|null; };

export function parseMaybeJson(v: any) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try { return JSON.parse(String(v)); } catch { return null; }
}
export function deepEq(a: any, b: any) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
export function cryptoRandomId() {
  try { const buf = new Uint8Array(8); crypto.getRandomValues(buf); return Array.from(buf).map(b => b.toString(16).padStart(2,"0")).join(""); }
  catch { return String(Math.random()).slice(2); }
}

export function toInvItems(value: any): InvItem[] {
  const arr = Array.isArray(value) ? value : parseMaybeJson(value);
  if (!Array.isArray(arr)) return [];
  return arr.map((it: Obj, i: number) => {
    const qtyKey = ["amount","count","quantity","qty"].find(k => typeof it?.[k] === "number") || "amount";
    const qty = Number(it?.[qtyKey] ?? 0) || 0;
    const name = String(it?.name ?? it?.item ?? it?.label ?? `item_${i}`);
    const label = it?.label ?? null;
    const slot = (typeof it?.slot === "number") ? it.slot : null;
    return { id: cryptoRandomId(), raw: { ...it }, qtyKey, qty, name, label, slot };
  });
}
export function fromInvItems(items: InvItem[]): any[] {
  return items.map(({ raw, qtyKey, qty, name, label, slot }) => {
    const out = { ...raw };
    out[qtyKey] = qty;
    if ("name" in out) out.name = name; else if ("item" in out) out.item = name;
    if (label != null) out.label = label; else delete out.label;
    if (typeof slot === "number") out.slot = slot; else delete out.slot;
    return out;
  });
}

/* Edits */
export function CharInfoEditor({ value, onChange }: { value: Obj | null; onChange: (v: Obj | null) => void }) {
  const v = { ...(value || {}) };
  const set = (k: string, val: any) => {
    const next = { ...(value || {}) };
    if (val === "" || val == null) delete next[k]; else next[k] = val;
    onChange(Object.keys(next).length ? next : null);
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Field label="Primeiro nome"><input value={v.firstname ?? ""} onChange={(e)=>set("firstname", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
      <Field label="Último nome"><input value={v.lastname ?? ""} onChange={(e)=>set("lastname", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
      <Field label="Data de nascimento"><input type="date" value={v.birthdate ?? ""} onChange={(e)=>set("birthdate", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
      <Field label="Género"><input value={v.gender ?? ""} onChange={(e)=>set("gender", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
      <Field label="Nacionalidade"><input value={v.nationality ?? ""} onChange={(e)=>set("nationality", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
      <Field label="Altura (cm)"><input type="number" value={v.height ?? ""} onChange={(e)=>set("height", Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
    </div>
  );
}

export function JobGangEditor({ value, onChange, label = "Job" }: { value: Obj | null; onChange: (v: Obj | null) => void; label?: string; }) {
  const v = { ...(value || {}) };
  const set = (k: string, val: any) => {
    const next = { ...(value || {}) };
    if (val === "" || val == null) delete next[k]; else next[k] = val;
    onChange(Object.keys(next).length ? next : null);
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Field label={`${label} label`}><input value={v.label ?? ""} onChange={(e)=>set("label", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
      <Field label={`${label} name`}><input value={v.name ?? ""} onChange={(e)=>set("name", e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
      <Field label="Grau (grade)"><input type="number" value={v.grade ?? ""} onChange={(e)=>set("grade", Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/></Field>
    </div>
  );
}

export function KeyValueNumberEditor({ value, onChange, knownKeys = [], titleAdd = "Adicionar" }: { value: Obj | null; onChange: (v: Obj | null) => void; knownKeys?: string[]; titleAdd?: string; }) {
  const data = { ...(value || {}) } as Obj;
  const keys = Array.from(new Set([...knownKeys, ...Object.keys(data)]));
  const set = (k: string, v: any) => {
    const next = { ...(value || {}) } as Obj;
    if (v === "" || v === null || Number.isNaN(v)) delete next[k]; else next[k] = v;
    onChange(Object.keys(next).length ? next : null);
  };
  const addKey = () => {
    let base = "novo"; let i = 1;
    while (keys.includes(`${base}${i}`)) i++;
    set(`${base}${i}`, 0);
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {keys.map((k) => {
          const v = data[k];
          const isNum = typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v ?? ""));
          return (
            <div key={k} className="flex items-center gap-2">
              <div className="min-w-28 text-xs text-white/60">{k}</div>
              <input type={isNum ? "number" : "text"} value={v ?? ""} onChange={(e)=>set(k, isNum ? Number(e.target.value) : e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-black/30 text-white px-2 py-1.5 outline-none"/>
              <button type="button" className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs" onClick={()=>set(k,"")}>Remover</button>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={addKey} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-sm">{titleAdd}</button>
    </div>
  );
}

export function InventoryEditor({ items, setItems }: { items: InvItem[]; setItems: (fn: (prev: InvItem[]) => InvItem[]) => void; }) {
  const addItem = () => setItems(prev => [...prev, { id: cryptoRandomId(), raw: { name: "novo_item" }, qtyKey: "amount", qty: 1, name: "novo_item", label: "", slot: null }]);
  const update = (id: string, patch: Partial<InvItem>) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  const remove = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const duplicate = (id: string) => setItems(prev => { const it = prev.find(x=>x.id===id); if (!it) return prev; return [...prev, { ...structuredClone(it), id: cryptoRandomId(), name: `${it.name}_copy` }]; });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70 text-xs">🧩</div>
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-white/60 mb-1">Item</div>
                    <input value={it.name} onChange={(e)=>update(it.id,{ name: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-2 py-1.5 outline-none"/>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-1">Etiqueta</div>
                    <input value={it.label ?? ""} onChange={(e)=>update(it.id,{ label: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-2 py-1.5 outline-none"/>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs text-white/60 mb-1">Quantidade</div>
                    <input type="number" value={it.qty} onChange={(e)=>update(it.id,{ qty: Math.max(0, Number(e.target.value)) })} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-2 py-1.5 outline-none"/>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-1">Slot</div>
                    <input type="number" value={it.slot ?? ""} onChange={(e)=>update(it.id,{ slot: e.target.value===""? null : Number(e.target.value) })} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-2 py-1.5 outline-none"/>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-1">Campo Qt.</div>
                    <select value={it.qtyKey} onChange={(e)=>update(it.id,{ qtyKey: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-2 py-1.5 outline-none">
                      {["amount","count","quantity","qty"].map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-white/40">ID: {it.id.slice(0,6)}</div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs" onClick={()=>duplicate(it.id)}>Duplicar</button>
                    <button type="button" className="px-2 py-1 rounded bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-xs" onClick={()=>remove(it.id)}>Apagar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/10 p-6 text-center text-white/60">Inventário vazio.</div>
        )}
      </div>
      <button type="button" onClick={addItem} className="px-3 py-2 rounded bg-white text-black hover:opacity-90 text-sm">+ Adicionar item</button>
    </div>
  );
}
