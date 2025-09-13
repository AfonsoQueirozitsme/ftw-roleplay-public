
import React, { useMemo, useState } from "react";
import { Section, Field, CharInfoEditor, JobGangEditor, KeyValueNumberEditor, InventoryEditor,
         parseMaybeJson, deepEq, toInvItems, fromInvItems, InvItem } from "./player-common";

type Obj = Record<string, any>;

export default function PlayersTab({
  data, orig, onPatch,
}: {
  data: Obj; orig: Obj;
  onPatch: (patch: Obj) => Promise<void>;
}) {
  const [state, setState] = useState<Obj>(() => ({
    name: data.name ?? "",
    phone_number: data.phone_number ?? "",
    charinfo: parseMaybeJson(data.charinfo),
    job: parseMaybeJson(data.job),
    gang: parseMaybeJson(data.gang),
    money: parseMaybeJson(data.money),
    position: parseMaybeJson(data.position),
    metadata: parseMaybeJson(data.metadata),
  }));

  const [invItems, setInvItems] = useState<InvItem[]>(
    () => toInvItems(parseMaybeJson(data.inventory))
  );

  const hasChanges = useMemo(() => {
    const keys: (keyof typeof state)[] = ["name","phone_number","charinfo","job","gang","money","position","metadata"];
    const objChanged = keys.some(k => !deepEq(state[k], parseMaybeJson(orig[k])));
    const invChanged = !deepEq(fromInvItems(invItems), parseMaybeJson(orig.inventory));
    return objChanged || invChanged;
  }, [state, invItems, orig]);

  const save = async () => {
    const patch: Obj = {};
    const keys: (keyof typeof state)[] = ["name","phone_number","charinfo","job","gang","money","position","metadata"];
    for (const k of keys) {
      const now = state[k];
      const was = parseMaybeJson(orig[k]);
      if (!deepEq(now, was)) patch[k as string] = now;
    }
    const invNow = fromInvItems(invItems);
    const invWas = parseMaybeJson(orig.inventory);
    if (!deepEq(invNow, invWas)) patch.inventory = invNow;

    if (Object.keys(patch).length === 0) return;
    await onPatch(patch);
  };

  return (
    <div className="space-y-4">
      {/* Identidade */}
      <Section title="Identidade">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome">
            <input value={state.name} onChange={(e)=>setState(s=>({ ...s, name: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/>
          </Field>
          <Field label="Telefone">
            <input value={state.phone_number} onChange={(e)=>setState(s=>({ ...s, phone_number: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none"/>
          </Field>
        </div>
      </Section>

      <Section title="Dados do cidadão (charinfo)">
        <CharInfoEditor value={state.charinfo} onChange={(v)=>setState(s=>({ ...s, charinfo: v }))}/>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Job">
          <JobGangEditor value={state.job} onChange={(v)=>setState(s=>({ ...s, job: v }))} label="Job" />
        </Section>
        <Section title="Gang">
          <JobGangEditor value={state.gang} onChange={(v)=>setState(s=>({ ...s, gang: v }))} label="Gang" />
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Dinheiro">
          <KeyValueNumberEditor value={state.money} onChange={(v)=>setState(s=>({ ...s, money: v }))} knownKeys={["cash","bank","crypto"]}/>
        </Section>
        <Section title="Posição">
          <KeyValueNumberEditor value={state.position} onChange={(v)=>setState(s=>({ ...s, position: v }))} knownKeys={["x","y","z","h"]}/>
        </Section>
      </div>

      <Section title="Metadata">
        <KeyValueNumberEditor value={state.metadata} onChange={(v)=>setState(s=>({ ...s, metadata: v }))}/>
      </Section>

      <Section title="Inventário">
        <InventoryEditor items={invItems} setItems={setInvItems}/>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={!hasChanges}
          className="px-3 py-2 rounded bg-white text-black hover:opacity-90 disabled:opacity-60 text-sm"
        >
          Guardar alterações
        </button>
      </div>
    </div>
  );
}
